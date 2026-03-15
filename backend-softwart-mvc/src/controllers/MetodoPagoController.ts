// ─────────────────────────────────────────────────────────────────────────────
//  MetodoPagoController.ts  —  Catálogo (sin paginación)
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { MetodoPago } from "../models/MetodoPago";
import { Pago } from "../models/Pago";

export const getAllMetodoPago = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await AppDataSource.getRepository(MetodoPago).find();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener MetodoPago", error });
  }
};

export const getMetodoPagoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await AppDataSource.getRepository(MetodoPago).findOne({ where: { id_metodo_pago: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "MetodoPago no encontrado" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener MetodoPago", error });
  }
};

export const createMetodoPago = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo = AppDataSource.getRepository(MetodoPago);
    if (!req.body.nombre) { res.status(400).json({ success: false, message: "nombre es requerido" }); return; }
    const obj = repo.create({ nombre: req.body.nombre });
    await repo.save(obj);
    res.status(201).json({ success: true, message: "MetodoPago creado exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear MetodoPago", error });
  }
};

export const updateMetodoPago = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo = AppDataSource.getRepository(MetodoPago);
    const item = await repo.findOne({ where: { id_metodo_pago: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "MetodoPago no encontrado" }); return; }
    if (req.body.nombre !== undefined) item.nombre = req.body.nombre;
    await repo.save(item);
    res.json({ success: true, message: "MetodoPago actualizado", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar MetodoPago", error });
  }
};

export const deleteMetodoPago = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo     = AppDataSource.getRepository(MetodoPago);
    const pagoRepo = AppDataSource.getRepository(Pago);
    const count = await pagoRepo.count({ where: { metodoPago: { id_metodo_pago: Number(req.params.id) } } });
    if (count > 0) { res.status(409).json({ success: false, message: `No se puede eliminar: existen Pago asociados (${count})` }); return; }
    const item = await repo.findOneBy({ id_metodo_pago: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "MetodoPago no encontrado" }); return; }
    await repo.remove(item);
    res.json({ success: true, message: "MetodoPago eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar MetodoPago", error });
  }
};

// PATCH /api/metodo-pago/pago/:id_pago/metodo
export const asignarMetodoPago = async (req: Request, res: Response): Promise<void> => {
  try {
    const pagoRepo       = AppDataSource.getRepository(Pago);
    const metodoPagoRepo = AppDataSource.getRepository(MetodoPago);
    const target = await pagoRepo.findOneBy({ id_pago: Number(req.params.id_pago) });
    if (!target) { res.status(404).json({ success: false, message: "Pago no encontrado" }); return; }
    const metodo = await metodoPagoRepo.findOneBy({ id_metodo_pago: Number(req.body.id_metodo_pago) });
    if (!metodo) { res.status(404).json({ success: false, message: "MetodoPago no encontrado" }); return; }
    target.metodoPago = metodo;
    await pagoRepo.save(target);
    res.json({ success: true, message: "Método de pago asignado", data: target });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error en asignarMetodoPago", error });
  }
};
