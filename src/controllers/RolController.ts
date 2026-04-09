// ─────────────────────────────────────────────────────────────────────────────
//  RolController.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Role } from "../models/Role";
import { RolePermission } from "../models/RolePermission";
import { User } from "../models/User";

export const getAllRol = async (req: Request, res: Response): Promise<void> => {
  try {
    const rolRepo = AppDataSource.getRepository(Role);
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Number(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [items, total] = await rolRepo.findAndCount({ skip, take: limit });

    res.json({
      success: true,
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Rol", error });
  }
};

export const getRolById = async (req: Request, res: Response): Promise<void> => {
  try {
    const rolRepo = AppDataSource.getRepository(Role);
    const item = await rolRepo.findOne({ where: { id_rol: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "Rol no encontrado" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Rol", error });
  }
};

export const createRol = async (req: Request, res: Response): Promise<void> => {
  try {
    const rolRepo = AppDataSource.getRepository(Role);
    const required = ["nombre"];
    const missing = required.filter(k => req.body[k] === undefined);
    if (missing.length) { res.status(400).json({ success: false, message: `Campos requeridos: ${missing.join(", ")}` }); return; }
    const obj = rolRepo.create();
    obj.nombre = req.body.nombre;
    obj.estado = req.body.estado !== undefined ? req.body.estado : true;
    await rolRepo.save(obj);
    res.status(201).json({ success: true, message: "Rol creado exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear Rol", error });
  }
};

export const updateRol = async (req: Request, res: Response): Promise<void> => {
  try {
    const rolRepo = AppDataSource.getRepository(Role);
    const item = await rolRepo.findOne({ where: { id_rol: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "Rol no encontrado" }); return; }
    if (req.body.nombre !== undefined) item.nombre = req.body.nombre;
    await rolRepo.save(item);
    res.json({ success: true, message: "Rol actualizado", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar Rol", error });
  }
};

export const deleteRol = async (req: Request, res: Response): Promise<void> => {
  try {
    const rolRepo        = AppDataSource.getRepository(Role);
    const permisoRolRepo = AppDataSource.getRepository(RolePermission);
    const usuarioRepo    = AppDataSource.getRepository(User);
    const countPermisoRol = await permisoRolRepo.count({ where: { role: { id_rol: Number(req.params.id) } } });
    if (countPermisoRol > 0) { res.status(409).json({ success: false, message: `No se puede eliminar: existen PermisoRol asociados (${countPermisoRol})` }); return; }
    const countUsuario = await usuarioRepo.count({ where: { role: { id_rol: Number(req.params.id) } } });
    if (countUsuario > 0) { res.status(409).json({ success: false, message: `No se puede eliminar: existen Usuario asociados (${countUsuario})` }); return; }
    const item = await rolRepo.findOneBy({ id_rol: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "Rol no encontrado" }); return; }
    await rolRepo.remove(item);
    res.json({ success: true, message: "Rol eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar Rol", error });
  }
};

export const toggleEstadoRol = async (req: Request, res: Response): Promise<void> => {
  try {
    const rolRepo = AppDataSource.getRepository(Role);
    const item = await rolRepo.findOneBy({ id_rol: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "Rol no encontrado" }); return; }
    item.estado = !item.estado;
    await rolRepo.save(item);
    res.json({ success: true, message: `Rol ${item.estado ? "activado" : "inactivado"}`, data: { estado: item.estado } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al cambiar estado de Rol", error });
  }
};
