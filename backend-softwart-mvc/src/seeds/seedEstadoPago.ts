// src/seeds/seedEstadoPago.ts
import { AppDataSource } from "../data-source";
import { EstadoPago }    from "../models/EstadoPago";

export async function seedEstadoPago(): Promise<void> {
  const repo = AppDataSource.getRepository(EstadoPago);
  if (await repo.count() > 0) return;
  await repo.save(repo.create([
    { nombre: "Pendiente" },
    { nombre: "Validado"  },
  ]));
  console.log("✅  EstadoPago sembrado (2)");
}
