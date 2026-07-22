import { MigrationInterface, QueryRunner } from "typeorm";

// RolesPage.tsx ya pedía este campo en el formulario (crear/editar/ver) desde
// antes, pero createRole/updateRole nunca lo recibían ni la tabla `rol` tenía
// dónde guardarlo — se perdía en silencio, sin ningún error visible.
export class AddDescripcionToRole1758000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rol
      ADD COLUMN descripcion character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rol
      DROP COLUMN descripcion
    `);
  }
}
