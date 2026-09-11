// src/seeds/seedServiceStatus.ts
import { AppDataSource }  from "../data-source";
import { ServiceStatus } from "../models/ServiceStatus";

export async function seedServiceStatus(): Promise<void> {
  const repo = AppDataSource.getRepository(ServiceStatus);
  // Idempotente por-nombre: inserta solo los que falten, para que estados
  // nuevos ("Cancelado", "Entregado") se agreguen también en BDs ya
  // sembradas (sin reordenar ni duplicar ids). "Entregado" cierra el flujo
  // después de "Finalizado": Finalizado = listo en el taller, Entregado =
  // el cliente ya se lo llevó (ver useOrderStatusFlow.ts en el frontend).
  const nombres = ["Sin empezar", "En preparación", "Finalizado", "Entregado", "Cancelado"];
  let inserted = 0;
  for (const nombre of nombres) {
    const exists = await repo.findOneBy({ nombre });
    if (!exists) {
      await repo.save(repo.create({ nombre }));
      inserted++;
    }
  }
  if (inserted) console.log(`✅  EstadoServicio sembrado (+${inserted})`);
}
