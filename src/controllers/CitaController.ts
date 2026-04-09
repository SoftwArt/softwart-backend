// ─────────────────────────────────────────────────────────────────────────────
//  CitaController.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Appointment } from "../models/Appointment";
import { Sale } from "../models/Sale";
import { AppointmentStatus } from "../models/AppointmentStatus";
import { Client } from "../models/Client";

export const getAllCita = async (req: Request, res: Response): Promise<void> => {
  try {
    const citaRepo = AppDataSource.getRepository(Appointment);
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Number(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [items, total] = await citaRepo.findAndCount({
      relations: ["appointmentStatus", "client"],
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

export const getCitaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const citaRepo = AppDataSource.getRepository(Appointment);
    const item = await citaRepo.findOne({
      where: { id_cita: Number(req.params.id) },
      relations: ["appointmentStatus", "client"],
    });
    if (!item) { res.status(404).json({ success: false, message: "Cita no encontrado" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Cita", error });
  }
};

export const createCita = async (req: Request, res: Response): Promise<void> => {
  try {
    const citaRepo = AppDataSource.getRepository(Appointment);
    const required = ["fecha", "hora"];
    const missing = required.filter(k => req.body[k] === undefined);
    if (missing.length) { res.status(400).json({ success: false, message: `Campos requeridos: ${missing.join(", ")}` }); return; }
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
    res.status(201).json({ success: true, message: "Cita creado exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear Cita", error });
  }
};

export const updateCita = async (req: Request, res: Response): Promise<void> => {
  try {
    const citaRepo = AppDataSource.getRepository(Appointment);
    const item = await citaRepo.findOne({
      where: { id_cita: Number(req.params.id) },
      relations: ["appointmentStatus", "client"],
    });
    if (!item) { res.status(404).json({ success: false, message: "Cita no encontrado" }); return; }
    if (req.body.fecha !== undefined) item.fecha = req.body.fecha;
    if (req.body.hora  !== undefined) item.hora  = req.body.hora;
    if (req.body.id_estado_cita !== undefined) {
      const estadoCitaRepo = AppDataSource.getRepository(AppointmentStatus);
      const rel = await estadoCitaRepo.findOneBy({ id_estado_cita: Number(req.body.id_estado_cita) });
      if (!rel) { res.status(404).json({ success: false, message: "EstadoCita no encontrado" }); return; }
      item.appointmentStatus = rel;
    }
    if (req.body.id_cliente !== undefined) {
      const clienteRepo = AppDataSource.getRepository(Client);
      const rel = await clienteRepo.findOneBy({ id_cliente: Number(req.body.id_cliente) });
      if (!rel) { res.status(404).json({ success: false, message: "Cliente no encontrado" }); return; }
      item.client = rel;
    }
    await citaRepo.save(item);
    res.json({ success: true, message: "Cita actualizado", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar Cita", error });
  }
};

export const deleteCita = async (req: Request, res: Response): Promise<void> => {
  try {
    const citaRepo  = AppDataSource.getRepository(Appointment);
    const ventaRepo = AppDataSource.getRepository(Sale);
    const countVenta = await ventaRepo.count({ where: { appointment: { id_cita: Number(req.params.id) } } });
    if (countVenta > 0) {
      res.status(409).json({ success: false, message: `No se puede eliminar: existen Venta asociados (${countVenta})` }); return;
    }
    const item = await citaRepo.findOneBy({ id_cita: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "Cita no encontrado" }); return; }
    await citaRepo.remove(item);
    res.json({ success: true, message: "Cita eliminado correctamente" });
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

export const crearVentaDesdeCita = async (req: Request, res: Response): Promise<void> => {
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