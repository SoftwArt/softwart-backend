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
import { transicionUnicaPermitida, guardEstadoTerminal, assertNoAsistioSoloSiYaOcurrio } from "../helpers/statusTransition.helper";
import { existeCitaEnHorario, MSG_HORARIO_OCUPADO } from "../helpers/appointmentSlot.helper";
import { logServiceStatusChange } from "../helpers/serviceStatusHistory.helper";
import { notifyAppointmentStatusChange } from "../helpers/appointmentNotification.helper";
import { fechaSearchExpr, stripAccentsEs, pareceFecha } from "../helpers/searchExpr.helper";

const SALE_RELATIONS = ["sale", "sale.saleDetails", "sale.saleDetails.serviceStatus", "sale.payments", "sale.payments.paymentStatus"];

// Marca como "No Asistió" (id 3) las citas cuyo horario + 3h ya pasó sin
// haber llegado a "Completada" — tanto las que se quedaron en "Pendiente"
// (id 1, nunca se confirmaron) como las "Confirmada" (id 5, se confirmaron
// pero el cliente no llegó y nadie las pasó a Completada). Antes solo
// cubría Pendiente, así que una cita Confirmada podía quedarse así para
// siempre si no se atendía manualmente.
// Se ejecuta antes de devolver el listado (acá y en ClientAccountController.
// myAppointments) para mantener estados coherentes sin cron.
export async function markNoShowIfOverdue(): Promise<void> {
  // fecha/hora son naive-Bogotá — NOW() debe convertirse a la misma zona
  // antes de comparar, o el umbral queda desfasado ~5h (ver bogotaTime.helper.ts).
  await AppDataSource.query(`
    UPDATE cita
    SET id_estado_cita = 3
    WHERE id_estado_cita IN (1, 5)
      AND (fecha + hora + INTERVAL '3 hours') < (NOW() AT TIME ZONE 'America/Bogota')
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
    //
    // Orden: mismo criterio de prioridad que "Tus citas" del portal cliente
    // (ver estadoCitaPriority en frontend/features/account/utils.ts) —
    // Pendiente > Confirmada > Completada > Cancelada > No Asistió, y dentro
    // de cada estado, de la fecha más nueva a la más vieja. IDs fijos del
    // seed (seedAppointmentStatus.ts): 1=Pendiente, 5=Confirmada,
    // 2=Completada, 4=Cancelada, 3=No Asistió — el paginado es server-side,
    // así que esto tiene que ir en la query (un sort en el frontend solo
    // ordenaría la página actual, no el listado completo).
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    const idEstadoFiltro = req.query.estado ? Number(req.query.estado) : undefined;
    // ?fecha= — usado por useAppointmentForm (frontend) para calcular los
    // horarios ya ocupados de un día puntual sin depender de tener cargada
    // la lista completa (paginada) de citas.
    const fechaFiltro = typeof req.query.fecha === "string" ? req.query.fecha : undefined;

    const qb = citaRepo
      .createQueryBuilder("cita")
      .leftJoinAndSelect("cita.appointmentStatus", "appointmentStatus")
      .leftJoinAndSelect("cita.client", "client")
      .leftJoinAndSelect("cita.sale", "sale")
      // Expresión computada seleccionada + orderBy por su alias — pasar el
      // CASE directo a .orderBy() como fragmento crudo rompía el query
      // (TypeORM lo trataba como nombre de columna, no como expresión).
      .addSelect(
        `CASE cita.id_estado_cita WHEN 1 THEN 0 WHEN 5 THEN 1 WHEN 2 THEN 2 WHEN 4 THEN 3 WHEN 3 THEN 4 ELSE 99 END`,
        "estado_prioridad",
      );
    if (q) {
      // fecha en lenguaje natural en vez de solo el ISO crudo — ver
      // searchExpr.helper.ts (mismo criterio que Pedidos/Servicios/Pagos).
      // pareceFecha(): se salta el EXTRACT/CASE/concat por fila cuando la
      // query obviamente no puede ser una fecha (ej. un nombre).
      const fechaOr = pareceFecha(q) ? ` OR ${fechaSearchExpr("cita.fecha")}` : "";
      qb.andWhere(
        `(CAST(cita.id_cita AS TEXT) ILIKE :q${fechaOr} OR CAST(cita.hora AS TEXT) ILIKE :q OR client.nombre ILIKE :q OR client.documento ILIKE :q)`,
        { q: `%${q}%`, qFecha: `%${stripAccentsEs(q).toLowerCase()}%` },
      );
    }
    if (idEstadoFiltro !== undefined) qb.andWhere("cita.id_estado_cita = :idEstado", { idEstado: idEstadoFiltro });
    if (fechaFiltro !== undefined) qb.andWhere("cita.fecha = :fecha", { fecha: fechaFiltro });

    const [items, total] = await qb
      .orderBy("estado_prioridad", "ASC")
      .addOrderBy("cita.fecha", "DESC")
      .addOrderBy("cita.id_cita", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

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
    // appointmentStatus es NOT NULL en el modelo — si se deja sin resolver, la cita
    // queda con id_estado_cita NULL y existeCitaEnHorario (INNER JOIN) la ignora
    // por completo, permitiendo doble-reservar ese horario. Las citas creadas
    // desde el panel admin nacen "Confirmada" por defecto.
    const estadoCitaRepo = AppDataSource.getRepository(AppointmentStatus);
    const rel = req.body.id_estado_cita !== undefined
      ? await estadoCitaRepo.findOneBy({ id_estado_cita: Number(req.body.id_estado_cita) })
      : await estadoCitaRepo.findOneBy({ id_estado_cita: 5 });
    if (!rel) { res.status(404).json({ success: false, message: "EstadoCita no encontrado" }); return; }
    obj.appointmentStatus = rel;
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
      const bloqueoNoAsistio = assertNoAsistioSoloSiYaOcurrio({
        estadoNuevoNombre: nuevoEstado.nombre,
        fecha: req.body.fecha ?? item.fecha,
        hora:  req.body.hora  ?? item.hora,
      });
      if (bloqueoNoAsistio) { res.status(409).json({ success: false, message: bloqueoNoAsistio }); return; }
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
import { Payment }       from "../models/Payment";
import { PaymentMethod } from "../models/PaymentMethod";
import { PaymentStatus } from "../models/PaymentStatus";
import { calculateInstallments } from "../helpers/installments.helper";

export const createSaleFromAppointment = async (req: Request, res: Response): Promise<void> => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const id_cita = Number(req.params.id);
    const { servicios, observacion, plan_abonos } = req.body as {
      servicios: { id_servicio: number; id_marco?: number | null; precio: number; fecha_estimada?: string | null; observacion?: string }[]
      observacion?: string
      // Opcional — configura el plan de abonos y registra el primer abono
      // en la misma transacción (el schema ya garantiza que no llegan
      // porcentaje_primer_abono y monto_primer_abono a la vez).
      plan_abonos?: {
        num_abonos?: number
        porcentaje_primer_abono?: number
        monto_primer_abono?: number
        id_metodo_pago: number
      }
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

    // Plan de abonos — mismos defaults/validaciones que configureInstallments
    // (SaleInstallmentsController), aplicados acá antes del primer save para
    // no necesitar un update() aparte. Al ser una venta nueva no hay pagos
    // previos que proteger, así que no hace falta el guard de "ya hay pagos".
    if (plan_abonos?.num_abonos !== undefined) venta.num_abonos = plan_abonos.num_abonos
    if (plan_abonos?.porcentaje_primer_abono !== undefined) venta.porcentaje_primer_abono = plan_abonos.porcentaje_primer_abono
    if (plan_abonos?.monto_primer_abono !== undefined) {
      const monto = Number(plan_abonos.monto_primer_abono)
      if (monto <= 0 || monto >= total) {
        await queryRunner.rollbackTransaction();
        res.status(400).json({
          success: false,
          message: `El monto del primer abono debe ser mayor a $0 y menor al total de la venta (${total})`,
        }); return;
      }
      const p = Math.round((monto / total) * 100)
      if (p < 1 || p > 99) {
        await queryRunner.rollbackTransaction();
        res.status(400).json({
          success: false,
          message: `Ese monto equivale a ${p}% del total, fuera del rango permitido (1%-99%). Ajusta el valor.`,
        }); return;
      }
      venta.porcentaje_primer_abono = p
    }

    await queryRunner.manager.save(venta);

    // Crear DetalleVenta por cada servicio
    for (const s of servicios) {
      const servicio = await queryRunner.manager.findOneBy(Service, { id_servicio: s.id_servicio });
      if (!servicio) {
        await queryRunner.rollbackTransaction();
        res.status(404).json({ success: false, message: `Servicio #${s.id_servicio} no encontrado` });
        return;
      }

      const detalle          = queryRunner.manager.create(SaleDetail);
      detalle.sale           = venta;
      detalle.service        = servicio;
      detalle.precio         = s.precio;
      detalle.fecha          = venta.fecha;
      detalle.fecha_estimada = s.fecha_estimada ? new Date(s.fecha_estimada) : null;
      detalle.estado         = false;          // pendiente de iniciar
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

    // Primer abono — el monto NUNCA lo teclea el usuario, se deriva de
    // calculateInstallments(total, num_abonos, porcentaje_primer_abono),
    // la misma fuente de verdad que registerInstallment. Si num_abonos es 1
    // esto ya paga la venta completa en el mismo paso.
    let abonoCreado: { id_pago: number; monto: number; numero: number } | null = null;
    if (plan_abonos) {
      const metodo = await queryRunner.manager.findOneBy(PaymentMethod, { id_metodo_pago: plan_abonos.id_metodo_pago });
      if (!metodo) {
        await queryRunner.rollbackTransaction();
        res.status(404).json({ success: false, message: "Método de pago no encontrado" }); return;
      }

      const estadoValidado = await queryRunner.manager
        .createQueryBuilder(PaymentStatus, "ep")
        .where("LOWER(ep.nombre) LIKE :n", { n: "%validado%" })
        .getOne();

      const primerAbono = calculateInstallments(total, venta.num_abonos, venta.porcentaje_primer_abono)[0];

      const pago        = queryRunner.manager.create(Payment);
      pago.sale         = venta;
      pago.monto        = primerAbono.amount;
      pago.fecha        = venta.fecha;
      pago.paymentMethod = metodo;
      if (estadoValidado) pago.paymentStatus = estadoValidado;
      await queryRunner.manager.save(pago);

      abonoCreado = { id_pago: pago.id_pago, monto: primerAbono.amount, numero: primerAbono.number };
    }

    await queryRunner.commitTransaction();

    res.status(201).json({
      success: true,
      message: abonoCreado
        ? `Venta creada exitosamente. Primer abono de $${abonoCreado.monto.toLocaleString("es-CO")} registrado.`
        : "Venta creada exitosamente",
      data: { id_venta: venta.id_venta, total, abono: abonoCreado },
    });
  } catch (error) {
    await queryRunner.rollbackTransaction();
    res.status(500).json({ success: false, message: "Error al crear la venta", error });
  } finally {
    await queryRunner.release();
  }
};