import { MigrationInterface, QueryRunner } from "typeorm";

// registerGuest permitía telefono opcional en el schema (guestClientSchema)
// pero la columna era NOT NULL — cualquier registro sin teléfono terminaba
// en un 500 al intentar insertar null. La columna nunca debió ser obligatoria:
// registerGuest/guestAppointment ya envían `telefono ?? null` esperando que
// la BD lo acepte.
export class MakeClientTelefonoNullable1761000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cliente
      ALTER COLUMN telefono DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE cliente SET telefono = '' WHERE telefono IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE cliente
      ALTER COLUMN telefono SET NOT NULL
    `);
  }
}
