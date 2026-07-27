// src/seeds/seedPaymentMethod.ts
import { AppDataSource } from "../data-source";
import { PaymentMethod }    from "../models/PaymentMethod";

export async function seedPaymentMethod(): Promise<void> {
  const repo = AppDataSource.getRepository(PaymentMethod);
  // Idempotente por-nombre: inserta solo los que falten, para que "Tarjeta"
  // se agregue también en BDs ya sembradas (sin reordenar ni duplicar ids).
  const nombres = ["Efectivo", "Transferencia", "Tarjeta"];
  let inserted = 0;
  for (const nombre of nombres) {
    const exists = await repo.findOneBy({ nombre });
    if (!exists) {
      await repo.save(repo.create({ nombre }));
      inserted++;
    }
  }
  if (inserted) console.log(`✅  MetodoPago sembrado (+${inserted})`);
}
