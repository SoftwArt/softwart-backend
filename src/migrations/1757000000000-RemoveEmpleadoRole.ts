import { MigrationInterface, QueryRunner } from "typeorm";

// Decisión de negocio: SoftwArt es una PYME de una sola persona, no hay
// empleados reales — se elimina el rol por completo en vez de dejarlo
// medio implementado (sembrado + permisos base, sin un caso de uso real).
// Se encontró un usuario de prueba (empleado@softwart.com) con este rol en
// dev — se elimina también (sin datos reales que proteger en este entorno).
export class RemoveEmpleadoRole1757000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM usuario
      WHERE id_rol = (SELECT id_rol FROM rol WHERE nombre = 'Empleado')
    `);
    await queryRunner.query(`
      DELETE FROM permiso_rol
      WHERE id_rol = (SELECT id_rol FROM rol WHERE nombre = 'Empleado')
    `);
    await queryRunner.query(`DELETE FROM rol WHERE nombre = 'Empleado'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No se recrea — revertir una decisión de negocio con una migración no
    // tiene sentido (los permisos que tenía asignados tampoco se recuperan).
  }
}
