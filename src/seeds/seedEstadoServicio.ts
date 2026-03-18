// src/seeds/seedEstadoServicio.ts
import { AppDataSource }  from "../data-source";
import { EstadoServicio } from "../models/EstadoServicio";

export async function seedEstadoServicio(): Promise<void> {
  const repo = AppDataSource.getRepository(EstadoServicio);
  if (await repo.count() > 0) return;
  await repo.save(repo.create([
    { nombre: "Sin empezar"    },
    { nombre: "En preparación" },
    { nombre: "Finalizado"     },
  ]));
  console.log("✅  EstadoServicio sembrado (3)");
}
