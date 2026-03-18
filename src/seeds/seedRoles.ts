// src/seeds/seedRoles.ts
import { AppDataSource } from "../data-source";
import { Rol }           from "../models/Rol";

export async function seedRoles(): Promise<void> {
  const repo = AppDataSource.getRepository(Rol);
  if (await repo.count() > 0) return;

  await repo.save(repo.create([
    { nombre: "Admin",    estado: true },
    { nombre: "Empleado", estado: true },
    { nombre: "Cliente",  estado: true },
  ]));

  console.log("✅  Roles sembrados (Admin, Empleado, Cliente)");
}
