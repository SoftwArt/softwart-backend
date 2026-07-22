// src/middlewares/index.ts
// Punto único de exportación — importa desde aquí en app.ts

export { corsMiddleware }      from "./cors.middleware";
export { notFoundMiddleware }  from "./notFound.middleware";
export { generalLimiter, authLimiter } from "./rateLimit.middleware";
export { verifyToken, requireCliente } from "./auth.middleware";
export { requirePermission }      from "./requirePermission.middleware";

export type { AuthUser }       from "./auth.middleware";
