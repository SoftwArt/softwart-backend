import { z } from "zod";
import { fechaISO, horaHHMM, idPositivo, numeroPositivo } from "./common.schemas";

// Domingo NO se bloquea acá — este schema es del panel Admin, donde el staff
// (ej. Silvana) a veces sí atiende domingo y agenda una cita telefónica para
// un cliente. El bloqueo de domingo es exclusivo del portal cliente
// (account.schemas.ts → createMyAppointmentSchema, vía fechaCitaISO).
export const createAppointmentSchema = z.object({
  fecha:          fechaISO("La fecha"),
  hora:           horaHHMM("La hora"),
  id_estado_cita: idPositivo("El estado de la cita").optional(),
  id_cliente:     idPositivo("El cliente").optional(),
  observacion:    z.string().optional(),
});

export const updateAppointmentSchema = z.object({
  fecha:          fechaISO("La fecha").optional(),
  hora:           horaHHMM("La hora").optional(),
  id_estado_cita: idPositivo("El estado de la cita").optional(),
  id_cliente:     idPositivo("El cliente").optional(),
  observacion:    z.string().optional(),
});

const servicioLineSchema = z.object({
  id_servicio:  idPositivo("El servicio"),
  id_marco:     idPositivo("El marco").nullable().optional(),
  precio:       numeroPositivo("El precio"),
  fecha_estimada: fechaISO("La fecha estimada").nullable().optional(),
  observacion:  z.string().optional(),
});

// Plan de abonos + primer abono opcional, configurados en el mismo paso que
// crear la venta desde la cita — mismo shape/refine que
// configureInstallmentsSchema (sale.schemas.ts), más id_metodo_pago porque
// acá SÍ se registra el primer pago (no solo se configura el plan). El monto
// del primer abono nunca lo teclea el usuario — se deriva de
// calculateInstallments(total, num_abonos, porcentaje_primer_abono) dentro
// del controller, la misma fuente de verdad que ya usa registerInstallment.
const planAbonosSchema = z.object({
  num_abonos: z.number({ error: "El número de abonos es requerido" })
    .int("El número de abonos debe ser un número entero")
    .min(1, "El número de abonos debe ser al menos 1")
    .max(12, "El número de abonos no puede superar 12")
    .optional(),
  // Máximo 100 (antes 99): con num_abonos = 1 el primer (y único) abono ES
  // el 100% del total — un pago único legítimo. El refine de abajo exige que
  // el 100% solo llegue acompañado de num_abonos = 1 en el mismo body.
  porcentaje_primer_abono: z.number({ error: "El porcentaje del primer abono es requerido" })
    .int("El porcentaje del primer abono debe ser un número entero")
    .min(1, "El porcentaje del primer abono debe ser al menos 1")
    .max(100, "El porcentaje del primer abono no puede superar 100")
    .optional(),
  monto_primer_abono: numeroPositivo("El monto del primer abono").optional(),
  id_metodo_pago: idPositivo("El método de pago"),
}).refine(
  data => !(data.porcentaje_primer_abono !== undefined && data.monto_primer_abono !== undefined),
  { message: "Indica el porcentaje o el monto del primer abono, no ambos" }
).refine(
  data => !(data.porcentaje_primer_abono === 100 && data.num_abonos !== 1),
  { message: "100% del primer abono solo es válido con num_abonos = 1 (pago único)" }
);

export const createSaleFromAppointmentSchema = z.object({
  servicios:   z.array(servicioLineSchema, { error: "Debes agregar al menos un servicio" })
                 .min(1, "Agrega al menos un servicio"),
  observacion: z.string().optional(),
  plan_abonos: planAbonosSchema.optional(),
});
