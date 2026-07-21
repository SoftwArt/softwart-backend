import { MigrationInterface, QueryRunner } from "typeorm";

// deleteRole/toggleRoleStatus (y ahora también el guard de refresh-token
// sesión) identifican los roles estructurales (Admin, Cliente) por nombre —
// sin unicidad en la columna, un duplicado ("Admin" repetido) rompería esa
// protección y confundiría cualquier Select que liste roles por nombre
// (PermissionsPage, el formulario de Usuarios).
export class UniqueRoleNombre1756000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rol
      ADD CONSTRAINT rol_nombre_unique UNIQUE (nombre)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rol
      DROP CONSTRAINT rol_nombre_unique
    `);
  }
}
