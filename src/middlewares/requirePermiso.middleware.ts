import { RequestHandler } from "express";
import { AppDataSource } from "../data-source";
import { PermisoRol } from "../models/PermisoRol";

export const requirePermiso = (nombrePermiso: string): RequestHandler => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id_rol } = req.user;
      const permisoRepo = AppDataSource.getRepository(PermisoRol);

      const tienePermiso = await permisoRepo
        .createQueryBuilder("pr")
        .innerJoin("pr.permiso", "permiso")
        .where("pr.id_rol = :id_rol", { id_rol })
        .andWhere("permiso.nombre = :nombrePermiso", { nombrePermiso })
        .getOne();

      if (!tienePermiso) {
        return res.status(403).json({ error: "Forbidden: permiso requerido" });
      }

      next();
    } catch (err) {
      return res.status(500).json({ error: "Error verificando permisos" });
    }
  };
};
