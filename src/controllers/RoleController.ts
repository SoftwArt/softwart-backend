// ─────────────────────────────────────────────────────────────────────────────
//  RolController.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Role } from "../models/Role";
import { RolePermission } from "../models/RolePermission";
import { User } from "../models/User";
import { enviarNoEliminarAsociados } from "../helpers/deleteGuard.helper";

// Admin y Cliente son roles estructurales del sistema (sin Admin no hay
// acceso administrativo; sin Cliente no hay a qué rol asignar una cuenta
// registrada desde el portal) — no se pueden eliminar, desactivar ni
// renombrar. Cualquier otro rol que se cree (ver migración
// RemoveEmpleadoRole) queda fuera a propósito: es una decisión de negocio
// operativa, no estructural.
const esRolEstructural = (nombre: string | undefined): boolean => {
  const n = nombre?.toLowerCase();
  return n === "admin" || n === "cliente";
};

export const getAllRole = async (req: Request, res: Response): Promise<void> => {
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

export const getRoleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const rolRepo = AppDataSource.getRepository(Role);
    const item = await rolRepo.findOne({ where: { id_rol: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "Rol no encontrado" }); return; }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Rol", error });
  }
};

export const createRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const rolRepo = AppDataSource.getRepository(Role);
    const required = ["nombre"];
    const missing = required.filter(k => req.body[k] === undefined);
    if (missing.length) { res.status(400).json({ success: false, message: `Campos requeridos: ${missing.join(", ")}` }); return; }

    // Case-insensitive: "Admin" y "admin" son el mismo rol para efectos de
    // los guards de deleteRole/toggleRoleStatus (comparan por .toLowerCase()).
    const existente = await rolRepo
      .createQueryBuilder("rol")
      .where("LOWER(rol.nombre) = LOWER(:nombre)", { nombre: req.body.nombre })
      .getOne();
    if (existente) {
      res.status(409).json({ success: false, message: `Ya existe un rol llamado "${req.body.nombre}"` });
      return;
    }

    const obj = rolRepo.create();
    obj.nombre = req.body.nombre;
    obj.descripcion = req.body.descripcion;
    obj.estado = req.body.estado !== undefined ? req.body.estado : true;
    await rolRepo.save(obj);
    res.status(201).json({ success: true, message: "Rol creado exitosamente", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear Rol", error });
  }
};

export const updateRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const rolRepo = AppDataSource.getRepository(Role);
    const item = await rolRepo.findOne({ where: { id_rol: Number(req.params.id) } });
    if (!item) { res.status(404).json({ success: false, message: "Rol no encontrado" }); return; }

    if (req.body.nombre !== undefined && req.body.nombre.toLowerCase() !== item.nombre.toLowerCase()) {
      // Renombrar Admin/Cliente los dejaría irreconocibles para los guards de
      // deleteRole/toggleRoleStatus (comparan por nombre) — se bloquea antes
      // de tocar nada.
      if (esRolEstructural(item.nombre)) {
        res.status(403).json({ success: false, message: `El rol ${item.nombre} no puede renombrarse` });
        return;
      }
      const existente = await rolRepo
        .createQueryBuilder("rol")
        .where("LOWER(rol.nombre) = LOWER(:nombre)", { nombre: req.body.nombre })
        .andWhere("rol.id_rol != :id", { id: item.id_rol })
        .getOne();
      if (existente) {
        res.status(409).json({ success: false, message: `Ya existe un rol llamado "${req.body.nombre}"` });
        return;
      }
      item.nombre = req.body.nombre;
    }

    if (req.body.descripcion !== undefined) item.descripcion = req.body.descripcion;

    await rolRepo.save(item);
    res.json({ success: true, message: "Rol actualizado", data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar Rol", error });
  }
};

export const deleteRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const rolRepo        = AppDataSource.getRepository(Role);
    const permisoRolRepo = AppDataSource.getRepository(RolePermission);
    const usuarioRepo    = AppDataSource.getRepository(User);
    const item = await rolRepo.findOneBy({ id_rol: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "Rol no encontrado" }); return; }
    if (esRolEstructural(item.nombre)) {
      res.status(403).json({ success: false, message: `El rol ${item.nombre} no puede eliminarse` }); return;
    }
    const countPermisoRol = await permisoRolRepo.count({ where: { role: { id_rol: Number(req.params.id) } } });
    if (countPermisoRol > 0) {
      enviarNoEliminarAsociados(res, {
        count: countPermisoRol, singular: "permiso", plural: "permisos", genero: "m",
        alternativa: "Desactívalo en su lugar.",
      });
      return;
    }
    const countUsuario = await usuarioRepo.count({ where: { role: { id_rol: Number(req.params.id) } } });
    if (countUsuario > 0) {
      enviarNoEliminarAsociados(res, {
        count: countUsuario, singular: "usuario", plural: "usuarios", genero: "m",
        alternativa: "Desactívalo en su lugar.",
      });
      return;
    }
    await rolRepo.remove(item);
    res.json({ success: true, message: "Rol eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar Rol", error });
  }
};

export const toggleRoleStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const rolRepo = AppDataSource.getRepository(Role);
    const item = await rolRepo.findOneBy({ id_rol: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "Rol no encontrado" }); return; }
    if (esRolEstructural(item.nombre)) {
      res.status(403).json({ success: false, message: `El rol ${item.nombre} no puede desactivarse` }); return;
    }
    item.estado = !item.estado;
    await rolRepo.save(item);
    res.json({ success: true, message: `Rol ${item.estado ? "activado" : "inactivado"}`, data: { estado: item.estado } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al cambiar estado de Rol", error });
  }
};
