import { MigrationInterface, QueryRunner } from "typeorm";

// Baseline migration — schema already existed in production via synchronize.
// This file marks the starting point; future migrations go below this one.
export class InitialBaseline1745000000000 implements MigrationInterface {
  public async up(_queryRunner: QueryRunner): Promise<void> {}
  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
