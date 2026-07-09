// ─────────────────────────────────────────────────────────────────────────────
//  config/logger.ts
//  Logger central de la aplicación (A09 — Logging & Monitoring Failures).
//
//  Structured logging con pino: cada log es un objeto JSON (no texto plano), lo
//  que permite buscar/filtrar/agregar en herramientas de logs. Reemplaza a
//  console.* en producción, que no tiene niveles, no es estructurado y bloquea
//  el event loop bajo carga.
// ─────────────────────────────────────────────────────────────────────────────
import pino from "pino";

const isProd = process.env.NODE_ENV === "production";

export const logger = pino({
  // Nivel mínimo a emitir. En prod "info" (oculta el ruido de debug); en dev
  // "debug". LOG_LEVEL permite ajustarlo en Render sin recompilar.
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),

  // Transporte: en dev, salida legible con colores (pino-pretty). En prod,
  // undefined = JSON crudo de una línea, que Render captura tal cual.
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
      },

  // Red de seguridad: nunca escribir datos sensibles en los logs. Estas rutas
  // se reemplazan por "[Redacted]" automáticamente. pino NO tiene wildcard de
  // profundidad arbitraria: "*.clave" solo matchea UN nivel de anidamiento, así
  // que hay que listar también el nivel superior ("clave") explícitamente.
  redact: {
    paths: [
      // cabeceras HTTP (el JWT viaja en Authorization) — las loguea pino-http
      "req.headers.authorization",
      "req.headers.cookie",
      // nivel superior: p.ej. logger.info({ clave, token }, ...)
      "clave",
      "clave_actual",
      "password",
      "reset_token",
      "token",
      // un nivel anidado: p.ej. logger.info({ data: { clave } }, ...)
      "*.clave",
      "*.clave_actual",
      "*.password",
      "*.reset_token",
      "*.token",
    ],
    censor: "[Redacted]",
  },
});
