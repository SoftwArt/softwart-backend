// src/controllers/CuentaClienteController.ts
import { Request, Response } from "express";
import { AppDataSource }     from "../data-source";
import { Client }           from "../models/Client";
import { User }           from "../models/User";
import { Appointment }              from "../models/Appointment";
import { AppointmentStatus }        from "../models/AppointmentStatus";
import { Sale }             from "../models/Sale";
import { SaleDetail }       from "../models/SaleDetail";
import bcrypt                from "bcrypt";
import {
  sendCitaConfirmacionEmail,
  CitaConfirmacionData,
} from "../services/email.service";

// ── GET /api/cuenta/perfil ────────────────────────────────────────────────────
export const viewProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const cliente = await AppDataSource.getRepository(Client)
      .findOneBy({ id_cliente: req.user!.id_cliente! });
    if (!cliente) { res.status(404).json({ success: false, message: "Perfil no encontrado" }); return; }
    res.json({ success: true, data: cliente });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener perfil", error });
  }
};

// ── PUT /api/cuenta/perfil ────────────────────────────────────────────────────
// Caso 1 — datos personales: { nombre?, telefono?, correo? }
// Caso 2 — cambio de clave:  { clave_actual, clave }
export const editProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteRepo = AppDataSource.getRepository(Client);
    const usuarioRepo = AppDataSource.getRepository(User);
    const cliente = await clienteRepo.findOneBy({ id_cliente: req.user!.id_cliente! });
    const usuario = await usuarioRepo.findOne({ where: { correo: req.user!.correo } });
    if (!cliente || !usuario) { res.status(404).json({ success: false, message: "Cuenta no encontrada" }); return; }

    const { nombre, telefono, correo, clave_actual, clave } = req.body;

    // ── Rama cambio de contraseña ─────────────────────────────────────────────
    if (clave_actual !== undefined) {
      if (!clave_actual || !clave) {
        res.status(400).json({ success: false, message: "clave_actual y clave son requeridos" }); return;
      }
      const claveValida = await bcrypt.compare(clave_actual, usuario.clave);
      if (!claveValida) { res.status(401).json({ success: false, message: "La contraseña actual es incorrecta" }); return; }
      if (clave.length < 6) { res.status(400).json({ success: false, message: "La nueva contraseña debe tener al menos 6 caracteres" }); return; }
      usuario.clave = await bcrypt.hash(clave, 10);
      await usuarioRepo.save(usuario);
      res.json({ success: true, message: "Contraseña actualizada correctamente" });
      return;
    }

    // ── Rama datos personales ─────────────────────────────────────────────────
    if (nombre   !== undefined) cliente.nombre   = nombre;
    if (telefono !== undefined) cliente.telefono = telefono ?? null;
    if (correo && correo !== cliente.correo) {
      const [enCliente, enUsuario] = await Promise.all([
        clienteRepo.findOne({ where: { correo } }),
        usuarioRepo.findOne({ where: { correo } }),
      ]);
      if (enCliente || enUsuario) { res.status(409).json({ success: false, message: "Ese correo ya está en uso" }); return; }
      cliente.correo = correo;
      usuario.correo = correo;
      await usuarioRepo.save(usuario);
    }
    await clienteRepo.save(cliente);
    res.json({ success: true, message: "Perfil actualizado", data: cliente });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar perfil", error });
  }
};

// ── GET /api/cuenta/citas ─────────────────────────────────────────────────────
export const myAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const citas = await AppDataSource.getRepository(Appointment).find({
      where:     { client: { id_cliente: req.user!.id_cliente! } },
      relations: ["appointmentStatus"],
      order:     { fecha: "DESC" },
    });
    res.json({ success: true, data: citas });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener citas", error });
  }
};

// ── POST /api/cuenta/citas ────────────────────────────────────────────────────
// El cliente agenda su propia cita — id_cliente se toma del JWT, no del body
export const createMyAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fecha, hora, observacion, id_estado_cita = 1 } = req.body;

    if (!fecha || !hora) {
      res.status(400).json({ success: false, message: "fecha y hora son requeridos" }); return;
    }

    // Validar que no sea fecha pasada
    const hoy = new Date().toISOString().slice(0, 10);
    if (fecha < hoy) {
      res.status(400).json({ success: false, message: "No puedes agendar en fechas pasadas" }); return;
    }

    // Validar rango de hora 13:00 – 18:00
    const [h] = hora.split(":").map(Number);
    if (h < 13 || h >= 18) {
      res.status(400).json({ success: false, message: "La hora debe estar entre 13:00 y 18:00" }); return;
    }

    const clienteRepo   = AppDataSource.getRepository(Client);
    const estadoCitaRepo = AppDataSource.getRepository(AppointmentStatus);
    const citaRepo      = AppDataSource.getRepository(Appointment);

    const cliente    = await clienteRepo.findOneBy({ id_cliente: req.user!.id_cliente! });
    const estadoCita = await estadoCitaRepo.findOneBy({ id_estado_cita: Number(id_estado_cita) });

    if (!cliente)    { res.status(404).json({ success: false, message: "Cliente no encontrado" }); return; }
    if (!estadoCita) { res.status(404).json({ success: false, message: "Estado de cita no encontrado" }); return; }

    const cita        = citaRepo.create();
    cita.fecha        = fecha;
    cita.hora         = hora;
    cita.client      = cliente;
    cita.appointmentStatus   = estadoCita;
    if (observacion)  (cita as any).observacion = observacion;

    await citaRepo.save(cita);

    // Enviar correo de confirmación — fire & forget (no bloquea la respuesta)
    const emailData: CitaConfirmacionData = {
      correo:        cliente.correo,
      nombreCliente: cliente.nombre,
      fecha:         fecha as string,
      hora:          hora as string,
      id_cita:       cita.id_cita,
    };
    sendCitaConfirmacionEmail(emailData).catch(err =>
      console.error("⚠️  Error enviando confirmación de cita:", err)
    );

    res.status(201).json({ success: true, message: "Cita agendada exitosamente", data: cita });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al agendar cita", error });
  }
};

// ── DELETE /api/cuenta ────────────────────────────────────────────────────────
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const clienteRepo = AppDataSource.getRepository(Client);
    const usuarioRepo = AppDataSource.getRepository(User);
    const id_cliente  = req.user!.id_cliente!;
    const correo      = req.user!.correo;

    const [cliente, usuario] = await Promise.all([
      clienteRepo.findOneBy({ id_cliente }),
      usuarioRepo.findOne({ where: { correo } }),
    ]);
    if (!cliente || !usuario) { res.status(404).json({ success: false, message: "Cuenta no encontrada" }); return; }

    const [totalCitas, totalVentas] = await Promise.all([
      AppDataSource.getRepository(Appointment).count({ where: { client: { id_cliente } } }),
      AppDataSource.getRepository(Sale).count({ where: { client: { id_cliente } } }),
    ]);

    if (totalCitas > 0 || totalVentas > 0) {
      cliente.estado = false; usuario.estado = false;
      await Promise.all([clienteRepo.save(cliente), usuarioRepo.save(usuario)]);
      res.json({ success: true, tipo: "desactivada", message: "Cuenta desactivada. Tu historial queda conservado." });
    } else {
      await usuarioRepo.remove(usuario);
      await clienteRepo.remove(cliente);
      res.json({ success: true, tipo: "eliminada", message: "Cuenta eliminada permanentemente." });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar cuenta", error });
  }
};

// ── PATCH /api/cuenta/citas/:id/cancelar ─────────────────────────────────────
// Solo puede cancelar sus propias citas y solo si están Pendientes
export const cancelMyAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const id_cita    = Number(req.params.id)
    const id_cliente = req.user!.id_cliente!

    const citaRepo       = AppDataSource.getRepository(Appointment)
    const estadoCitaRepo = AppDataSource.getRepository(AppointmentStatus)

    const cita = await citaRepo.findOne({
      where:     { id_cita },
      relations: ['client', 'appointmentStatus'],
    })

    if (!cita) {
      res.status(404).json({ success: false, message: 'Cita no encontrada' }); return
    }

    // Verificar que la cita pertenece al cliente autenticado
    if (cita.client?.id_cliente !== id_cliente) {
      res.status(403).json({ success: false, message: 'No tienes permiso para cancelar esta cita' }); return
    }

    // Solo se pueden cancelar citas Pendientes (id 1)
    if (cita.appointmentStatus?.id_estado_cita !== 1) {
      res.status(400).json({
        success: false,
        message: `No se puede cancelar una cita en estado "${cita.appointmentStatus?.nombre ?? 'desconocido'}"`,
      }); return
    }

    const estadoCancelada = await estadoCitaRepo.findOneBy({ id_estado_cita: 4 })
    if (!estadoCancelada) {
      res.status(500).json({ success: false, message: 'Estado "Cancelada" no encontrado' }); return
    }

    cita.appointmentStatus = estadoCancelada
    await citaRepo.save(cita)

    res.json({ success: true, message: 'Cita cancelada correctamente' })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cancelar la cita', error })
  }
}

// ── GET /api/cuenta/servicios ─────────────────────────────────────────────────
// Devuelve todos los SaleDetail del cliente autenticado con nombre de servicio y estado
export const myServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const detalles = await AppDataSource.getRepository(SaleDetail).find({
      where:     { sale: { client: { id_cliente: req.user!.id_cliente! } } },
      relations: ["service", "serviceStatus", "sale"],
      order:     { fecha: "DESC" },
    });
    const data = detalles.map(d => ({
      id_detalle:   d.id_detalle,
      fecha:        d.fecha,
      servicio:     d.service?.nombre ?? "—",
      estado:       d.serviceStatus?.nombre ?? "—",
      precio:       d.precio,
      observacion:  d.observacion ?? null,
    }));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener servicios", error });
  }
};

// ── GET /api/cuenta/disponibilidad?fecha=YYYY-MM-DD ───────────────────────────
// Devuelve los slots ocupados de una fecha para que el cliente vea la disponibilidad
// SIN exponer datos privados de otros clientes (solo hora + id_cita)
export const appointmentAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fecha } = req.query
    if (!fecha || typeof fecha !== 'string') {
      res.status(400).json({ success: false, message: "El parámetro 'fecha' es requerido" }); return;
    }

    const citas = await AppDataSource.getRepository(Appointment)
      .createQueryBuilder('c')
      .select(['c.id_cita', 'c.hora'])
      .where('CAST(c.fecha AS DATE) = :fecha', { fecha })
      .getMany()

    res.json({
      success: true,
      data: citas.map(c => ({ id_cita: c.id_cita, hora: c.hora })),
    })
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al consultar disponibilidad", error });
  }
};