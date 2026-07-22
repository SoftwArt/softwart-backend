import { z } from "zod";
import { fechaISO, horaHHMM, idPositivo, numeroPositivo } from "./common.schemas";

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
  observacion:  z.string().optional(),
});

export const createSaleFromAppointmentSchema = z.object({
  servicios:   z.array(servicioLineSchema, { error: "Debes agregar al menos un servicio" })
                 .min(1, "Agrega al menos un servicio"),
  observacion: z.string().optional(),
});
