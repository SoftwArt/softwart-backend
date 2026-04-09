// src/seeds/seedPaymentMethod.ts
import { AppDataSource } from "../data-source";
import { PaymentMethod }    from "../models/PaymentMethod";

export async function seedPaymentMethod(): Promise<void> {
  const repo = AppDataSource.getRepository(PaymentMethod);
  if (await repo.count() > 0) return;
  await repo.save(repo.create([
    { nombre: "Efectivo"      },
    { nombre: "Transferencia" },
  ]));
  console.log("✅  MetodoPago sembrado (2)");
}
