// ─────────────────────────────────────────────────────────────────────────────
//  errors/UnauthorizedError.ts
//  Uso: cuando falta el token JWT o es inválido.
//  HTTP 401 – Unauthorized
// ─────────────────────────────────────────────────────────────────────────────

import { AppError } from "./AppError";

export class UnauthorizedError extends AppError {
  constructor(message = "No autorizado — token inválido o ausente") {
    super(message, 401);
  }
}
