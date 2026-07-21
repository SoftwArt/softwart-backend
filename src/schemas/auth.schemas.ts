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

// ── Nombre (mínimo 2 caracteres, sin dígitos) ─────────────────────────────────
// Mensajes custom para no dejar pasar el genérico de Zod ("String must
// contain at least 2 character(s)") hasta el usuario final.
export const NOMBRE_MIN_MENSAJE     = "El nombre debe tener al menos 2 caracteres";
export const NOMBRE_NUMEROS_MENSAJE = "El nombre no puede contener números";
export const nombreSchema = z
  .string()
  .min(2, NOMBRE_MIN_MENSAJE)
  .max(100, "El nombre no puede superar los 100 caracteres")
  .regex(/^[^0-9]*$/, NOMBRE_NUMEROS_MENSAJE);

// ── Número de documento (regla depende del tipo) ──────────────────────────────
// Estándar colombiano (Anexo Técnico Resolución 2011/2388 Min. Salud, Circular
// Única Registraduría, ICAO Doc 9303 para pasaportes):
//   CC — numérico, 6, 7, 8 o 10 dígitos (nunca 9)
//   TI — numérico, 10 u 11 dígitos
//   CE — alfanumérico, sin longitud fija en la norma; se usa 6-10 caracteres
//   PP — alfanumérico, hasta 9 caracteres (ICAO 9303, campo de MRZ)
export type DocumentoRegla = { min: number; max: number; soloNumerico: boolean; label: string };

export const DOCUMENTO_REGLAS: Record<string, DocumentoRegla> = {
  CC: { min: 6,  max: 10, soloNumerico: true,  label: "La Cédula de Ciudadanía" },
  TI: { min: 10, max: 11, soloNumerico: true,  label: "La Tarjeta de Identidad" },
  CE: { min: 6,  max: 10, soloNumerico: false, label: "La Cédula de Extranjería" },
  PP: { min: 6,  max: 9,  soloNumerico: false, label: "El Pasaporte" },
};

// null = válido (o tipoDocumento desconocido — lo cubre el propio campo aparte)
export function validarDocumentoPorTipo(tipoDocumento: string, documento: string): string | null {
  const regla = DOCUMENTO_REGLAS[tipoDocumento];
  if (!regla || !documento) return null;
  if (regla.soloNumerico && !/^\d+$/.test(documento)) {
    return `${regla.label} solo debe contener números`;
  }
  if (documento.length < regla.min || documento.length > regla.max) {
    const unidad = regla.soloNumerico ? "dígitos" : "caracteres";
    return regla.min === regla.max
      ? `${regla.label} debe tener ${regla.min} ${unidad}`
      : `${regla.label} debe tener entre ${regla.min} y ${regla.max} ${unidad}`;
  }
  return null;
}

function conValidacionDeDocumento<T extends z.ZodObject<{ tipoDocumento: z.ZodTypeAny; documento: z.ZodTypeAny }>>(
  shape: T,
) {
  return shape.superRefine((data, ctx) => {
    const msg = validarDocumentoPorTipo(data.tipoDocumento as string, data.documento as string);
    if (msg) ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ["documento"] });
  });
}

export const guestClientSchema = conValidacionDeDocumento(z.object({
  tipoDocumento: z.string().min(1, "tipoDocumento es requerido"),
  documento:     z.string().min(1, "documento es requerido"),
  nombre:        nombreSchema,
  correo:        z.string().email("Correo inválido"),
  telefono:      z.string().optional(),
}));

export const guestAppointmentSchema = conValidacionDeDocumento(z.object({
  tipoDocumento: z.string().min(1, "tipoDocumento es requerido"),
  documento:     z.string().min(1, "documento es requerido"),
  nombre:        nombreSchema,
  correo:        z.string().email("Correo inválido"),
  telefono:      z.string().optional(),
  fecha:         z.string().min(1, "fecha es requerida"),
  hora:          z.string().min(1, "hora es requerida"),
  observacion:   z.string().optional(),
}));

export const registerSchema = conValidacionDeDocumento(z.object({
  tipoDocumento: z.string().min(1, "tipoDocumento es requerido"),
  documento:     z.string().min(1, "documento es requerido"),
  nombre:        nombreSchema,
  correo:        z.string().email("Correo inválido"),
  clave:         claveSchema,
  telefono:      telefonoSchema.optional(),
  // El backend no confía en que el checkbox del frontend haya estado
  // marcado — lo re-valida acá. z.literal(true) rechaza tanto `false` como
  // la ausencia del campo.
  acceptTerms:   z.literal(true, { message: "Debes aceptar los Términos de Servicio y la Política de Privacidad" }),
}));

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

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken es requerido"),
});
