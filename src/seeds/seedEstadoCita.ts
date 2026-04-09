// src/seeds/seedEstadoCita.ts
import { AppDataSource } from "../data-source";
import { AppointmentStatus }    from "../models/AppointmentStatus";

export async function seedEstadoCita(): Promise<void> {
  const repo = AppDataSource.getRepository(AppointmentStatus);
  if (await repo.count() > 0) return;
  await repo.save(repo.create([
    { nombre: "Pendiente"  },
    { nombre: "Completada" },
    { nombre: "No Asistió" },
    { nombre: "Cancelada"  },
  ]));
  console.log("✅  EstadoCita sembrado (4)");
}
