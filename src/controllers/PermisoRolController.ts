// src/controllers/PermisoRolController.ts
import { Request, Response } from "express";
import { AppDataSource }     from "../data-source";
import { PermisoRol }        from "../models/PermisoRol";
import { Permiso }           from "../models/Permiso";
import { Rol }               from "../models/Rol";

export const getAllPermisoRol = async (req: Request, res: Response): Promise<void> => {
  try {
    const permisoRolRepo = AppDataSource.getRepository(PermisoRol);
    const page  = Math.max(1, Number(req.query.page)  || 1);
    // Límite subido a 500 para que el frontend pueda pedir todos de una
    const limit = Math.min(500, Number(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [items, total] = await permisoRolRepo.findAndCount({
      relations: ["permiso", "rol"],
      skip,
      take: limit,
    });

    res.json({ success: true, data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al obtener PermisoRol", error });
  }
};

export const createPermisoRol = async (req: Request, res: Response): Promise<void> => {
  try {
    const permisoRolRepo = AppDataSource.getRepository(PermisoRol);
    const permisoRepo    = AppDataSource.getRepository(Permiso);
    const rolRepo        = AppDataSource.getRepository(Rol);

    const { id_permiso, id_rol } = req.body;
    if (!id_permiso || !id_rol) {
      res.status(400).json({ success: false, message: "id_permiso e id_rol son requeridos" }); return;
    }

    const permiso = await permisoRepo.findOneBy({ id_permiso: Number(id_permiso) });
    const rol     = await rolRepo.findOneBy({ id_rol: Number(id_rol) });
    if (!permiso) { res.status(404).json({ success: false, message: "Permiso no encontrado" }); return; }
    if (!rol)     { res.status(404).json({ success: false, message: "Rol no encontrado" }); return; }

    // QueryBuilder para verificar duplicado — más confiable que findOne con relaciones anidadas
    const existing = await permisoRolRepo
      .createQueryBuilder("pr")
      .where("pr.id_permiso = :id_permiso AND pr.id_rol = :id_rol", {
        id_permiso: Number(id_permiso),
        id_rol:     Number(id_rol),
      })
      .getOne();

    if (existing) { res.status(409).json({ success: false, message: "La relación ya existe" }); return; }

    const obj    = new PermisoRol();
    obj.permiso  = permiso;
    obj.rol      = rol;
    await permisoRolRepo.save(obj);
    res.status(201).json({ success: true, message: "PermisoRol creado", data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al crear PermisoRol", error });
  }
};

export const deletePermisoRol = async (req: Request, res: Response): Promise<void> => {
  try {
    const permisoRolRepo = AppDataSource.getRepository(PermisoRol);
    const { id_permiso, id_rol } = req.body;

    if (!id_permiso || !id_rol) {
      res.status(400).json({ success: false, message: "id_permiso e id_rol son requeridos" }); return;
    }

    // QueryBuilder igual que en createPermisoRol para consistencia
    const item = await permisoRolRepo
      .createQueryBuilder("pr")
      .where("pr.id_permiso = :id_permiso AND pr.id_rol = :id_rol", {
        id_permiso: Number(id_permiso),
        id_rol:     Number(id_rol),
      })
      .getOne();

    if (!item) { res.status(404).json({ success: false, message: "PermisoRol no encontrado" }); return; }
    await permisoRolRepo.remove(item);
    res.json({ success: true, message: "PermisoRol eliminado" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al eliminar PermisoRol", error });
  }
};