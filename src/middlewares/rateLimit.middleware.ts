// src/middlewares/rateLimit.middleware.ts
import rateLimit from 'express-rate-limit'
 
const isDev = process.env.NODE_ENV !== 'production'
 
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,       // 15 minutos
  max: isDev ? 10_000 : 200,       // Dev: sin límite real | Prod: 200 req
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes, espera unos minutos.' },
})
 
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 15,           // Dev: holgado para tests | Prod: estricto
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos de autenticación. Espera 15 minutos.' },
  // Sólo cuenta las respuestas fallidas (401/403) — los login exitosos no penalizan
  skipSuccessfulRequests: true,
})

// Más holgado que authLimiter: el refresh proactivo del frontend es
// automático (cada ~15 min mientras la pestaña esté abierta), no una acción
// deliberada del usuario — solo cuenta intentos fallidos.
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes de renovación de sesión.' },
  skipSuccessfulRequests: true,
})

// Límite estricto para reenvío de código — evita spam de emails
export const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 5,            // Dev: sin límite real | Prod: 5 reenvíos por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos de reenvío. Espera 15 minutos.' },
})
 