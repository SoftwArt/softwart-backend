import { MigrationInterface, QueryRunner } from "typeorm";

// 6 de los 9 permisos de "cambiar estado" quedaron sembrados como
// "<MODULO>.TOGGLE_ESTADO" (Clientes, Ventas, Marcos, Servicios, Usuarios,
// Roles) y los otros 3 como "<MODULO>.CAMBIAR_ESTADO" (Citas, Pedidos,
// Pagos) — mismo concepto, dos nombres distintos, visible en el panel de
// Permisos por Rol (getAccion() en el frontend deriva la etiqueta
// directamente del nombre del permiso, sin traducir). Se unifica todo a
// CAMBIAR_ESTADO. UPDATE en vez de borrar+re-sembrar para conservar el
// mismo id_permiso y no perder las asignaciones permiso_rol ya hechas.
export class UnifyToggleEstadoPermissionNames1759000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE permiso
      SET nombre = REPLACE(nombre, '.TOGGLE_ESTADO', '.CAMBIAR_ESTADO')
      WHERE nombre LIKE '%.TOGGLE_ESTADO'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE permiso
      SET nombre = REPLACE(nombre, '.CAMBIAR_ESTADO', '.TOGGLE_ESTADO')
      WHERE nombre IN (
        'CLIENTES.CAMBIAR_ESTADO', 'VENTAS.CAMBIAR_ESTADO', 'MARCOS.CAMBIAR_ESTADO',
        'SERVICIOS.CAMBIAR_ESTADO', 'USUARIOS.CAMBIAR_ESTADO', 'ROLES.CAMBIAR_ESTADO'
      )
    `);
  }
}
