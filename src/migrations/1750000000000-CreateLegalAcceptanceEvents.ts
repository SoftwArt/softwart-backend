import { MigrationInterface, QueryRunner } from "typeorm";

// Reemplaza a 1749000000000-CreateLegalAcceptance (revertida): aquella
// modelaba aceptacion_legal como tabla de ESTADO (aceptado boolean,
// version_tos + version_pyp en una fila) y usaba ON DELETE CASCADE, lo que
// contradice la política de privacidad (la constancia debe sobrevivir a la
// eliminación del cliente). Ver ADR-007 (docs/ADR/) para el análisis completo.
export class CreateLegalAcceptanceEvents1750000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE tipo_documento_legal AS ENUM (
        'TERMINOS_SERVICIO',
        'POLITICA_PRIVACIDAD'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE evento_legal AS ENUM (
        'ACEPTACION',
        'REVOCACION'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE contexto_aceptacion AS ENUM (
        'REGISTRO',
        'RE_ACEPTACION',
        'PORTAL'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE aceptacion_legal (
        id_aceptacion       BIGSERIAL PRIMARY KEY,

        id_cliente          INTEGER REFERENCES cliente (id_cliente) ON DELETE SET NULL,

        documento_titular   VARCHAR(20)  NOT NULL,
        correo_titular      VARCHAR(255) NOT NULL,

        tipo_documento      tipo_documento_legal NOT NULL,
        version             VARCHAR(10)  NOT NULL,
        hash_documento      CHAR(64)     NOT NULL,

        evento              evento_legal        NOT NULL,
        contexto            contexto_aceptacion NOT NULL,

        ip                  INET,
        user_agent          TEXT,

        ocurrido_en         TIMESTAMPTZ  NOT NULL DEFAULT now(),

        CONSTRAINT chk_revocacion_solo_datos CHECK (
          evento <> 'REVOCACION' OR tipo_documento = 'POLITICA_PRIVACIDAD'
        ),

        CONSTRAINT chk_hash_hex CHECK (hash_documento ~ '^[0-9a-f]{64}$')
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_aceptacion_cliente
        ON aceptacion_legal (id_cliente, tipo_documento, ocurrido_en DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_aceptacion_documento_titular
        ON aceptacion_legal (documento_titular)
    `);

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

    await queryRunner.query(`
      CREATE TRIGGER trg_aceptacion_inmutable
        BEFORE UPDATE OR DELETE ON aceptacion_legal
        FOR EACH ROW
        EXECUTE FUNCTION fn_bloquear_mutacion_aceptacion()
    `);

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
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_aceptacion_inmutable ON aceptacion_legal`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_bloquear_mutacion_aceptacion`);
    await queryRunner.query(`DROP TABLE IF EXISTS aceptacion_legal`);
    await queryRunner.query(`DROP TYPE IF EXISTS contexto_aceptacion`);
    await queryRunner.query(`DROP TYPE IF EXISTS evento_legal`);
    await queryRunner.query(`DROP TYPE IF EXISTS tipo_documento_legal`);
  }
}
