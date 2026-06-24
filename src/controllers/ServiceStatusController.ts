// ─────────────────────────────────────────────────────────────────────────────
//  EstadoServicioController.ts  —  Catálogo (sin paginación)
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { ServiceStatus } from "../models/ServiceStatus";
import { SaleDetail } from "../models/SaleDetail";

export const getAllServiceStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await AppDataSource.getRepository(ServiceStatus).find();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener EstadoServicio", error });
  }
};

export const getServiceStatusById = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await AppDataSource.getRepository(ServiceStatus).findOne({ where: { id_estado: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "EstadoServicio no encontrado" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener EstadoServicio", error });
  }
};

export const createServiceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo = AppDataSource.getRepository(ServiceStatus);
    if (!req.body.nombre) { res.status(400).json({ success: false, message: "nombre es requerido" }); return; }
    const obj = repo.create({ nombre: req.body.nombre });
    await repo.save(obj);
    res.status(201).json({ success: true, message: "EstadoServicio creado exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear EstadoServicio", error });
  }
};

export const updateServiceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo = AppDataSource.getRepository(ServiceStatus);
    const item = await repo.findOne({ where: { id_estado: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "EstadoServicio no encontrado" }); return; }
    if (req.body.nombre !== undefined) item.nombre = req.body.nombre;
    await repo.save(item);
    res.json({ success: true, message: "EstadoServicio actualizado", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar EstadoServicio", error });
  }
};

export const deleteServiceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo             = AppDataSource.getRepository(ServiceStatus);
    const detalleVentaRepo = AppDataSource.getRepository(SaleDetail);
    const count = await detalleVentaRepo.count({ where: { serviceStatus: { id_estado: Number(req.params.id) } } });
    if (count > 0) { res.status(409).json({ success: false, message: `No se puede eliminar: existen DetalleVenta asociados (${count})` }); return; }
    const item = await repo.findOneBy({ id_estado: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "EstadoServicio no encontrado" }); return; }
    await repo.remove(item);
    res.json({ success: true, message: "EstadoServicio eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar EstadoServicio", error });
  }
};

// PATCH /api/estado-servicio/detalle/:id_detalle/estado
export const changeSaleDetailStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const detalleVentaRepo   = AppDataSource.getRepository(SaleDetail);
    const estadoServicioRepo = AppDataSource.getRepository(ServiceStatus);
    const target = await detalleVentaRepo.findOne({
      where: { id_detalle: Number(req.params.id_detalle) },
      relations: ["serviceStatus"],
    });
    if (!target) { res.status(404).json({ success: false, message: "DetalleVenta no encontrado" }); return; }
    // Estado terminal: un servicio cancelado no puede cambiar de estado.
    if (target.serviceStatus?.nombre?.toLowerCase().includes("cancelado")) {
      res.status(409).json({ success: false, message: "No se puede cambiar el estado de un servicio cancelado" }); return;
    }
    const nuevoEstado = await estadoServicioRepo.findOneBy({ id_estado: Number(req.body.id_estado) });
    if (!nuevoEstado) { res.status(404).json({ success: false, message: "EstadoServicio no encontrado" }); return; }
    target.serviceStatus = nuevoEstado;
    await detalleVentaRepo.save(target);
    res.json({ success: true, message: "Estado de DetalleVenta actualizado", data: target });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error en changeSaleDetailStatus", error });
  }
};
