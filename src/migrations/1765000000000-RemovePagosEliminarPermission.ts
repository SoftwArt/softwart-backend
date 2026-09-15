import { MigrationInterface, QueryRunner } from "typeorm";

// PAGOS.ELIMINAR era un permiso huérfano en el catálogo de Roles/Permisos: la
// entidad Payment nunca admite hard-delete (deletePayment y su ruta DELETE
// fueron retirados a propósito — un Pago es dinero real, solo se anula, ver
// CLAUDE.md), así que este permiso no protegía ningún controller/ruta ni
// tenía botón real en el panel. Se borra junto con sus asignaciones en
// permiso_rol para no dejar referencias sueltas en ningún rol.
export class RemovePagosEliminarPermission1765000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM permiso_rol
      WHERE id_permiso IN (SELECT id_permiso FROM permiso WHERE nombre = 'PAGOS.ELIMINAR')
    `);
    await queryRunner.query(`
      DELETE FROM permiso WHERE nombre = 'PAGOS.ELIMINAR'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Se re-crea el permiso (sin reasignarlo a ningún rol — no hay forma de
    // saber a cuáles estaba asignado antes del down). `nombre` no tiene un
    // constraint UNIQUE a nivel de BD (solo se trata como único por
    // convención de la app), así que se evita duplicar con un NOT EXISTS en
    // vez de ON CONFLICT.
    await queryRunner.query(`
      INSERT INTO permiso (nombre, descripcion, estado)
      SELECT 'PAGOS.ELIMINAR', 'Eliminar ventas', true
      WHERE NOT EXISTS (SELECT 1 FROM permiso WHERE nombre = 'PAGOS.ELIMINAR')
    `);
  }
}
