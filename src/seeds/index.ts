// src/seeds/index.ts
//  Runs all seeds in safe order (idempotent).
//  Called from app.ts after AppDataSource.initialize()
// ─────────────────────────────────────────────────────────────────────────────
import { seedServices }          from "./seedServices";
import { seedAppointmentStatus } from "./seedAppointmentStatus";
import { seedServiceStatus }     from "./seedServiceStatus";
import { seedPaymentMethod }     from "./seedPaymentMethod";
import { seedPaymentStatus }     from "./seedPaymentStatus";
import { seedRoles }             from "./seedRoles";
import { seedPermissions }       from "./seedPermissions";
import { seedAdminUser }         from "./seedAdminUser";

export async function runAllSeeds(): Promise<void> {
  console.log("\n🌱  Running seeds...");
  try {
    // ── Catalogs (no dependencies) ──────────────────────────────────────────
    await seedServices();
    await seedAppointmentStatus();
    await seedServiceStatus();
    await seedPaymentMethod();
    await seedPaymentStatus();

    // ── Security (order: roles → permissions → admin user) ──────────────────
    await seedRoles();
    await seedPermissions();
    await seedAdminUser();

    console.log("✅  Seeds completed\n");
  } catch (error) {
    console.error("❌  Seed error:", error);
  }
}
