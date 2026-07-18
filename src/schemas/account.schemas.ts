import { z } from "zod";
import { telefonoSchema } from "./auth.schemas";

export const editProfileSchema = z.object({
  nombre:       z.string().min(2).max(100).optional(),
  telefono:     telefonoSchema.nullable().optional(),
  correo:       z.string().email("Correo inválido").optional(),
  clave_actual: z.string().optional(),
  clave:        z.string().min(6, "La nueva clave debe tener al menos 6 caracteres").optional(),
}).refine(
  data => Object.keys(data).some(k => data[k as keyof typeof data] !== undefined),
  { message: "Se requiere al menos un campo para actualizar" }
);

export const cancelMyAppointmentSchema = z.object({
  motivo: z.string().max(500, "El motivo no puede superar los 500 caracteres").optional(),
});

export const createMyAppointmentSchema = z.object({
  fecha:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha debe tener formato YYYY-MM-DD"),
  hora:          z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "hora debe tener formato HH:MM"),
  observacion:   z.string().optional(),
  id_estado_cita: z.number().int().positive().optional(),
});
