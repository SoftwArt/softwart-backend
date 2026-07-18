import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMotivoCancelacionToAppointment1748000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cita
      ADD COLUMN motivo_cancelacion VARCHAR NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cita
      DROP COLUMN motivo_cancelacion
    `);
  }
}
