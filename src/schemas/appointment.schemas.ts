import { z } from "zod";

export const createAppointmentSchema = z.object({
  fecha:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha debe tener formato YYYY-MM-DD"),
  hora:           z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "hora debe tener formato HH:MM"),
  id_estado_cita: z.number().int().positive().optional(),
  id_cliente:     z.number().int().positive().optional(),
  observacion:    z.string().optional(),
});

export const updateAppointmentSchema = z.object({
  fecha:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha debe tener formato YYYY-MM-DD").optional(),
  hora:           z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "hora debe tener formato HH:MM").optional(),
  id_estado_cita: z.number().int().positive().optional(),
  id_cliente:     z.number().int().positive().optional(),
  observacion:    z.string().optional(),
});

const servicioLineSchema = z.object({
  id_servicio:  z.number().int().positive(),
  id_marco:     z.number().int().positive().nullable().optional(),
  precio:       z.number().positive("El precio debe ser mayor a 0"),
  observacion:  z.string().optional(),
});

export const createSaleFromAppointmentSchema = z.object({
  servicios:   z.array(servicioLineSchema).min(1, "Agrega al menos un servicio"),
  observacion: z.string().optional(),
});
