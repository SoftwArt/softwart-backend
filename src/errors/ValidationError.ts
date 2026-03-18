// ─────────────────────────────────────────────────────────────────────────────
//  errors/ValidationError.ts
//  Uso: cuando los datos existen pero no superan validaciones de negocio.
//  HTTP 422 – Unprocessable Entity
// ─────────────────────────────────────────────────────────────────────────────

import { AppError } from "./AppError";

export interface ValidationDetail {
  field: string;
  message: string;
}

export class ValidationError extends AppError {
  public readonly details: ValidationDetail[];

  constructor(details: ValidationDetail[]) {
    const summary = details.map(d => `${d.field}: ${d.message}`).join(" | ");
    super(`Error de validación — ${summary}`, 422);
    this.details = details;
  }
}
