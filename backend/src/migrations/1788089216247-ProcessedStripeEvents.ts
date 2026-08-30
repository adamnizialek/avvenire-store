import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProcessedStripeEvents1788089216247 implements MigrationInterface {
  name = 'ProcessedStripeEvents1788089216247';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "processed_stripe_events" ("id" character varying NOT NULL, "type" character varying NOT NULL, "processedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_219d43b789e772d07e8947937b2" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "processed_stripe_events"`);
  }
}
