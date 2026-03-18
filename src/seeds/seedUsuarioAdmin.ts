// src/seeds/seedUsuarioAdmin.ts
//  Crea el usuario Admin inicial si no existe.
//  Credenciales tomadas del .env o valores por defecto de desarrollo.
// ─────────────────────────────────────────────────────────────────────────────
import bcrypt            from "bcrypt";
import { AppDataSource } from "../data-source";
import { Usuario }       from "../models/Usuario";
import { Rol }           from "../models/Rol";

export async function seedUsuarioAdmin(): Promise<void> {
  const usuarioRepo = AppDataSource.getRepository(Usuario);
  const rolRepo     = AppDataSource.getRepository(Rol);

  const correo = process.env.ADMIN_EMAIL    ?? "admin@softwart.com";
  const clave  = process.env.ADMIN_PASSWORD ?? "Admin1234!";

  const existe = await usuarioRepo.findOne({ where: { correo } });
  if (existe) return;

  const rolAdmin = await rolRepo.findOne({ where: { nombre: "Admin" } });
  if (!rolAdmin) {
    console.warn("⚠️   Rol Admin no encontrado — ejecuta seedRoles primero");
    return;
  }

  const hash    = await bcrypt.hash(clave, 10);
  const usuario = usuarioRepo.create({
    correo,
    clave:  hash,
    rol:    rolAdmin,
    estado: true,
  });

  await usuarioRepo.save(usuario);
  console.log(`✅  Usuario Admin creado (${correo})`);
}
