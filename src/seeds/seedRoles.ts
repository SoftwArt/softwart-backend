// src/seeds/seedRoles.ts
import { AppDataSource } from "../data-source";
import { Role }           from "../models/Role";

export async function seedRoles(): Promise<void> {
  const repo = AppDataSource.getRepository(Role);
  if (await repo.count() > 0) return;

  await repo.save(repo.create([
    { nombre: "Admin",    estado: true },
    { nombre: "Empleado", estado: true },
    { nombre: "Cliente",  estado: true },
  ]));

  console.log("✅  Roles sembrados (Admin, Empleado, Cliente)");
}
