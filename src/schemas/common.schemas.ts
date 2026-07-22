import { z } from "zod";

// Sin el `error` de tipo, Zod deja el mensaje interno en inglés técnico
// ("Invalid input: expected number, received undefined") en cuanto un campo
// falta o llega con el tipo equivocado — `.min()`/`.max()`/`.positive()` solo
// corrigen el mensaje cuando el tipo ya era correcto, nunca cuando falta.
// `femenino` es necesario porque "La fecha es requerido" es gramaticalmente
// incorrecto — el helper debe poder concordar género con la etiqueta.
const requerido = (femenino: boolean) => (femenino ? "requerida" : "requerido");

export const textoRequerido = (etiqueta: string, femenino = false) =>
  z.string({ error: `${etiqueta} es ${requerido(femenino)}` }).min(1, `${etiqueta} es ${requerido(femenino)}`);

export const idPositivo = (etiqueta: string, femenino = false) =>
  z.number({ error: `${etiqueta} es ${requerido(femenino)}` })
    .int(`${etiqueta} debe ser un número entero`)
    .positive(`${etiqueta} debe ser mayor a 0`);

export const numeroPositivo = (etiqueta: string, femenino = false) =>
  z.number({ error: `${etiqueta} es ${requerido(femenino)}` })
    .positive(`${etiqueta} debe ser mayor a 0`);

export const fechaISO = (etiqueta: string) =>
  z.string({ error: `${etiqueta} es requerida` }).regex(/^\d{4}-\d{2}-\d{2}$/, `${etiqueta} debe tener formato AAAA-MM-DD`);

// Horario de atención de la marquetería: 13:00–17:59 (citas de 1h, la última
// termina a las 18:00) — único uso de este helper en todo el proyecto es
// hora de Cita, así que el rango de negocio va aquí y no en cada controller
// por separado (antes se repetía a mano en guestAppointment/createMyAppointment
// y faltaba por completo en el CRUD de Citas del panel admin).
export const horaHHMM = (etiqueta: string) =>
  z.string({ error: `${etiqueta} es requerida` })
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, `${etiqueta} debe tener formato HH:MM`)
    .refine((v) => {
      const h = Number(v.slice(0, 2));
      return h >= 13 && h < 18;
    }, `${etiqueta} debe estar entre 13:00 y 18:00`);
