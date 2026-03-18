// src/seeds/seedEstadoCita.ts
import { AppDataSource } from "../data-source";
import { EstadoCita }    from "../models/EstadoCita";

export async function seedEstadoCita(): Promise<void> {
  const repo = AppDataSource.getRepository(EstadoCita);
  if (await repo.count() > 0) return;
  await repo.save(repo.create([
    { nombre: "Pendiente"  },
    { nombre: "Completada" },
    { nombre: "No Asistió" },
    { nombre: "Cancelada"  },
  ]));
  console.log("✅  EstadoCita sembrado (4)");
}
