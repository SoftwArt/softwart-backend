// src/seeds/seedEstadoPago.ts
import { AppDataSource } from "../data-source";
import { PaymentStatus }    from "../models/PaymentStatus";

export async function seedEstadoPago(): Promise<void> {
  const repo = AppDataSource.getRepository(PaymentStatus);
  if (await repo.count() > 0) return;
  await repo.save(repo.create([
    { nombre: "Pendiente" },
    { nombre: "Validado"  },
  ]));
  console.log("✅  EstadoPago sembrado (2)");
}
