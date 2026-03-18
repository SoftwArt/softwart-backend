// ─────────────────────────────────────────────────────────────────────────────
//  errors/BadRequestError.ts
//  Uso: cuando faltan campos requeridos o el body es inválido.
//  HTTP 400 – Bad Request
// ─────────────────────────────────────────────────────────────────────────────

import { AppError } from "./AppError";

export class BadRequestError extends AppError {
  constructor(message = "Solicitud inválida", public fields?: string[]) {
    const fullMsg = fields && fields.length
      ? `${message}: ${fields.join(", ")}`
      : message;
    super(fullMsg, 400);
  }
}
