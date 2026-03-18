// src/seeds/index.ts
//  Ejecuta todos los seeds en orden seguro (idempotente).
//  Llamar desde app.ts después de AppDataSource.initialize()
// ─────────────────────────────────────────────────────────────────────────────
import { seedServicios }      from "./seedServicios";
import { seedEstadoCita }     from "./seedEstadoCita";
import { seedEstadoServicio } from "./seedEstadoServicio";
import { seedMetodoPago }     from "./seedMetodoPago";
import { seedEstadoPago }     from "./seedEstadoPago";
import { seedRoles }          from "./seedRoles";
import { seedPermisos }       from "./seedPermisos";
import { seedUsuarioAdmin }   from "./seedUsuarioAdmin";

export async function runAllSeeds(): Promise<void> {
  console.log("\n🌱  Iniciando semilla...");
  try {
    // ── Catálogos (sin dependencias) ─────────────────────────────────────────
    await seedServicios();
    await seedEstadoCita();
    await seedEstadoServicio();
    await seedMetodoPago();
    await seedEstadoPago();

    // ── Seguridad (orden: roles → permisos → usuario admin) ──────────────────
    await seedRoles();
    await seedPermisos();
    await seedUsuarioAdmin();

    console.log("✅  Semilla completada\n");
  } catch (error) {
    console.error("❌  Error durante la semilla:", error);
  }
}
