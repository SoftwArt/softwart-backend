// ─────────────────────────────────────────────────────────────────────────────
//  PermisoController.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Permission } from "../models/Permission";
import { RolePermission } from "../models/RolePermission";

export const getAllPermission = async (req: Request, res: Response): Promise<void> => {
  try {
    const permisoRepo = AppDataSource.getRepository(Permission);
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Number(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [items, total] = await permisoRepo.findAndCount({ skip, take: limit });

    res.json({
      success: true,
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Permiso", error });
  }
};

export const getPermissionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const permisoRepo = AppDataSource.getRepository(Permission);
    const item = await permisoRepo.findOne({ where: { id_permiso: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "Permiso no encontrado" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Permiso", error });
  }
};

export const createPermission = async (req: Request, res: Response): Promise<void> => {
  try {
    const permisoRepo = AppDataSource.getRepository(Permission);
    const required = ["nombre", "descripcion"];
    const missing = required.filter(k => req.body[k] === undefined);
    if (missing.length) { res.status(400).json({ success: false, message: `Campos requeridos: ${missing.join(", ")}` }); return; }
    const obj = permisoRepo.create();
    obj.nombre      = req.body.nombre;
    obj.descripcion = req.body.descripcion;
    obj.estado      = req.body.estado !== undefined ? req.body.estado : true;
    await permisoRepo.save(obj);
    res.status(201).json({ success: true, message: "Permiso creado exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear Permiso", error });
  }
};

export const updatePermission = async (req: Request, res: Response): Promise<void> => {
  try {
    const permisoRepo = AppDataSource.getRepository(Permission);
    const item = await permisoRepo.findOne({ where: { id_permiso: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "Permiso no encontrado" }); return; }
    if (req.body.nombre      !== undefined) item.nombre      = req.body.nombre;
    if (req.body.descripcion !== undefined) item.descripcion = req.body.descripcion;
    await permisoRepo.save(item);
    res.json({ success: true, message: "Permiso actualizado", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar Permiso", error });
  }
};

export const deletePermission = async (req: Request, res: Response): Promise<void> => {
  try {
    const permisoRepo    = AppDataSource.getRepository(Permission);
    const permisoRolRepo = AppDataSource.getRepository(RolePermission);
    const count = await permisoRolRepo.count({ where: { permission: { id_permiso: Number(req.params.id) } } });
    if (count > 0) { res.status(409).json({ success: false, message: `No se puede eliminar: existen PermisoRol asociados (${count})` }); return; }
    const item = await permisoRepo.findOneBy({ id_permiso: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "Permiso no encontrado" }); return; }
    await permisoRepo.remove(item);
    res.json({ success: true, message: "Permiso eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar Permiso", error });
  }
};

export const togglePermissionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const permisoRepo = AppDataSource.getRepository(Permission);
    const item = await permisoRepo.findOneBy({ id_permiso: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "Permiso no encontrado" }); return; }
    item.estado = !item.estado;
    await permisoRepo.save(item);
    res.json({ success: true, message: `Permiso ${item.estado ? "activado" : "inactivado"}`, data: { estado: item.estado } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al cambiar estado de Permiso", error });
  }
};
