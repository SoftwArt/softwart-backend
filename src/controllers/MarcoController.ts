// ─────────────────────────────────────────────────────────────────────────────
//  MarcoController.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Frame } from "../models/Frame";
import { SaleDetail } from "../models/SaleDetail";

export const getAllMarco = async (req: Request, res: Response): Promise<void> => {
  try {
    const marcoRepo = AppDataSource.getRepository(Frame);
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Number(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [items, total] = await marcoRepo.findAndCount({ skip, take: limit });

    res.json({
      success: true,
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Marco", error });
  }
};

export const getMarcoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const marcoRepo = AppDataSource.getRepository(Frame);
    const item = await marcoRepo.findOne({ where: { id_marco: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "Marco no encontrado" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Marco", error });
  }
};

export const createMarco = async (req: Request, res: Response): Promise<void> => {
  try {
    const marcoRepo = AppDataSource.getRepository(Frame);
    const required = ["codigo", "colilla", "precio_ensamblado"];
    const missing = required.filter(k => req.body[k] === undefined);
    if (missing.length) { res.status(400).json({ success: false, message: `Campos requeridos: ${missing.join(", ")}` }); return; }
    const obj = marcoRepo.create();
    obj.codigo            = req.body.codigo;
    obj.colilla           = req.body.colilla;
    obj.precio_ensamblado = req.body.precio_ensamblado;
    obj.estado            = req.body.estado !== undefined ? req.body.estado : true;
    await marcoRepo.save(obj);
    res.status(201).json({ success: true, message: "Marco creado exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear Marco", error });
  }
};

export const updateMarco = async (req: Request, res: Response): Promise<void> => {
  try {
    const marcoRepo = AppDataSource.getRepository(Frame);
    const item = await marcoRepo.findOne({ where: { id_marco: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "Marco no encontrado" }); return; }
    if (req.body.codigo            !== undefined) item.codigo            = req.body.codigo;
    if (req.body.colilla           !== undefined) item.colilla           = req.body.colilla;
    if (req.body.precio_ensamblado !== undefined) item.precio_ensamblado = req.body.precio_ensamblado;
    await marcoRepo.save(item);
    res.json({ success: true, message: "Marco actualizado", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar Marco", error });
  }
};

export const deleteMarco = async (req: Request, res: Response): Promise<void> => {
  try {
    const marcoRepo        = AppDataSource.getRepository(Frame);
    const detalleVentaRepo = AppDataSource.getRepository(SaleDetail);
    const count = await detalleVentaRepo.count({ where: { frame: { id_marco: Number(req.params.id) } } });
    if (count > 0) { res.status(409).json({ success: false, message: `No se puede eliminar: existen DetalleVenta asociados (${count})` }); return; }
    const item = await marcoRepo.findOneBy({ id_marco: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "Marco no encontrado" }); return; }
    await marcoRepo.remove(item);
    res.json({ success: true, message: "Marco eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar Marco", error });
  }
};

export const toggleEstadoMarco = async (req: Request, res: Response): Promise<void> => {
  try {
    const marcoRepo = AppDataSource.getRepository(Frame);
    const item = await marcoRepo.findOneBy({ id_marco: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "Marco no encontrado" }); return; }
    item.estado = !item.estado;
    await marcoRepo.save(item);
    res.json({ success: true, message: `Marco ${item.estado ? "activado" : "inactivado"}`, data: { estado: item.estado } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al cambiar estado de Marco", error });
  }
};
