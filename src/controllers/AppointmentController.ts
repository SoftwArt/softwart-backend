// ─────────────────────────────────────────────────────────────────────────────
//  CitaController.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Appointment } from "../models/Appointment";
import { Sale } from "../models/Sale";
import { AppointmentStatus } from "../models/AppointmentStatus";
import { Client } from "../models/Client";
import { saleHasValidatedPayments, voidSaleCascade } from "../helpers/saleCascade.helper";
import { transicionUnicaPermitida, guardEstadoTerminal } from "../helpers/statusTransition.helper";
import { existeCitaEnHorario, MSG_HORARIO_OCUPADO } from "../helpers/appointmentSlot.helper";
import { logServiceStatusChange } from "../helpers/serviceStatusHistory.helper";
import { sendCitaConfirmadaEmail, sendCitaCanceladaEmail } from "../services/email.service";

const SALE_RELATIONS = ["sale", "sale.saleDetails", "sale.saleDetails.serviceStatus", "sale.payments", "sale.payments.paymentStatus"];

// Reenvía correo al cliente cuando el nuevo estado es Confirmada/Cancelada.
// Fire-and-forget: no debe bloquear ni fallar la respuesta HTTP.
function notifyAppointmentStatusChange(item: Appointment, nuevoEstadoNombre: string): void {
  if (!item.client?.correo) return;
  const data = {
    correo:        item.client.correo,
    nombreCliente: item.client.nombre,
    fecha:         new Date(item.fecha).toISOString().slice(0, 10),
    hora:          item.hora,
    id_cita:       item.id_cita,
  };
  const nombre = nuevoEstadoNombre.toLowerCase();
  if (nombre.includes("confirmada")) {
    sendCitaConfirmadaEmail(data).catch(err => console.error("⚠️  Error enviando correo de cita confirmada:", err));
  } else if (nombre.includes("cancelada")) {
    sendCitaCanceladaEmail(data).catch(err => console.error("⚠️  Error enviando correo de cita cancelada:", err));
  }
}

// Marca como "No Asistió" (id 3) las citas Pendientes cuyo horario + 3h ya pasó.
// Se ejecuta antes de devolver el listado para mantener estados coherentes sin cron.
async function markNoShowIfOverdue(): Promise<void> {
  await AppDataSource.query(`
    UPDATE cita
    SET id_estado_cita = 3
    WHERE id_estado_cita = 1
      AND (fecha + hora + INTERVAL '3 hours') < NOW()
  `);
}

export const getAllAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    await markNoShowIfOverdue();

    const citaRepo = AppDataSource.getRepository(Appointment);
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Number(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    // "sale" (sin sub-relaciones) para que el frontend pueda mostrar, sin
    // pedir nada extra, qué citas ya completaron el flujo de venta —
    // id_estado_cita=Completada no es un proxy confiable (se puede marcar
    // manualmente sin pasar por create-sale), así que se expone la Venta real.
    const [items, total] = await citaRepo.findAndCount({
      relations: ["appointmentStatus", "client", "sale"],
      skip,
      take: limit,
    });

    res.json({
      success: true,
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Cita", error });
  }
};

export const getAppointmentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const citaRepo = AppDataSource.getRepository(Appointment);
    const item = await citaRepo.findOne({
      where: { id_cita: Number(req.params.id) },
      relations: ["appointmentStatus", "client", ...SALE_RELATIONS],
    });
    if (!item) { res.status(404).json({ success: false, message: "Cita no encontrada" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Cita", error });
  }
};

export const createAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const citaRepo = AppDataSource.getRepository(Appointment);
    const required = ["fecha", "hora"];
    const missing = required.filter(k => req.body[k] === undefined);
    if (missing.length) { res.status(400).json({ success: false, message: `Campos requeridos: ${missing.join(", ")}` }); return; }
    if (await existeCitaEnHorario(citaRepo, req.body.fecha, req.body.hora)) {
      res.status(409).json({ success: false, message: MSG_HORARIO_OCUPADO }); return;
    }
    const obj = citaRepo.create();
    obj.fecha = req.body.fecha;
    obj.hora  = req.body.hora;
    if (req.body.id_estado_cita !== undefined) {
      const estadoCitaRepo = AppDataSource.getRepository(AppointmentStatus);
      const rel = await estadoCitaRepo.findOneBy({ id_estado_cita: Number(req.body.id_estado_cita) });
      if (!rel) { res.status(404).json({ success: false, message: "EstadoCita no encontrado" }); return; }
      obj.appointmentStatus = rel;
    }
    if (req.body.id_cliente !== undefined) {
      const clienteRepo = AppDataSource.getRepository(Client);
      const rel = await clienteRepo.findOneBy({ id_cliente: Number(req.body.id_cliente) });
      if (!rel) { res.status(404).json({ success: false, message: "Cliente no encontrado" }); return; }
      obj.client = rel;
    }
    await citaRepo.save(obj);
    res.status(201).json({ success: true, message: "Cita creada exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear Cita", error });
  }
};

export const updateAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const citaRepo = AppDataSource.getRepository(Appointment);
    const item = await citaRepo.findOne({
      where: { id_cita: Number(req.params.id) },
      relations: ["appointmentStatus", "client", ...SALE_RELATIONS],
    });
    if (!item) { res.status(404).json({ success: false, message: "Cita no encontrada" }); return; }
    // Estado terminal: una cita cancelada no puede modificarse.
    const bloqueoTerminal = guardEstadoTerminal({
      estadoActualNombre: item.appointmentStatus?.nombre ?? "",
      claveTerminal: "cancelada", etiquetaEntidad: "cita", genero: "f", etiquetaEstado: "Cancelada",
    });
    if (bloqueoTerminal) { res.status(409).json({ success: false, message: bloqueoTerminal }); return; }
    // Una cita Completada ya ocurrió (y pudo generar una Venta) — permitir
    // reagendar su fecha/hora después del hecho corrompería el registro
    // histórico. El único cambio permitido a partir de acá es de estado
    // (ej. cancelarla), manejado más abajo, no edición de fecha/hora.
    if (item.appointmentStatus?.nombre?.toLowerCase().includes("completada") && (req.body.fecha !== undefined || req.body.hora !== undefined)) {
      res.status(409).json({ success: false, message: "No se puede modificar la fecha/hora de una cita Completada" }); return;
    }

    if (req.body.fecha !== undefined || req.body.hora !== undefined) {
      const fechaEfectiva = req.body.fecha ?? item.fecha;
      const horaEfectiva  = req.body.hora  ?? item.hora;
      if (await existeCitaEnHorario(citaRepo, fechaEfectiva, horaEfectiva, item.id_cita)) {
        res.status(409).json({ success: false, message: MSG_HORARIO_OCUPADO }); return;
      }
    }

    let nuevoEstado: AppointmentStatus | null = null;
    if (req.body.id_estado_cita !== undefined) {
      nuevoEstado = await AppDataSource.getRepository(AppointmentStatus).findOneBy({ id_estado_cita: Number(req.body.id_estado_cita) });
      if (!nuevoEstado) { res.status(404).json({ success: false, message: "EstadoCita no encontrado" }); return; }
      if (nuevoEstado.id_estado_cita !== item.appointmentStatus?.id_estado_cita) {
        const bloqueo = transicionUnicaPermitida({
          estadoActualNombre: item.appointmentStatus?.nombre ?? "",
          estadoNuevoNombre:  nuevoEstado.nombre,
          claveEstadoActual:    "completada",
          claveEstadoPermitido: "cancelada",
          etiquetaEstadoPermitido: "Cancelada",
        });
        if (bloqueo) { res.status(409).json({ success: false, message: bloqueo }); return; }
      }
    }

    // Cancelar una cita que ya tiene Venta cascadea la misma anulación que
    // toggleSaleStatus (ver AppointmentStatusController.changeAppointmentStatus).
    if (nuevoEstado?.nombre.toLowerCase().includes("cancelada") && item.sale) {
      if (saleHasValidatedPayments(item.sale)) {
        res.status(409).json({
          success: false,
          message: "No se puede cancelar: la venta asociada tiene pagos validados. Registra la devolución antes de cancelar la cita.",
        });
        return;
      }

      if (req.body.fecha !== undefined) item.fecha = req.body.fecha;
      if (req.body.hora  !== undefined) item.hora  = req.body.hora;
      item.appointmentStatus = nuevoEstado;
      if (req.body.id_cliente !== undefined) {
        const rel = await AppDataSource.getRepository(Client).findOneBy({ id_cliente: Number(req.body.id_cliente) });
        if (!rel) { res.status(404).json({ success: false, message: "Cliente no encontrado" }); return; }
        item.client = rel;
      }

      let cascada = { serviciosCancelados: 0, abonosAnulados: 0 };
      await AppDataSource.transaction(async (manager) => {
        await manager.save(item);
        cascada = await voidSaleCascade(manager, item.sale!);
      });

      notifyAppointmentStatusChange(item, nuevoEstado.nombre);
      res.json({
        success: true,
        message: `Cita cancelada — venta anulada en cascada (servicios cancelados: ${cascada.serviciosCancelados}, abonos anulados: ${cascada.abonosAnulados})`,
        data: { ...item, ...cascada },
      });
      return;
    }

    if (req.body.fecha !== undefined) item.fecha = req.body.fecha;
    if (req.body.hora  !== undefined) item.hora  = req.body.hora;
    if (nuevoEstado) item.appointmentStatus = nuevoEstado;
    if (req.body.id_cliente !== undefined) {
      const clienteRepo = AppDataSource.getRepository(Client);
      const rel = await clienteRepo.findOneBy({ id_cliente: Number(req.body.id_cliente) });
      if (!rel) { res.status(404).json({ success: false, message: "Cliente no encontrado" }); return; }
      item.client = rel;
    }
    await citaRepo.save(item);
    if (nuevoEstado) notifyAppointmentStatusChange(item, nuevoEstado.nombre);
    res.json({ success: true, message: "Cita actualizada", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar Cita", error });
  }
};

// Si la cita tiene Venta asociada, cascadea igual que deleteSale (SaleController.ts):
// bloquea si esa venta tiene algún abono Validado (dinero real recibido —
// ahí solo cabe anular), y si no, borra en la misma transacción los
// SaleDetail/Payment de la venta, la venta, y finalmente la cita. No tendría
// sentido dejar una Venta huérfana (sin su Cita) ni una Cita "fantasma" con
// una Venta que ya no debería existir.
export const deleteAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const citaRepo = AppDataSource.getRepository(Appointment);
    const item = await citaRepo.findOne({
      where: { id_cita: Number(req.params.id) },
      relations: ["sale", "sale.saleDetails", "sale.payments", "sale.payments.paymentStatus"],
    });
    if (!item) { res.status(404).json({ success: false, message: "Cita no encontrada" }); return; }

    if (item.sale) {
      if (saleHasValidatedPayments(item.sale)) {
        res.status(409).json({
          success: false,
          message: "No se puede eliminar: la venta asociada tiene abonos validados. Solo se puede anular.",
        });
        return;
      }
      await AppDataSource.transaction(async (manager) => {
        if (item.sale!.payments.length)    await manager.remove(item.sale!.payments);
        if (item.sale!.saleDetails.length) await manager.remove(item.sale!.saleDetails);
        await manager.remove(item.sale!);
        await manager.remove(item);
      });
    } else {
      await citaRepo.remove(item);
    }

    res.json({ success: true, message: "Cita eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar Cita", error });
  }
};

// ── POST /api/citas/:id/crear-venta ───────────────────────────────────────────
// Crea una Venta + sus DetalleVenta (pedidos) a partir de una cita
// Body: { servicios: [{ id_servicio, id_marco?, precio, observacion? }], observacion? }
// La operación es atómica — si falla algo, no queda nada a medias
import { SaleDetail }    from "../models/SaleDetail";
import { Service }       from "../models/Service";
import { Frame }         from "../models/Frame";
import { ServiceStatus } from "../models/ServiceStatus";

export const createSaleFromAppointment = async (req: Request, res: Response): Promise<void> => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const id_cita = Number(req.params.id);
    const { servicios, observacion } = req.body as {
      servicios: { id_servicio: number; id_marco?: number | null; precio: number; observacion?: string }[]
      observacion?: string
    };

    if (!servicios?.length) {
      res.status(400).json({ success: false, message: "Agrega al menos un servicio" });
      return;
    }

    // Cargar cita con cliente
    const cita = await queryRunner.manager.findOne(Appointment, {
      where: { id_cita },
      relations: ["client", "appointmentStatus"],
    });
    if (!cita) { res.status(404).json({ success: false, message: "Cita no encontrada" }); return; }
    if (!cita.client) { res.status(400).json({ success: false, message: "La cita no tiene cliente asociado" }); return; }
    if (cita.appointmentStatus?.id_estado_cita !== 2) {
      res.status(409).json({ success: false, message: "Solo se puede crear una venta desde una cita con estado Completada" });
      return;
    }

    // Verificar que no tenga ya una venta
    const ventaExistente = await queryRunner.manager.findOne(Sale, {
      where: { appointment: { id_cita } },
    });
    if (ventaExistente) {
      res.status(409).json({ success: false, message: "Esta cita ya tiene una venta registrada", data: { id_venta: ventaExistente.id_venta } });
      return;
    }

    // Primer estado de servicio (Sin empezar)
    const estadoInicial = await queryRunner.manager
      .createQueryBuilder(ServiceStatus, "es")
      .where("LOWER(es.nombre) LIKE :n", { n: "%sin empezar%" })
      .getOne();

    // Calcular total
    const total = servicios.reduce((sum, s) => sum + Number(s.precio), 0);

    // Crear Venta
    const venta        = queryRunner.manager.create(Sale);
    venta.fecha        = new Date();
    venta.total        = total;
    venta.observacion  = observacion ?? undefined;
    venta.estado       = true;
    venta.client      = cita.client;
    venta.appointment  = cita;
    await queryRunner.manager.save(venta);

    // Crear DetalleVenta por cada servicio
    for (const s of servicios) {
      const servicio = await queryRunner.manager.findOneBy(Service, { id_servicio: s.id_servicio });
      if (!servicio) {
        await queryRunner.rollbackTransaction();
        res.status(404).json({ success: false, message: `Servicio #${s.id_servicio} no encontrado` });
        return;
      }

      const detalle         = queryRunner.manager.create(SaleDetail);
      detalle.sale         = venta;
      detalle.service      = servicio;
      detalle.precio        = s.precio;
      detalle.fecha         = venta.fecha;
      detalle.estado        = false;          // pendiente de iniciar
      if (estadoInicial) detalle.serviceStatus = estadoInicial;
      if (s.observacion) (detalle as any).observacion = s.observacion;

      if (s.id_marco) {
        const marco = await queryRunner.manager.findOneBy(Frame, { id_marco: s.id_marco });
        if (marco) detalle.frame = marco;
      }

      await queryRunner.manager.save(detalle);
      if (detalle.serviceStatus) await logServiceStatusChange(queryRunner.manager, detalle, detalle.serviceStatus);
    }

    // Marcar cita como Completada (id 2)
    const estadoCompletada = await queryRunner.manager.findOneBy(AppointmentStatus, { id_estado_cita: 2 });
    if (estadoCompletada) { cita.appointmentStatus = estadoCompletada; await queryRunner.manager.save(cita); }

    await queryRunner.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Venta creada exitosamente",
      data: { id_venta: venta.id_venta, total },
    });
  } catch (error) {
    await queryRunner.rollbackTransaction();
    res.status(500).json({ success: false, message: "Error al crear la venta", error });
  } finally {
    await queryRunner.release();
  }
};