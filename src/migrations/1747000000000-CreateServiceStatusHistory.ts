import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateServiceStatusHistory1747000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE historial_estado_servicio (
        id_historial SERIAL PRIMARY KEY,
        id_detalle   INTEGER   NOT NULL REFERENCES detalle_venta(id_detalle) ON DELETE CASCADE,
        id_estado    INTEGER   NOT NULL REFERENCES estado_servicio(id_estado),
        fecha        TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_historial_estado_servicio_detalle ON historial_estado_servicio(id_detalle)
    `);

    // Backfill: una entrada por cada DetalleVenta existente con su estado
    // actual, para que el historial no arranque vacío en registros previos.
    await queryRunner.query(`
      INSERT INTO historial_estado_servicio (id_detalle, id_estado, fecha)
      SELECT id_detalle, id_estado, fecha
      FROM detalle_venta
      WHERE id_estado IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE historial_estado_servicio`);
  }
}
