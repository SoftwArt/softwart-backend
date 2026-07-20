import { MigrationInterface, QueryRunner } from "typeorm";

// VARCHAR(10) resultó insuficiente en la práctica: TERMINOS_SERVICIO_VERSION
// ('1.0-BORRADOR', 12 chars) lo excede y el INSERT falla con Postgres 22001
// ("value too long for type character varying"). 10 chars es demasiado
// ajustado para cualquier esquema de versión razonable (ej. "2026-07-20" ya
// ocupa las 10 exactas, sin margen para sufijos como "-BORRADOR" o "-beta").
// v_aceptacion_vigente depende de la columna `version` (la selecciona como
// version_vigente) — Postgres no permite ALTER COLUMN TYPE mientras una
// vista dependa de ella. Se elimina y se recrea idéntica alrededor del ALTER.
export class WidenAceptacionLegalVersion1753000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS v_aceptacion_vigente`);
    await queryRunner.query(`ALTER TABLE aceptacion_legal ALTER COLUMN version TYPE VARCHAR(30)`);
    await queryRunner.query(`
      CREATE VIEW v_aceptacion_vigente AS
      SELECT DISTINCT ON (id_cliente, tipo_documento)
             id_cliente,
             tipo_documento,
             version        AS version_vigente,
             evento         AS ultimo_evento,
             ocurrido_en    AS vigente_desde,
             (evento = 'ACEPTACION') AS esta_vigente
        FROM aceptacion_legal
       WHERE id_cliente IS NOT NULL
       ORDER BY id_cliente, tipo_documento, ocurrido_en DESC, id_aceptacion DESC
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS v_aceptacion_vigente`);
    await queryRunner.query(`ALTER TABLE aceptacion_legal ALTER COLUMN version TYPE VARCHAR(10)`);
    await queryRunner.query(`
      CREATE VIEW v_aceptacion_vigente AS
      SELECT DISTINCT ON (id_cliente, tipo_documento)
             id_cliente,
             tipo_documento,
             version        AS version_vigente,
             evento         AS ultimo_evento,
             ocurrido_en    AS vigente_desde,
             (evento = 'ACEPTACION') AS esta_vigente
        FROM aceptacion_legal
       WHERE id_cliente IS NOT NULL
       ORDER BY id_cliente, tipo_documento, ocurrido_en DESC, id_aceptacion DESC
    `);
  }
}
