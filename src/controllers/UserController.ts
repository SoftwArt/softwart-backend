// ─────────────────────────────────────────────────────────────────────────────
//  UsuarioController.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../models/User";
import { Role } from "../models/Role";
import bcrypt from "bcrypt";

// El administrador base es el usuario sembrado (id_usuario = 1) — cuenta protegida
const SEED_ADMIN_ID = 1;

// Helper: elimina la clave del objeto antes de enviarlo
const sinClave = ({ clave, ...rest }: User) => rest;

export const getAllUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioRepo = AppDataSource.getRepository(User);
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(100, Number(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [items, total] = await usuarioRepo.findAndCount({
      relations: ["role"],
      skip,
      take: limit,
    });

    res.json({
      success: true,
      data: items.map(u => ({ ...sinClave(u), es_admin_base: u.id_usuario === SEED_ADMIN_ID })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Usuario", error });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioRepo = AppDataSource.getRepository(User);
    const item = await usuarioRepo.findOne({
      where: { id_usuario: Number(req.params.id) },
      relations: ["role"],
    });
    if (!item) { res.status(404).json({ success: false, message: "Usuario no encontrado" }); return; }
    res.json({ success: true, data: sinClave(item) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener Usuario", error });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioRepo = AppDataSource.getRepository(User);
    const required = ["correo", "clave"];
    const missing = required.filter(k => req.body[k] === undefined);
    if (missing.length) { res.status(400).json({ success: false, message: `Campos requeridos: ${missing.join(", ")}` }); return; }

    const porCorreo = await usuarioRepo.findOne({ where: { correo: req.body.correo } });
    if (porCorreo) { res.status(409).json({ success: false, message: "Ya existe un usuario registrado con ese correo" }); return; }

    const obj = usuarioRepo.create();
    obj.correo = req.body.correo;
    obj.clave  = await bcrypt.hash(req.body.clave, 10);
    obj.estado = req.body.estado !== undefined ? req.body.estado : true;
    if (req.body.id_rol !== undefined) {
      const rel = await AppDataSource.getRepository(Role).findOneBy({ id_rol: Number(req.body.id_rol) });
      if (!rel) { res.status(404).json({ success: false, message: "Rol no encontrado" }); return; }
      obj.role = rel;
    }
    await usuarioRepo.save(obj);
    res.status(201).json({ success: true, message: "Usuario creado exitosamente", data: sinClave(obj) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear Usuario", error });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioRepo = AppDataSource.getRepository(User);
    const item = await usuarioRepo.findOne({
      where: { id_usuario: Number(req.params.id) },
      relations: ["role"],
    });
    if (!item) { res.status(404).json({ success: false, message: "Usuario no encontrado" }); return; }

    // El admin base (SEED_ADMIN_ID) ya no puede eliminarse ni desactivarse
    // (deleteUser/toggleUserStatus) — pero updateUser no replicaba la misma
    // protección: cambiarle el correo o el rol equivale a un bloqueo de acceso
    // encubierto (deja de poder loguearse, o pierde los permisos de Admin). La
    // clave sí se puede rotar, eso no compromete la cuenta protegida.
    if (item.id_usuario === SEED_ADMIN_ID) {
      if (req.body.correo !== undefined && req.body.correo !== item.correo) {
        res.status(403).json({ success: false, message: "El correo del usuario administrador base no puede cambiarse" });
        return;
      }
      if (req.body.id_rol !== undefined && Number(req.body.id_rol) !== item.role?.id_rol) {
        res.status(403).json({ success: false, message: "El rol del usuario administrador base no puede cambiarse" });
        return;
      }
    }

    if (req.body.correo !== undefined && req.body.correo !== item.correo) {
      const porCorreo = await usuarioRepo.findOne({ where: { correo: req.body.correo } });
      if (porCorreo) { res.status(409).json({ success: false, message: "Ya existe un usuario registrado con ese correo" }); return; }
    }

    if (req.body.correo !== undefined) item.correo = req.body.correo;
    if (req.body.clave  !== undefined) item.clave  = await bcrypt.hash(req.body.clave, 10);
    if (req.body.id_rol !== undefined) {
      const rel = await AppDataSource.getRepository(Role).findOneBy({ id_rol: Number(req.body.id_rol) });
      if (!rel) { res.status(404).json({ success: false, message: "Rol no encontrado" }); return; }
      item.role = rel;
    }
    await usuarioRepo.save(item);
    res.json({ success: true, message: "Usuario actualizado", data: sinClave(item) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al actualizar Usuario", error });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioRepo = AppDataSource.getRepository(User);
    const item = await usuarioRepo.findOneBy({ id_usuario: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "Usuario no encontrado" }); return; }
    if (item.id_usuario === SEED_ADMIN_ID) {
      res.status(403).json({ success: false, message: "El usuario administrador base no puede eliminarse" });
      return;
    }
    await usuarioRepo.remove(item);
    res.json({ success: true, message: "Usuario eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar Usuario", error });
  }
};

export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const usuarioRepo = AppDataSource.getRepository(User);
    const item = await usuarioRepo.findOneBy({ id_usuario: Number(req.params.id) });
    if (!item) { res.status(404).json({ success: false, message: "Usuario no encontrado" }); return; }
    if (item.id_usuario === SEED_ADMIN_ID) {
      res.status(403).json({ success: false, message: "El usuario administrador base no puede desactivarse" });
      return;
    }
    item.estado = !item.estado;
    await usuarioRepo.save(item);
    res.json({ success: true, message: `Usuario ${item.estado ? "activado" : "inactivado"}`, data: { estado: item.estado } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al cambiar estado de Usuario", error });
  }
};
