import { MigrationInterface, QueryRunner } from "typeorm";

// Bug real detectado por la suite de canario (Tarea 2, orden de trabajo de
// blindaje de aceptacion_legal): trg_aceptacion_inmutable bloqueaba TODO
// UPDATE sin excepción — incluido el UPDATE interno que el propio motor
// ejecuta sobre id_cliente cuando se borra el Cliente referenciado (FK
// ON DELETE SET NULL). Eso rompía la garantía central del ADR-007 §3.4: "la
// constancia sobrevive a la eliminación de la cuenta". Al eliminar un
// Cliente, el intento de SET NULL disparaba la misma excepción que un
// UPDATE malicioso, y la eliminación completa fallaba.
//
// Fix: la función distingue el UPDATE del motor (únicamente id_cliente pasa
// de un valor a NULL, ninguna otra columna cambia) y lo deja pasar. Cualquier
// otro UPDATE — incluido uno que además cambie id_cliente junto con otra
// columna — sigue bloqueado.
export class AllowSetNullUpdateAceptacionLegal1752000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_bloquear_mutacion_aceptacion()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF TG_OP = 'UPDATE'
           AND NEW.id_cliente IS NULL
           AND OLD.id_cliente IS NOT NULL
           AND NEW.documento_titular  IS NOT DISTINCT FROM OLD.documento_titular
           AND NEW.correo_titular     IS NOT DISTINCT FROM OLD.correo_titular
           AND NEW.tipo_documento     IS NOT DISTINCT FROM OLD.tipo_documento
           AND NEW.version            IS NOT DISTINCT FROM OLD.version
           AND NEW.hash_documento     IS NOT DISTINCT FROM OLD.hash_documento
           AND NEW.evento             IS NOT DISTINCT FROM OLD.evento
           AND NEW.contexto           IS NOT DISTINCT FROM OLD.contexto
           AND NEW.ip                 IS NOT DISTINCT FROM OLD.ip
           AND NEW.user_agent         IS NOT DISTINCT FROM OLD.user_agent
           AND NEW.ocurrido_en        IS NOT DISTINCT FROM OLD.ocurrido_en
        THEN
          RETURN NEW;
        END IF;

        RAISE EXCEPTION
          'aceptacion_legal es un registro de auditoria inmutable: % no permitido. '
          'Para revocar, inserte un evento REVOCACION.',
          TG_OP;
      END;
      $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
      $$
    `);
  }
}
