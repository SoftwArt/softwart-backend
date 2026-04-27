import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveCatalogosPermissions1746000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove role assignments first (FK constraint)
    await queryRunner.query(`
      DELETE FROM permiso_rol
      WHERE id_permiso IN (
        SELECT id_permiso FROM permiso WHERE nombre LIKE 'CATALOGOS.%'
      )
    `);
    // Remove the permissions themselves
    await queryRunner.query(`
      DELETE FROM permiso WHERE nombre LIKE 'CATALOGOS.%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permiso (nombre, descripcion, estado) VALUES
        ('CATALOGOS.VER',    'Ver catálogos (estados, métodos)', true),
        ('CATALOGOS.EDITAR', 'Editar catálogos', true)
    `);
  }
}
