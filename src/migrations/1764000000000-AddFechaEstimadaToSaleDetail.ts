import { MigrationInterface, QueryRunner } from "typeorm";

// Fecha estimada de finalización del servicio (detalle_venta). Se sugiere en
// el frontend a partir de fecha + duracion del Service elegido, pero queda
// editable para plazos mayores — por eso nullable (no todos los detalles
// existentes tienen una).
export class AddFechaEstimadaToSaleDetail1764000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE detalle_venta
      ADD COLUMN fecha_estimada DATE NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE detalle_venta
      DROP COLUMN fecha_estimada
    `);
  }
}
