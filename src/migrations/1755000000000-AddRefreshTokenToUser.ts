import { MigrationInterface, QueryRunner } from "typeorm";

// Sliding expiration: el refresh token es opaco (no un JWT) y se guarda
// hasheado (SHA-256), mismo criterio que token_recuperacion — nunca el
// plaintext en BD. Un solo token activo por usuario, se rota en cada refresh.
export class AddRefreshTokenToUser1755000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE usuario
      ADD COLUMN refresh_token_hash VARCHAR NULL,
      ADD COLUMN refresh_token_expira TIMESTAMP NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE usuario
      DROP COLUMN refresh_token_hash,
      DROP COLUMN refresh_token_expira
    `);
  }
}
