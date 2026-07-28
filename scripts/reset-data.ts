// scripts/reset-data.ts
// Vacía todas las tablas de datos (deja solo lo que los seeds recrean) y
// vuelve a correr los seeds — útil para volver a un estado limpio en dev/demo
// y de paso confirmar que los seeds quedan bien estructurados desde cero.
//
// Incluye `aceptacion_legal` a propósito: pese a estar protegida contra
// TRUNCATE/DELETE/UPDATE (trg_aceptacion_inmutable + trg_aceptacion_no_truncate,
// ADR-007 §6), todo lo acumulado hasta ahora es basura de desarrollo — se
// desactivan sus triggers solo durante este borrado puntual y se reactivan
// de inmediato después, la protección queda intacta para datos reales.
//
// Uso:
//   npm run reset-data                                    (BD local, .env)
//   NODE_ENV=production DATABASE_URL=... npm run reset-data  (Supabase)
import { AppDataSource } from "../src/data-source";
import { runAllSeeds } from "../src/seeds";

// Orden hijos-antes-que-padres — DELETE (no TRUNCATE): `cliente` tiene una
// FK desde aceptacion_legal con ON DELETE SET NULL, y TRUNCATE CASCADE no
// respeta esa acción (solo sabe "truncar también" o "rechazar"), así que
// arrastraría a aceptacion_legal y chocaría con su trigger de inmutabilidad.
// DELETE sí respeta el SET NULL normalmente.
// tabla -> columna de PK serial (permiso_rol tiene PK compuesta, sin serial).
const TABLES: [string, string | null][] = [
  ["historial_estado_servicio", "id_historial"],
  ["pago",                      "id_pago"],
  ["detalle_venta",             "id_detalle"],
  ["aceptacion_legal",          "id_aceptacion"],
  ["venta",                     "id_venta"],
  ["cita",                      "id_cita"],
  ["cliente",                   "id_cliente"],
  ["marco",                     "id_marco"],
  ["usuario",                   "id_usuario"],
  ["permiso_rol",               null],
  ["permiso",                   "id_permiso"],
  ["rol",                       "id_rol"],
  ["estado_cita",               "id_estado_cita"],
  ["estado_servicio",           "id_estado"],
  ["metodo_pago",               "id_metodo_pago"],
  ["estado_pago",               "id_estado_pago"],
  ["servicio",                  "id_servicio"],
];

async function main() {
  await AppDataSource.initialize();
  console.log(`Conectado. Vaciando ${TABLES.length} tablas...`);

  await AppDataSource.query(`ALTER TABLE aceptacion_legal DISABLE TRIGGER trg_aceptacion_inmutable`);
  await AppDataSource.query(`ALTER TABLE aceptacion_legal DISABLE TRIGGER trg_aceptacion_no_truncate`);
  try {
    for (const [table, pkColumn] of TABLES) {
      await AppDataSource.query(`DELETE FROM "${table}"`);
      if (pkColumn) {
        const [{ seq }] = await AppDataSource.query(
          `SELECT pg_get_serial_sequence($1::text, $2::text) AS seq`,
          [table, pkColumn],
        );
        if (seq) await AppDataSource.query(`ALTER SEQUENCE ${seq} RESTART WITH 1`);
      }
    }
  } finally {
    // Se reactivan siempre, incluso si un DELETE falla a mitad de camino —
    // la tabla nunca debe quedar sin su protección de inmutabilidad.
    await AppDataSource.query(`ALTER TABLE aceptacion_legal ENABLE TRIGGER trg_aceptacion_inmutable`);
    await AppDataSource.query(`ALTER TABLE aceptacion_legal ENABLE TRIGGER trg_aceptacion_no_truncate`);
  }
  console.log("✅  Tablas vaciadas (triggers de aceptacion_legal reactivados).");

  await runAllSeeds();

  const counts = await Promise.all(
    TABLES.map(async ([table]) => {
      const [{ count }] = await AppDataSource.query(`SELECT COUNT(*)::int FROM "${table}"`);
      return `${table}: ${count}`;
    }),
  );
  console.log("\nConteo final:\n" + counts.join("\n"));

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error("❌  Error en reset-data:", err);
  process.exit(1);
});
