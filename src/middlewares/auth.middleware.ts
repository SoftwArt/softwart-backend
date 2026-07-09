import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../config/logger";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET no definida — el servidor no puede arrancar");

export interface AuthUser {
  id_usuario: number;
  correo: string;
  id_rol: number;
  rol: string;              // "Admin", "Cliente"
  id_cliente: number | null;
}

// ── Verifica el JWT ───────────────────────────────────────────
export const verifyToken: RequestHandler = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Token no proporcionado" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ success: false, message: "Token inválido o expirado" });
  }
};

// ── Guard por nombre de rol ───────────────────────────────────
export const requireRol = (...roles: string[]): RequestHandler => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      logger.warn(
        { id_usuario: req.user?.id_usuario, rol: req.user?.rol, ruta: req.originalUrl },
        "acceso denegado (rol insuficiente)",
      );
      return res.status(403).json({ success: false, message: "Acceso denegado: permisos insuficientes" });
    }
    next();
  };
};

// ── Guard: solo clientes ─────────────────────────────────────
export const requireCliente: RequestHandler = (req, res, next) => {
  if (!req.user || req.user.id_cliente === null) {
    return res.status(403).json({ success: false, message: "Acceso denegado: se requiere cuenta de cliente" });
  }
  next();
};
