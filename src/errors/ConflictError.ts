// ─────────────────────────────────────────────────────────────────────────────
//  errors/ConflictError.ts
//  Uso: cuando se intenta eliminar un registro con dependientes,
//       o cuando ya existe una relación (ej: PermisoRol duplicado).
//  HTTP 409 – Conflict
// ─────────────────────────────────────────────────────────────────────────────

import { AppError } from "./AppError";

export class ConflictError extends AppError {
  constructor(message: string, public dependentEntity?: string, public count?: number) {
    const fullMsg = dependentEntity && count !== undefined
      ? `${message} — existen ${count} registro(s) en ${dependentEntity} asociados`
      : message;
    super(fullMsg, 409);
  }
}
