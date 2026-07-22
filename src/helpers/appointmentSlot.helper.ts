import { Repository } from "typeorm";
import { Appointment } from "../models/Appointment";

export const MSG_HORARIO_OCUPADO = "Ese horario ya está ocupado, elige otro";

// Cancelada/No Asistió liberan el slot — mismo criterio que publicAvailability
// (AuthController.ts) y appointmentAvailability (ClientAccountController.ts):
// solo Pendiente/Confirmada/Completada siguen "ocupando" esa hora. Sin este
// filtro, cancelar una cita nunca liberaría de verdad su horario para volver
// a agendarse.
export async function existeCitaEnHorario(
  citaRepo: Repository<Appointment>,
  fecha: string,
  hora: string,
  excluirIdCita?: number,
): Promise<boolean> {
  const qb = citaRepo.createQueryBuilder("c")
    .innerJoin("c.appointmentStatus", "es")
    .where("CAST(c.fecha AS DATE) = :fecha AND c.hora = :hora", { fecha, hora })
    .andWhere("LOWER(es.nombre) NOT IN ('cancelada', 'no asistió')");
  if (excluirIdCita !== undefined) {
    qb.andWhere("c.id_cita != :excluirIdCita", { excluirIdCita });
  }
  const existente = await qb.getOne();
  return !!existente;
}
