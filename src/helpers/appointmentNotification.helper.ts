// src/helpers/appointmentNotification.helper.ts
import { Appointment } from "../models/Appointment";
import { sendCitaConfirmadaEmail, sendCitaCanceladaEmail } from "../services/email.service";

// Reenvía correo al cliente cuando el nuevo estado es Confirmada/Cancelada.
// Fire-and-forget: no debe bloquear ni fallar la respuesta HTTP. Antes vivía
// duplicado byte-por-byte en AppointmentController.ts y
// AppointmentStatusController.ts — una sola fuente de verdad acá.
export function notifyAppointmentStatusChange(item: Appointment, nuevoEstadoNombre: string): void {
  if (!item.client?.correo) return;
  const data = {
    correo:        item.client.correo,
    nombreCliente: item.client.nombre,
    // item.fecha ya viene como Date a medianoche UTC (columna `date`,
    // proceso Node en UTC en Render) — el round-trip por toISOString() es
    // seguro, no hay hora de por medio que se pueda desfasar.
    fecha:         new Date(item.fecha).toISOString().slice(0, 10),
    hora:          item.hora,
    id_cita:       item.id_cita,
  };
  const nombre = nuevoEstadoNombre.toLowerCase();
  if (nombre.includes("confirmada")) {
    sendCitaConfirmadaEmail(data).catch(err => console.error("⚠️  Error enviando correo de cita confirmada:", err));
  } else if (nombre.includes("cancelada")) {
    sendCitaCanceladaEmail(data).catch(err => console.error("⚠️  Error enviando correo de cita cancelada:", err));
  }
}
