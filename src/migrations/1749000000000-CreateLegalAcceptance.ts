import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLegalAcceptance1749000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE aceptacion_legal (
        id_aceptacion SERIAL PRIMARY KEY,
        id_cliente    INTEGER   NOT NULL REFERENCES cliente(id_cliente) ON DELETE CASCADE,
        aceptado      BOOLEAN   NOT NULL,
        version_tos   VARCHAR   NOT NULL,
        version_pyp   VARCHAR   NOT NULL,
        fecha         TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_aceptacion_legal_cliente ON aceptacion_legal(id_cliente)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE aceptacion_legal`);
  }
}
