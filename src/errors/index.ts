// ─────────────────────────────────────────────────────────────────────────────
//  errors/index.ts
//  Punto único de importación para todos los errores y el handler.
//
//  Uso en controladores:
//    import { NotFoundError, ConflictError } from "../errors";
//
//  Uso en app.ts:
//    import { errorHandler } from "../errors";
//    app.use(errorHandler);  // siempre al FINAL de las rutas
// ─────────────────────────────────────────────────────────────────────────────

export { AppError }         from "./AppError";
export { NotFoundError }    from "./NotFoundError";
export { BadRequestError }  from "./BadRequestError";
export { ConflictError }    from "./ConflictError";
export { ValidationError }  from "./ValidationError";
export { UnauthorizedError } from "./UnauthorizedError";
export { ForbiddenError }   from "./ForbiddenError";
export { errorHandler }     from "./errorHandler";
