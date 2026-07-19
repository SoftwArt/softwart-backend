import { MigrationInterface, QueryRunner } from "typeorm";

// ADR-007 §6 no cubría TRUNCATE: trg_aceptacion_inmutable está declarado
// FOR EACH ROW, y TRUNCATE no dispara triggers de fila en Postgres — un
// TRUNCATE TABLE aceptacion_legal vaciaba la bitácora completa sin
// resistencia. Este trigger de sentencia cierra ese hueco reusando la misma
// función (ya usa TG_OP para el mensaje, no requiere cambios).
export class BlockTruncateAceptacionLegal1751000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TRIGGER trg_aceptacion_no_truncate
        BEFORE TRUNCATE ON aceptacion_legal
        FOR EACH STATEMENT
        EXECUTE FUNCTION fn_bloquear_mutacion_aceptacion()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_aceptacion_no_truncate ON aceptacion_legal`);
  }
}
