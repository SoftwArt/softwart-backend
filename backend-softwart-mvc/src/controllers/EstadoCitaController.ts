// ─────────────────────────────────────────────────────────────────────────────
//  EstadoCitaController.ts  —  Catálogo (sin paginación)
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { EstadoCita } from "../models/EstadoCita";
import { Cita } from "../models/Cita";

export const getAllEstadoCita = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await AppDataSource.getRepository(EstadoCita).find();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener EstadoCita", error });
  }
};

export const getEstadoCitaById = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await AppDataSource.getRepository(EstadoCita).findOne({ where: { id_estado_cita: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "EstadoCita no encontrado" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener EstadoCita", error });
  }
};

export const createEstadoCita = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo = AppDataSource.getRepository(EstadoCita);
    if (!req.body.nombre) { res.status(400).json({ success: false, message: "nombre es requerido" }); return; }
    const obj = repo.create({ nombre: req.body.nombre });
    await repo.save(obj);
    res.status(201).json({ success: true, message: "EstadoCita creado exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear EstadoCita", error });
  }
};

export const updateEstadoCita = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo = AppDataSource.getRepository(EstadoCita);
    const item = await repo.findOne({ where: { id_estado_cita: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "EstadoCita no encontrado" }); return; }
    if (req.body.nombre !== undefined) item.nombre = req.body.nombre;
    await repo.save(item);
    res.json({ success: true, message: "EstadoCita actualizado", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar EstadoCita", error });
  }
};

export const deleteEstadoCita = async (req: Request, res: Response): Promise<void> => {
  try {
    const repo     = AppDataSource.getRepository(EstadoCita);
    const citaRepo = AppDataSource.getRepository(Cita);
    const count = await citaRepo.count({ where: { estadoCita: { id_estado_cita: Number(req.params.id) } } });
    if (count > 0) { res.status(409).json({ success: false, message: `No se puede eliminar: existen Cita asociados (${count})` }); return; }
    const item = await repo.findOneBy({ id_estado_cita: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "EstadoCita no encontrado" }); return; }
    await repo.remove(item);
    res.json({ success: true, message: "EstadoCita eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar EstadoCita", error });
  }
};

// PATCH /api/estado-cita/cita/:id_cita/estado
export const cambiarEstadoCita = async (req: Request, res: Response): Promise<void> => {
  try {
    const citaRepo       = AppDataSource.getRepository(Cita);
    const estadoCitaRepo = AppDataSource.getRepository(EstadoCita);
    const target = await citaRepo.findOneBy({ id_cita: Number(req.params.id_cita) });
    if (!target) { res.status(404).json({ success: false, message: "Cita no encontrado" }); return; }
    const nuevoEstado = await estadoCitaRepo.findOneBy({ id_estado_cita: Number(req.body.id_estado_cita) });
    if (!nuevoEstado) { res.status(404).json({ success: false, message: "EstadoCita no encontrado" }); return; }
    target.estadoCita = nuevoEstado;
    await citaRepo.save(target);
    res.json({ success: true, message: "Estado de Cita actualizado", data: target });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error en cambiarEstadoCita", error });
  }
};
