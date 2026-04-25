import { z } from "zod";

export const guestClientSchema = z.object({
  tipoDocumento: z.string().min(1, "tipoDocumento es requerido"),
  documento:     z.string().min(1, "documento es requerido"),
  nombre:        z.string().min(2).max(100),
  correo:        z.string().email("Correo inválido"),
  telefono:      z.string().optional(),
});

export const registerSchema = z.object({
  tipoDocumento: z.string().min(1, "tipoDocumento es requerido"),
  documento:     z.string().min(1, "documento es requerido"),
  nombre:        z.string().min(2).max(100),
  correo:        z.string().email("Correo inválido"),
  clave:         z.string().min(6, "La clave debe tener al menos 6 caracteres"),
  telefono:      z.string().optional(),
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
  nueva_clave: z.string().min(6, "La nueva clave debe tener al menos 6 caracteres"),
});

export const resendCodeSchema = z.object({
  correo: z.string().email("Correo inválido"),
});
