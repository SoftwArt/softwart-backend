// ─────────────────────────────────────────────────────────────────────────────
//  CitaController.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Cita } from "../models/Cita";
import { Venta } from "../models/Venta";
import { EstadoCita } from "../models/EstadoCita";
import { Cliente } from "../models/Cliente";

export const getAllCita = async (req: Request, res: Response): Promise<void> => {
  try {
    const citaRepo = AppDataSource.getRepository(Cita);
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Number(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [items, total] = await citaRepo.findAndCount({
      relations: ["estadoCita", "cliente"],
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
    const citaRepo = AppDataSource.getRepository(Cita);
    const item = await citaRepo.findOne({
      where: { id_cita: Number(req.params.id) },
      relations: ["estadoCita", "cliente"],
    });
    if (!item) { res.status(404).json({ success: false, message: "Cita no encontrado" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Cita", error });
  }
};

export const createCita = async (req: Request, res: Response): Promise<void> => {
  try {
    const citaRepo = AppDataSource.getRepository(Cita);
    const required = ["fecha", "hora"];
    const missing = required.filter(k => req.body[k] === undefined);
    if (missing.length) { res.status(400).json({ success: false, message: `Campos requeridos: ${missing.join(", ")}` }); return; }
    const obj = citaRepo.create();
    obj.fecha = req.body.fecha;
    obj.hora  = req.body.hora;
    if (req.body.id_estado_cita !== undefined) {
      const estadoCitaRepo = AppDataSource.getRepository(EstadoCita);
      const rel = await estadoCitaRepo.findOneBy({ id_estado_cita: Number(req.body.id_estado_cita) });
      if (!rel) { res.status(404).json({ success: false, message: "EstadoCita no encontrado" }); return; }
      obj.estadoCita = rel;
    }
    if (req.body.id_cliente !== undefined) {
      const clienteRepo = AppDataSource.getRepository(Cliente);
      const rel = await clienteRepo.findOneBy({ id_cliente: Number(req.body.id_cliente) });
      if (!rel) { res.status(404).json({ success: false, message: "Cliente no encontrado" }); return; }
      obj.cliente = rel;
    }
    await citaRepo.save(obj);
    res.status(201).json({ success: true, message: "Cita creado exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear Cita", error });
  }
};

export const updateCita = async (req: Request, res: Response): Promise<void> => {
  try {
    const citaRepo = AppDataSource.getRepository(Cita);
    const item = await citaRepo.findOne({
      where: { id_cita: Number(req.params.id) },
      relations: ["estadoCita", "cliente"],
    });
    if (!item) { res.status(404).json({ success: false, message: "Cita no encontrado" }); return; }
    if (req.body.fecha !== undefined) item.fecha = req.body.fecha;
    if (req.body.hora  !== undefined) item.hora  = req.body.hora;
    if (req.body.id_estado_cita !== undefined) {
      const estadoCitaRepo = AppDataSource.getRepository(EstadoCita);
      const rel = await estadoCitaRepo.findOneBy({ id_estado_cita: Number(req.body.id_estado_cita) });
      if (!rel) { res.status(404).json({ success: false, message: "EstadoCita no encontrado" }); return; }
      item.estadoCita = rel;
    }
    if (req.body.id_cliente !== undefined) {
      const clienteRepo = AppDataSource.getRepository(Cliente);
      const rel = await clienteRepo.findOneBy({ id_cliente: Number(req.body.id_cliente) });
      if (!rel) { res.status(404).json({ success: false, message: "Cliente no encontrado" }); return; }
      item.cliente = rel;
    }
    await citaRepo.save(item);
    res.json({ success: true, message: "Cita actualizado", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar Cita", error });
  }
};

export const deleteCita = async (req: Request, res: Response): Promise<void> => {
  try {
    const citaRepo  = AppDataSource.getRepository(Cita);
    const ventaRepo = AppDataSource.getRepository(Venta);
    const countVenta = await ventaRepo.count({ where: { cita: { id_cita: Number(req.params.id) } } });
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
import { Venta as VentaModel }       from "../models/Venta";
import { DetalleVenta }              from "../models/DetalleVenta";
import { Servicio }                  from "../models/Servicio";
import { Marco }                     from "../models/Marco";
import { EstadoServicio }            from "../models/EstadoServicio";

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
    const cita = await queryRunner.manager.findOne(Cita, {
      where: { id_cita },
      relations: ["cliente", "estadoCita"],
    });
    if (!cita) { res.status(404).json({ success: false, message: "Cita no encontrada" }); return; }
    if (!cita.cliente) { res.status(400).json({ success: false, message: "La cita no tiene cliente asociado" }); return; }

    // Verificar que no tenga ya una venta
    const ventaExistente = await queryRunner.manager.findOne(VentaModel, {
      where: { cita: { id_cita } },
    });
    if (ventaExistente) {
      res.status(409).json({ success: false, message: "Esta cita ya tiene una venta registrada", data: { id_venta: ventaExistente.id_venta } });
      return;
    }

    // Primer estado de servicio (Sin empezar)
    const estadoInicial = await queryRunner.manager
      .createQueryBuilder(EstadoServicio, "es")
      .where("LOWER(es.nombre) LIKE :n", { n: "%sin empezar%" })
      .getOne();

    // Calcular total
    const total = servicios.reduce((sum, s) => sum + Number(s.precio), 0);

    // Crear Venta
    const venta        = queryRunner.manager.create(VentaModel);
    venta.fecha        = new Date();
    venta.total        = total;
    venta.observacion  = observacion ?? undefined;
    venta.estado       = true;
    venta.cliente      = cita.cliente;
    venta.cita         = cita;
    await queryRunner.manager.save(venta);

    // Crear DetalleVenta por cada servicio
    for (const s of servicios) {
      const servicio = await queryRunner.manager.findOneBy(Servicio, { id_servicio: s.id_servicio });
      if (!servicio) {
        await queryRunner.rollbackTransaction();
        res.status(404).json({ success: false, message: `Servicio #${s.id_servicio} no encontrado` });
        return;
      }

      const detalle         = queryRunner.manager.create(DetalleVenta);
      detalle.venta         = venta;
      detalle.servicio      = servicio;
      detalle.precio        = s.precio;
      detalle.fecha         = venta.fecha;
      detalle.estado        = false;          // pendiente de iniciar
      if (estadoInicial) detalle.estadoServicio = estadoInicial;
      if (s.observacion) (detalle as any).observacion = s.observacion;

      if (s.id_marco) {
        const marco = await queryRunner.manager.findOneBy(Marco, { id_marco: s.id_marco });
        if (marco) detalle.marco = marco;
      }

      await queryRunner.manager.save(detalle);
    }

    // Marcar cita como Completada (id 2)
    const estadoCompletada = await queryRunner.manager.findOneBy(EstadoCita, { id_estado_cita: 2 });
    if (estadoCompletada) { cita.estadoCita = estadoCompletada; await queryRunner.manager.save(cita); }

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