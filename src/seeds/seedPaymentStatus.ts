// src/seeds/seedPaymentStatus.ts
import { AppDataSource } from "../data-source";
import { PaymentStatus }    from "../models/PaymentStatus";

export async function seedPaymentStatus(): Promise<void> {
  const repo = AppDataSource.getRepository(PaymentStatus);
  const nombres = ["Pendiente", "Validado", "Anulado"];
  let inserted = 0;
  for (const nombre of nombres) {
    const exists = await repo.findOneBy({ nombre });
    if (!exists) {
      await repo.save(repo.create({ nombre }));
      inserted++;
    }
  }
  if (inserted) console.log(`✅  EstadoPago sembrado (+${inserted})`);
}
