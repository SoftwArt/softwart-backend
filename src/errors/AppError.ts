// ─────────────────────────────────────────────────────────────────────────────
//  errors/AppError.ts
//  Clase base de la que heredan todos los errores personalizados.
// ─────────────────────────────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.name        = this.constructor.name;
    this.statusCode  = statusCode;
    this.isOperational = isOperational;

    // Necesario para que instanceof funcione correctamente con ES5
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
