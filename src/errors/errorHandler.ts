// ─────────────────────────────────────────────────────────────────────────────
//  errors/errorHandler.ts
//  Middleware global de Express para capturar y formatear todos los errores.
//  Registrar en app.ts DESPUÉS de todas las rutas:
//    app.use(errorHandler);
// ─────────────────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from "express";
import { AppError } from "./AppError";
import { ValidationError } from "./ValidationError";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ── Error operacional conocido (AppError y subclases) ─────────────────────
  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors:  err.details,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // ── Error de TypeORM: violación de unique constraint ──────────────────────
  if ((err as any).code === "23505") {
    res.status(409).json({
      success: false,
      message: "Ya existe un registro con esos datos únicos",
      detail:  (err as any).detail ?? null,
    });
    return;
  }

  // ── Error de TypeORM: violación de FK ────────────────────────────────────
  if ((err as any).code === "23503") {
    res.status(409).json({
      success: false,
      message: "No se puede completar la operación: referencia a un registro inexistente",
      detail:  (err as any).detail ?? null,
    });
    return;
  }

  // ── Error no controlado (500) ─────────────────────────────────────────────
  console.error("❌ Error no controlado:", err);
  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
    ...(process.env.NODE_ENV === "development" ? { error: err.message, stack: err.stack } : {}),
  });
}
