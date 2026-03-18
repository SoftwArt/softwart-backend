// ─────────────────────────────────────────────────────────────────────────────
//  errors/NotFoundError.ts
//  Uso: cuando un recurso buscado por ID no existe en la BD.
//  HTTP 404 – Not Found
// ─────────────────────────────────────────────────────────────────────────────

import { AppError } from "./AppError";

export class NotFoundError extends AppError {
  constructor(resource = "Recurso", id?: number | string) {
    const msg = id !== undefined
      ? `${resource} con id ${id} no encontrado`
      : `${resource} no encontrado`;
    super(msg, 404);
  }
}
