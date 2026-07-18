import { z } from "zod";

// ── Política de contraseña (estándar comercial) ───────────────────────────────
// Reutilizable en registro, reset de clave y cambio de clave desde la cuenta.
export const claveSchema = z
  .string()
  .min(8,  "La contraseña debe tener al menos 8 caracteres")
  .max(64, "La contraseña no puede superar los 64 caracteres")
  .regex(/[A-Z]/,        "La contraseña debe incluir al menos una letra mayúscula")
  .regex(/[a-z]/,        "La contraseña debe incluir al menos una letra minúscula")
  .regex(/[0-9]/,        "La contraseña debe incluir al menos un número")
  .regex(/[^A-Za-z0-9]/, "La contraseña debe incluir al menos un carácter especial");

// ── Teléfono (mínimo 10 dígitos numéricos) ────────────────────────────────────
// Cadena vacía se trata como "no provisto" (el campo sigue siendo opcional en
// los formularios que lo usan) — solo valida el formato cuando sí se escribe algo.
export const TELEFONO_MENSAJE = "El teléfono debe tener al menos 10 dígitos numéricos";
export const telefonoSchema = z
  .string()
  .refine((v) => v === "" || /^\d{10,15}$/.test(v), TELEFONO_MENSAJE);

export const guestClientSchema = z.object({
  tipoDocumento: z.string().min(1, "tipoDocumento es requerido"),
  documento:     z.string().min(1, "documento es requerido"),
  nombre:        z.string().min(2).max(100),
  correo:        z.string().email("Correo inválido"),
  telefono:      z.string().optional(),
});

export const guestAppointmentSchema = z.object({
  tipoDocumento: z.string().min(1, "tipoDocumento es requerido"),
  documento:     z.string().min(1, "documento es requerido"),
  nombre:        z.string().min(2).max(100),
  correo:        z.string().email("Correo inválido"),
  telefono:      z.string().optional(),
  fecha:         z.string().min(1, "fecha es requerida"),
  hora:          z.string().min(1, "hora es requerida"),
  observacion:   z.string().optional(),
});

export const registerSchema = z.object({
  tipoDocumento: z.string().min(1, "tipoDocumento es requerido"),
  documento:     z.string().min(1, "documento es requerido"),
  nombre:        z.string().min(2).max(100),
  correo:        z.string().email("Correo inválido"),
  clave:         claveSchema,
  telefono:      telefonoSchema.optional(),
});

export const loginSchema = z.object({
  correo: z.string().email("Correo inválido"),
  clave:  z.string().min(1, "La clave es requerida"),
});

export const recoverSchema = z.object({
  correo: z.string().email("Correo inválido"),
});

export const resetPasswordSchema = z.object({
  token:       z.string().min(1, "El token es requerido"),
  nueva_clave: claveSchema,
});

export const resendCodeSchema = z.object({
  correo: z.string().email("Correo inválido"),
});
