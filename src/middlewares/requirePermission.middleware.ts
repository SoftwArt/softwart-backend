import { RequestHandler } from "express";
import { AppDataSource } from "../data-source";
import { RolePermission } from "../models/RolePermission";
import { Permission } from "../models/Permission";
import { logger } from "../config/logger";

export const requirePermission = (nombrePermiso: string): RequestHandler => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "No autenticado" });
      }

      const { id_rol } = req.user;
      const permisoRepo = AppDataSource.getRepository(RolePermission);

      const tienePermiso = await permisoRepo
        .createQueryBuilder("pr")
        .innerJoin("pr.permission", "permiso")
        .where("pr.id_rol = :id_rol", { id_rol })
        .andWhere("permiso.nombre = :nombrePermiso", { nombrePermiso })
        .andWhere("permiso.estado = :estado", { estado: true })
        .getOne();

      if (!tienePermiso) {
        logger.warn(
          { id_usuario: req.user.id_usuario, rol: req.user.rol, permiso: nombrePermiso, ruta: req.originalUrl },
          "acceso denegado (permiso faltante)",
        );
        // El mensaje en lenguaje natural usa la descripción del permiso (ej.
        // "Eliminar ventas") cuando existe, en vez del código interno crudo
        // (VENTAS.ELIMINAR) — antes esta respuesta mandaba { error: ... },
        // que no coincide con el contrato { success, message } que ya lee
        // apiClient.ts, así que el frontend caía al fallback genérico "Error 403".
        const permiso = await AppDataSource.getRepository(Permission).findOne({ where: { nombre: nombrePermiso } });
        const descripcion = permiso?.descripcion ?? nombrePermiso;
        return res.status(403).json({
          success: false,
          message: `No tienes permiso para: ${descripcion}`,
        });
      }

      next();
    } catch (err) {
      logger.error({ err }, "error verificando permisos");
      return res.status(500).json({ success: false, message: "Error verificando permisos" });
    }
  };
};
