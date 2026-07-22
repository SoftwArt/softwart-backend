// ─────────────────────────────────────────────────────────────────────────────
//  EstadoCitaController.ts  —  Catálogo (sin paginación)
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { AppointmentStatus } from "../models/AppointmentStatus";
import { Appointment } from "../models/Appointment";
import { saleHasValidatedPayments, voidSaleCascade } from "../helpers/saleCascade.helper";
import { enviarNoEliminarAsociados } from "../helpers/deleteGuard.helper";
import { transicionUnicaPermitida, guardEstadoTerminal } from "../helpers/statusTransition.helper";
import { sendCitaConfirmadaEmail, sendCitaCanceladaEmail } from "../services/email.service";

const SALE_RELATIONS = ["sale", "sale.saleDetails", "sale.saleDetails.serviceStatus", "sale.payments", "sale.payments.paymentStatus"];

// Reenvía correo al cliente cuando el nuevo estado es Confirmada/Cancelada.
// Fire-and-forget: no debe bloquear ni fallar la respuesta HTTP.
function notifyAppointmentStatusChange(target: Appointment, nuevoEstadoNombre: string): void {
  if (!target.client?.correo) return;
  const data = {
    correo:        target.client.correo,
    nombreCliente: target.client.nombre,
    fecha:         new Date(target.fecha).toISOString().slice(0, 10),
    hora:          target.hora,
    id_cita:       target.id_cita,
  };
  const nombre = nuevoEstadoNombre.toLowerCase();
  if (nombre.includes("confirmada")) {
    sendCitaConfirmadaEmail(data).catch(err => console.error("⚠️  Error enviando correo de cita confirmada:", err));
  } else if (nombre.includes("cancelada")) {
    sendCitaCanceladaEmail(data).catch(err => console.error("⚠️  Error enviando correo de cita cancelada:", err));
  }
}

export const getAllAppointmentStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await AppDataSource.getRepository(AppointmentStatus).find();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener EstadoCita", error });
  }
};

export const getAppointmentStatusById = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await AppDataSource.getRepository(AppointmentStatus).findOne({ where: { id_estado_cita: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "EstadoCita no encontrado" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener EstadoCita", error });
  }
};

export const createAppointmentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo = AppDataSource.getRepository(AppointmentStatus);
    if (!req.body.nombre) { res.status(400).json({ success: false, message: "nombre es requerido" }); return; }
    const obj = repo.create({ nombre: req.body.nombre });
    await repo.save(obj);
    res.status(201).json({ success: true, message: "EstadoCita creado exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear EstadoCita", error });
  }
};

export const updateAppointmentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo = AppDataSource.getRepository(AppointmentStatus);
    const item = await repo.findOne({ where: { id_estado_cita: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "EstadoCita no encontrado" }); return; }
    if (req.body.nombre !== undefined) item.nombre = req.body.nombre;
    await repo.save(item);
    res.json({ success: true, message: "EstadoCita actualizado", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar EstadoCita", error });
  }
};

export const deleteAppointmentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo     = AppDataSource.getRepository(AppointmentStatus);
    const citaRepo = AppDataSource.getRepository(Appointment);
    const count = await citaRepo.count({ where: { appointmentStatus: { id_estado_cita: Number(req.params.id) } } });
    if (count > 0) {
      enviarNoEliminarAsociados(res, {
        count, singular: "cita", plural: "citas", genero: "f",
        alternativa: "Reasigna esas citas a otro estado antes de eliminarlo.",
      });
      return;
    }
    const item = await repo.findOneBy({ id_estado_cita: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "EstadoCita no encontrado" }); return; }
    await repo.remove(item);
    res.json({ success: true, message: "EstadoCita eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar EstadoCita", error });
  }
};

// PATCH /api/estado-cita/cita/:id_cita/estado
export const changeAppointmentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const citaRepo       = AppDataSource.getRepository(Appointment);
    const estadoCitaRepo = AppDataSource.getRepository(AppointmentStatus);
    const target = await citaRepo.findOne({
      where: { id_cita: Number(req.params.id_cita) },
      relations: ["appointmentStatus", "client", ...SALE_RELATIONS],
    });
    if (!target) { res.status(404).json({ success: false, message: "Cita no encontrado" }); return; }
    // Estado terminal: una cita cancelada no puede modificarse.
    const bloqueoTerminal = guardEstadoTerminal({
      estadoActualNombre: target.appointmentStatus?.nombre ?? "",
      claveTerminal: "cancelada", etiquetaEntidad: "cita", genero: "f", etiquetaEstado: "Cancelada",
    });
    if (bloqueoTerminal) { res.status(409).json({ success: false, message: bloqueoTerminal }); return; }
    const nuevoEstado = await estadoCitaRepo.findOneBy({ id_estado_cita: Number(req.body.id_estado_cita) });
    if (!nuevoEstado) { res.status(404).json({ success: false, message: "EstadoCita no encontrado" }); return; }

    // Una cita Completada ya ocurrió (y pudo generar una Venta) — el único
    // cambio de estado válido a partir de acá es anularla, no "retroceder"
    // a Pendiente/Confirmada/No Asistió.
    if (nuevoEstado.id_estado_cita !== target.appointmentStatus?.id_estado_cita) {
      const bloqueo = transicionUnicaPermitida({
        estadoActualNombre: target.appointmentStatus?.nombre ?? "",
        estadoNuevoNombre:  nuevoEstado.nombre,
        claveEstadoActual:    "completada",
        claveEstadoPermitido: "cancelada",
        etiquetaEstadoPermitido: "Cancelada",
      });
      if (bloqueo) { res.status(409).json({ success: false, message: bloqueo }); return; }
    }

    // Cancelar una cita que ya tiene Venta cascadea la misma anulación que
    // toggleSaleStatus: bloquea si hay pagos validados (dinero recibido →
    // requiere devolución), si no, cancela servicios no finalizados y anula
    // abonos pendientes — todo junto con el cambio de estado, en una transacción.
    if (nuevoEstado.nombre.toLowerCase().includes("cancelada") && target.sale) {
      if (saleHasValidatedPayments(target.sale)) {
        res.status(409).json({
          success: false,
          message: "No se puede cancelar: la venta asociada tiene pagos validados. Registra la devolución antes de cancelar la cita.",
        });
        return;
      }

      let cascada = { serviciosCancelados: 0, abonosAnulados: 0 };
      await AppDataSource.transaction(async (manager) => {
        target.appointmentStatus = nuevoEstado;
        await manager.save(target);
        cascada = await voidSaleCascade(manager, target.sale!);
      });

      notifyAppointmentStatusChange(target, nuevoEstado.nombre);
      res.json({
        success: true,
        message: `Cita cancelada — venta anulada en cascada (servicios cancelados: ${cascada.serviciosCancelados}, abonos anulados: ${cascada.abonosAnulados})`,
        data: { ...target, ...cascada },
      });
      return;
    }

    target.appointmentStatus = nuevoEstado;
    await citaRepo.save(target);
    notifyAppointmentStatusChange(target, nuevoEstado.nombre);
    res.json({ success: true, message: "Estado de Cita actualizado", data: target });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error en changeAppointmentStatus", error });
  }
};
