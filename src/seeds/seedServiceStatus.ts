// src/seeds/seedServiceStatus.ts
import { AppDataSource }  from "../data-source";
import { ServiceStatus } from "../models/ServiceStatus";

export async function seedServiceStatus(): Promise<void> {
  const repo = AppDataSource.getRepository(ServiceStatus);
  if (await repo.count() > 0) return;
  await repo.save(repo.create([
    { nombre: "Sin empezar"    },
    { nombre: "En preparación" },
    { nombre: "Finalizado"     },
  ]));
  console.log("✅  EstadoServicio sembrado (3)");
}
