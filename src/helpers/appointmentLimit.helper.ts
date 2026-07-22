import { Repository, MoreThanOrEqual } from "typeorm";
import { Appointment } from "../models/Appointment";

// Protección anti-DoS del autoservicio (portal cliente + "agendar sin
// cuenta"): un mismo cliente no puede acumular más de N citas activas y
// futuras a la vez — evita que alguien (o un script) sature la agenda
// reservando decenas de cupos. Solo cuentan Pendiente/Confirmada que no
// hayan vencido — Completada/Cancelada/No Asistió ya no ocupan un cupo real,
// así que se liberan solas apenas cambian de estado. El Admin nunca pasa por
// este guard (agenda vía /api/appointments, un flujo distinto).
export const LIMITE_CITAS_ACTIVAS_CLIENTE = 3;

export const MSG_LIMITE_CITAS_ACTIVAS =
  `Ya tienes ${LIMITE_CITAS_ACTIVAS_CLIENTE} citas activas agendadas. Espera a que se complete o cancela alguna antes de agendar una nueva.`;

export async function excedeLimiteCitasActivas(citaRepo: Repository<Appointment>, id_cliente: number): Promise<boolean> {
  const hoy = new Date(new Date().toISOString().slice(0, 10));
  const citas = await citaRepo.find({
    where: { client: { id_cliente }, fecha: MoreThanOrEqual(hoy) },
    relations: ["appointmentStatus"],
  });
  const activas = citas.filter(c => {
    const nombre = c.appointmentStatus?.nombre?.toLowerCase() ?? "";
    return nombre.includes("pendiente") || nombre.includes("confirmada");
  });
  return activas.length >= LIMITE_CITAS_ACTIVAS_CLIENTE;
}
