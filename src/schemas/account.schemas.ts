import { z } from "zod";
import { telefonoSchema, nombreSchema, claveSchema } from "./auth.schemas";
import { fechaISO, horaHHMM, idPositivo } from "./common.schemas";

// La política de contraseña es una sola en todo el sistema (registro, reset
// y cambio desde la cuenta): min 8, mayúscula, minúscula, número, especial —
// `claveSchema` en auth.schemas.ts. Antes esta ruta aceptaba min 6 sin
// complejidad en el schema y el controller la re-validaba por su cuenta con
// claveSchema, dejando un 422 duplicado con mensajes distintos.
export const editProfileSchema = z.object({
  nombre:       nombreSchema.optional(),
  telefono:     telefonoSchema.nullable().optional(),
  correo:       z.string({ error: "El correo es requerido" }).email("Correo inválido").optional(),
  clave_actual: z.string({ error: "La contraseña actual es requerida" }).optional(),
  clave:        claveSchema.optional(),
}).refine(
  data => Object.keys(data).some(k => data[k as keyof typeof data] !== undefined),
  { message: "Debes indicar al menos un campo para actualizar" }
);

export const cancelMyAppointmentSchema = z.object({
  motivo: z.string({ error: "El motivo debe ser un texto" })
            .max(500, "El motivo no puede superar los 500 caracteres")
            .optional(),
});

export const createMyAppointmentSchema = z.object({
  fecha:          fechaISO("La fecha"),
  hora:           horaHHMM("La hora"),
  observacion:    z.string().optional(),
  id_estado_cita: idPositivo("El estado de la cita").optional(),
});
