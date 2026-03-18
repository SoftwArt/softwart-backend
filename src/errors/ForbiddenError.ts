// ─────────────────────────────────────────────────────────────────────────────
//  errors/ForbiddenError.ts
//  Uso: token válido pero el rol no tiene permiso para esa acción.
//  HTTP 403 – Forbidden
// ─────────────────────────────────────────────────────────────────────────────

import { AppError } from "./AppError";

export class ForbiddenError extends AppError {
  constructor(message = "Acceso denegado — permisos insuficientes") {
    super(message, 403);
  }
}
