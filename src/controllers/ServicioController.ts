// ─────────────────────────────────────────────────────────────────────────────
//  ServicioController.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Service } from "../models/Service";
import { SaleDetail } from "../models/SaleDetail";

export const getAllServicio = async (req: Request, res: Response): Promise<void> => {
  try {
    const servicioRepo = AppDataSource.getRepository(Service);
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Number(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [items, total] = await servicioRepo.findAndCount({ skip, take: limit });

    res.json({
      success: true,
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Servicio", error });
  }
};

export const getServicioById = async (req: Request, res: Response): Promise<void> => {
  try {
    const servicioRepo = AppDataSource.getRepository(Service);
    const item = await servicioRepo.findOne({ where: { id_servicio: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "Servicio no encontrado" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Servicio", error });
  }
};

export const createServicio = async (req: Request, res: Response): Promise<void> => {
  try {
    const servicioRepo = AppDataSource.getRepository(Service);
    const required = ["nombre", "duracion"];
    const missing = required.filter(k => req.body[k] === undefined);
    if (missing.length) { res.status(400).json({ success: false, message: `Campos requeridos: ${missing.join(", ")}` }); return; }
    const obj = servicioRepo.create();
    obj.nombre      = req.body.nombre;
    obj.descripcion = req.body.descripcion;
    obj.duracion    = req.body.duracion;
    obj.estado      = req.body.estado !== undefined ? req.body.estado : true;
    await servicioRepo.save(obj);
    res.status(201).json({ success: true, message: "Servicio creado exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear Servicio", error });
  }
};

export const updateServicio = async (req: Request, res: Response): Promise<void> => {
  try {
    const servicioRepo = AppDataSource.getRepository(Service);
    const item = await servicioRepo.findOne({ where: { id_servicio: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "Servicio no encontrado" }); return; }
    if (req.body.nombre      !== undefined) item.nombre      = req.body.nombre;
    if (req.body.descripcion !== undefined) item.descripcion = req.body.descripcion;
    if (req.body.duracion    !== undefined) item.duracion    = req.body.duracion;
    await servicioRepo.save(item);
    res.json({ success: true, message: "Servicio actualizado", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar Servicio", error });
  }
};

export const deleteServicio = async (req: Request, res: Response): Promise<void> => {
  try {
    const servicioRepo     = AppDataSource.getRepository(Service);
    const detalleVentaRepo = AppDataSource.getRepository(SaleDetail);
    const count = await detalleVentaRepo.count({ where: { service: { id_servicio: Number(req.params.id) } } });
    if (count > 0) { res.status(409).json({ success: false, message: `No se puede eliminar: existen DetalleVenta asociados (${count})` }); return; }
    const item = await servicioRepo.findOneBy({ id_servicio: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "Servicio no encontrado" }); return; }
    await servicioRepo.remove(item);
    res.json({ success: true, message: "Servicio eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar Servicio", error });
  }
};

export const toggleEstadoServicio = async (req: Request, res: Response): Promise<void> => {
  try {
    const servicioRepo = AppDataSource.getRepository(Service);
    const item = await servicioRepo.findOneBy({ id_servicio: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "Servicio no encontrado" }); return; }
    item.estado = !item.estado;
    await servicioRepo.save(item);
    res.json({ success: true, message: `Servicio ${item.estado ? "activado" : "inactivado"}`, data: { estado: item.estado } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al cambiar estado de Servicio", error });
  }
};
