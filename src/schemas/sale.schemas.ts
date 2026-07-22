import { z } from "zod";
import { fechaISO, idPositivo, numeroPositivo } from "./common.schemas";

export const registerInstallmentSchema = z.object({
  monto:          numeroPositivo("El monto"),
  id_metodo_pago: idPositivo("El método de pago"),
  fecha:          fechaISO("La fecha").optional(),
  tolerancia:     z.number({ error: "La tolerancia es requerida" })
                    .min(0, "La tolerancia no puede ser negativa")
                    .optional(),
});

export const configureInstallmentsSchema = z.object({
  num_abonos: z.number({ error: "El número de abonos es requerido" })
    .int("El número de abonos debe ser un número entero")
    .min(1, "El número de abonos debe ser al menos 1")
    .max(12, "El número de abonos no puede superar 12")
    .optional(),
  porcentaje_primer_abono: z.number({ error: "El porcentaje del primer abono es requerido" })
    .int("El porcentaje del primer abono debe ser un número entero")
    .min(1, "El porcentaje del primer abono debe ser al menos 1")
    .max(99, "El porcentaje del primer abono no puede superar 99")
    .optional(),
}).refine(
  data => data.num_abonos !== undefined || data.porcentaje_primer_abono !== undefined,
  { message: "Debes indicar el número de abonos o el porcentaje del primer abono" }
);
