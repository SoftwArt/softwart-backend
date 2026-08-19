import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAdminLegalAcceptanceTrace1763000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE contexto_aceptacion
      ADD VALUE IF NOT EXISTS 'REGISTRO_ADMIN'
    `);

    await queryRunner.query(`
      ALTER TABLE aceptacion_legal
      ADD COLUMN IF NOT EXISTS id_usuario_actor INTEGER
        REFERENCES usuario (id_usuario) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE aceptacion_legal
      DROP COLUMN IF EXISTS id_usuario_actor
    `);

    // PostgreSQL no permite eliminar de forma segura un valor de un enum
    // compartido; se conserva REGISTRO_ADMIN para evitar pérdida de datos.
  }
}