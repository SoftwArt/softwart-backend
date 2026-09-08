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
  // Máximo 100 (antes 99): con num_abonos = 1 el primer (y único) abono ES
  // el 100% del total — un pago único legítimo, no un caso raro a bloquear.
  // El refine de abajo exige que el 100% solo llegue acompañado de
  // num_abonos = 1 en el mismo body (nunca con 2+ abonos, donde dejaría el
  // resto en $0).
  porcentaje_primer_abono: z.number({ error: "El porcentaje del primer abono es requerido" })
    .int("El porcentaje del primer abono debe ser un número entero")
    .min(1, "El porcentaje del primer abono debe ser al menos 1")
    .max(100, "El porcentaje del primer abono no puede superar 100")
    .optional(),
  // Vía alterna al porcentaje: el cliente indica el valor en pesos del primer
  // abono y el controller lo convierte a porcentaje_primer_abono (única
  // columna persistida — ver Sale.porcentaje_primer_abono). Mutuamente
  // excluyente con porcentaje_primer_abono, validado en el refine de abajo.
  monto_primer_abono: numeroPositivo("El monto del primer abono").optional(),
}).refine(
  data => data.num_abonos !== undefined || data.porcentaje_primer_abono !== undefined || data.monto_primer_abono !== undefined,
  { message: "Debes indicar el número de abonos, el porcentaje o el monto del primer abono" }
).refine(
  data => !(data.porcentaje_primer_abono !== undefined && data.monto_primer_abono !== undefined),
  { message: "Indica el porcentaje o el monto del primer abono, no ambos" }
).refine(
  data => !(data.porcentaje_primer_abono === 100 && data.num_abonos !== 1),
  { message: "100% del primer abono solo es válido con num_abonos = 1 (pago único)" }
);
