import { MigrationInterface, QueryRunner } from "typeorm";

// "colilla" es el ancho en mm usado en la fórmula de la calculadora de marcos
// (largo + ancho) × 2 + colilla — siempre fue un dato numérico, pero la
// columna (y el schema de Zod) quedaron como varchar/string por error,
// rompiendo la creación/edición de marcos (el frontend ya envía un number).
export class FixFrameColillaType1754000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE marco
      ALTER COLUMN colilla TYPE integer USING colilla::integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE marco
      ALTER COLUMN colilla TYPE varchar USING colilla::varchar
    `);
  }
}
