import { MigrationInterface, QueryRunner } from "typeorm";

// Esta migración vacía los datos de todas las tablas del esquema public
// (excepto la tabla de control de migraciones `typeorm_migrations`),
// reinicia los contadores (sequences) y usa CASCADE para eliminar dependencias.
// Está pensada para limpiar una base 'de pruebas en producción' antes de
// ejecutar los seeds del propio backend en Supabase.
export class CleanForSupabaseSeed1762000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the immutability trigger/function for `aceptacion_legal` if present,
    // so we can fully truncate for a clean seed. We'll recreate the trigger
    // and function after truncation to restore the original behavior.
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_aceptacion_no_truncate ON public.aceptacion_legal;
      DROP TRIGGER IF EXISTS trg_aceptacion_inmutable ON public.aceptacion_legal;
      DROP FUNCTION IF EXISTS fn_bloquear_mutacion_aceptacion();
    `);

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

    // Recreate the immutability function and trigger for aceptacion_legal so the
    // database enforces the original audit behavior again.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_bloquear_mutacion_aceptacion()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RAISE EXCEPTION
          'aceptacion_legal es un registro de auditoria inmutable: % no permitido. '
          'Para revocar, inserte un evento REVOCACION.',
          TG_OP;
      END;
      $$;

      CREATE TRIGGER trg_aceptacion_inmutable
        BEFORE UPDATE OR DELETE ON aceptacion_legal
        FOR EACH ROW
        EXECUTE FUNCTION fn_bloquear_mutacion_aceptacion();
    `);
  }

  public async down(): Promise<void> {
    // Esta operación es destructiva y no es reversible.
    // Dejamos el down vacío a propósito.
  }
}
