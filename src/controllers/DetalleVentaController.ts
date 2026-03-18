// ─────────────────────────────────────────────────────────────────────────────
//  DetalleVentaController.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { DetalleVenta } from "../models/DetalleVenta";
import { Venta } from "../models/Venta";
import { Servicio } from "../models/Servicio";
import { EstadoServicio } from "../models/EstadoServicio";
import { Marco } from "../models/Marco";

export const getAllDetalleVenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const detalleVentaRepo = AppDataSource.getRepository(DetalleVenta);
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Number(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [items, total] = await detalleVentaRepo.findAndCount({
      relations: ["venta", "servicio", "estadoServicio", "marco"],
      skip,
      take: limit,
    });

    res.json({
      success: true,
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener DetalleVenta", error });
  }
};

export const getDetalleVentaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const detalleVentaRepo = AppDataSource.getRepository(DetalleVenta);
    const item = await detalleVentaRepo.findOne({
      where: { id_detalle: Number(req.params.id) },
      relations: ["venta", "servicio", "estadoServicio", "marco"],
    });
    if (!item) { res.status(404).json({ success: false, message: "DetalleVenta no encontrado" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener DetalleVenta", error });
  }
};

export const createDetalleVenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const detalleVentaRepo = AppDataSource.getRepository(DetalleVenta);
    const required = ["fecha", "precio"];
    const missing = required.filter(k => req.body[k] === undefined);
    if (missing.length) { res.status(400).json({ success: false, message: `Campos requeridos: ${missing.join(", ")}` }); return; }
    const obj = detalleVentaRepo.create();
    obj.fecha       = req.body.fecha;
    obj.observacion = req.body.observacion;
    obj.precio      = req.body.precio;
    obj.estado      = req.body.estado !== undefined ? req.body.estado : true;
    if (req.body.id_venta !== undefined) {
      const rel = await AppDataSource.getRepository(Venta).findOneBy({ id_venta: Number(req.body.id_venta) });
      if (!rel) { res.status(404).json({ success: false, message: "Venta no encontrado" }); return; }
      obj.venta = rel;
    }
    if (req.body.id_servicio !== undefined) {
      const rel = await AppDataSource.getRepository(Servicio).findOneBy({ id_servicio: Number(req.body.id_servicio) });
      if (!rel) { res.status(404).json({ success: false, message: "Servicio no encontrado" }); return; }
      obj.servicio = rel;
    }
    if (req.body.id_estado !== undefined) {
      const rel = await AppDataSource.getRepository(EstadoServicio).findOneBy({ id_estado: Number(req.body.id_estado) });
      if (!rel) { res.status(404).json({ success: false, message: "EstadoServicio no encontrado" }); return; }
      obj.estadoServicio = rel;
    }
    if (req.body.id_marco !== undefined) {
      const rel = await AppDataSource.getRepository(Marco).findOneBy({ id_marco: Number(req.body.id_marco) });
      if (!rel) { res.status(404).json({ success: false, message: "Marco no encontrado" }); return; }
      obj.marco = rel;
    }
    await detalleVentaRepo.save(obj);
    res.status(201).json({ success: true, message: "DetalleVenta creado exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear DetalleVenta", error });
  }
};

export const updateDetalleVenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const detalleVentaRepo = AppDataSource.getRepository(DetalleVenta);
    const item = await detalleVentaRepo.findOne({
      where: { id_detalle: Number(req.params.id) },
      relations: ["venta", "servicio", "estadoServicio", "marco"],
    });
    if (!item) { res.status(404).json({ success: false, message: "DetalleVenta no encontrado" }); return; }
    if (req.body.fecha       !== undefined) item.fecha       = req.body.fecha;
    if (req.body.observacion !== undefined) item.observacion = req.body.observacion;
    if (req.body.precio      !== undefined) item.precio      = req.body.precio;
    if (req.body.id_venta !== undefined) {
      const rel = await AppDataSource.getRepository(Venta).findOneBy({ id_venta: Number(req.body.id_venta) });
      if (!rel) { res.status(404).json({ success: false, message: "Venta no encontrado" }); return; }
      item.venta = rel;
    }
    if (req.body.id_servicio !== undefined) {
      const rel = await AppDataSource.getRepository(Servicio).findOneBy({ id_servicio: Number(req.body.id_servicio) });
      if (!rel) { res.status(404).json({ success: false, message: "Servicio no encontrado" }); return; }
      item.servicio = rel;
    }
    if (req.body.id_estado !== undefined) {
      const rel = await AppDataSource.getRepository(EstadoServicio).findOneBy({ id_estado: Number(req.body.id_estado) });
      if (!rel) { res.status(404).json({ success: false, message: "EstadoServicio no encontrado" }); return; }
      item.estadoServicio = rel;
    }
    if (req.body.id_marco !== undefined) {
      const rel = await AppDataSource.getRepository(Marco).findOneBy({ id_marco: Number(req.body.id_marco) });
      if (!rel) { res.status(404).json({ success: false, message: "Marco no encontrado" }); return; }
      item.marco = rel;
    }
    await detalleVentaRepo.save(item);
    res.json({ success: true, message: "DetalleVenta actualizado", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar DetalleVenta", error });
  }
};

export const deleteDetalleVenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const detalleVentaRepo = AppDataSource.getRepository(DetalleVenta);
    const item = await detalleVentaRepo.findOneBy({ id_detalle: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "DetalleVenta no encontrado" }); return; }
    await detalleVentaRepo.remove(item);
    res.json({ success: true, message: "DetalleVenta eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar DetalleVenta", error });
  }
};

export const toggleEstadoDetalleVenta = async (req: Request, res: Response): Promise<void> => {
  try {
    const detalleVentaRepo = AppDataSource.getRepository(DetalleVenta);
    const item = await detalleVentaRepo.findOneBy({ id_detalle: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "DetalleVenta no encontrado" }); return; }
    item.estado = !item.estado;
    await detalleVentaRepo.save(item);
    res.json({ success: true, message: `DetalleVenta ${item.estado ? "activado" : "inactivado"}`, data: { estado: item.estado } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al cambiar estado de DetalleVenta", error });
  }
};
