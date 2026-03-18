// src/seeds/seedMetodoPago.ts
import { AppDataSource } from "../data-source";
import { MetodoPago }    from "../models/MetodoPago";

export async function seedMetodoPago(): Promise<void> {
  const repo = AppDataSource.getRepository(MetodoPago);
  if (await repo.count() > 0) return;
  await repo.save(repo.create([
    { nombre: "Efectivo"      },
    { nombre: "Transferencia" },
  ]));
  console.log("✅  MetodoPago sembrado (2)");
}
