// src/seeds/seedServicios.ts
import { AppDataSource } from "../data-source";
import { Servicio }      from "../models/Servicio";

export async function seedServicios(): Promise<void> {
  const repo = AppDataSource.getRepository(Servicio);
  if (await repo.count() > 0) return;
  await repo.save(repo.create([
    { nombre: "Personalización", descripcion: "Servicio de personalización", duracion: 8,  estado: true },
    { nombre: "Restauración",    descripcion: "Servicio de restauración",    duracion: 15, estado: true },
    { nombre: "Enmarcación",     descripcion: "Servicio de enmarcación",     duracion: 8,  estado: true },
    { nombre: "Decoración",      descripcion: "Servicio de decoración",      duracion: 15, estado: true },
    { nombre: "Texturizado",     descripcion: "Servicio de texturizado",     duracion: 15, estado: true },
  ]));
  console.log("✅  Servicios sembrados (5)");
}
