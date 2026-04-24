import { z } from "zod";

export const registerInstallmentSchema = z.object({
  monto:          z.number().positive("El monto debe ser mayor a 0"),
  id_metodo_pago: z.number().int().positive(),
  fecha:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha debe tener formato YYYY-MM-DD").optional(),
  tolerancia:     z.number().min(0).optional(),
});

export const configureInstallmentsSchema = z.object({
  num_abonos:             z.number().int().min(1).max(12).optional(),
  porcentaje_primer_abono: z.number().int().min(1).max(99).optional(),
}).refine(
  data => data.num_abonos !== undefined || data.porcentaje_primer_abono !== undefined,
  { message: "Se requiere num_abonos o porcentaje_primer_abono" }
);
