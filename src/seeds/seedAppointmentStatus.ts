// src/seeds/seedAppointmentStatus.ts
import { AppDataSource } from "../data-source";
import { AppointmentStatus }    from "../models/AppointmentStatus";

export async function seedAppointmentStatus(): Promise<void> {
  const repo = AppDataSource.getRepository(AppointmentStatus);
  // Idempotente por-nombre: inserta solo los que falten, para que "Confirmada"
  // se agregue también en BDs ya sembradas (sin reordenar ni duplicar ids).
  const nombres = ["Pendiente", "Completada", "No Asistió", "Cancelada", "Confirmada"];
  let inserted = 0;
  for (const nombre of nombres) {
    const exists = await repo.findOneBy({ nombre });
    if (!exists) {
      await repo.save(repo.create({ nombre }));
      inserted++;
    }
  }
  if (inserted) console.log(`✅  EstadoCita sembrado (+${inserted})`);
}
