import { MigrationInterface, QueryRunner } from "typeorm";

// Esta migración vacía los datos de todas las tablas del esquema public
// (excepto la tabla de control de migraciones `typeorm_migrations`),
// reinicia los contadores (sequences) y usa CASCADE para eliminar dependencias.
// Está pensada para limpiar una base 'de pruebas en producción' antes de
// ejecutar los seeds del propio backend en Supabase.
export class CleanForSupabaseSeed1762000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN (
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename NOT IN ('typeorm_migrations')
        ) LOOP
          EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', r.tablename);
        END LOOP;
      END
      $$;
    `);
  }

  public async down(): Promise<void> {
    // Esta operación es destructiva y no es reversible.
    // Dejamos el down vacío a propósito.
  }
}
