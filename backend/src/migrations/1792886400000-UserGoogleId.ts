import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserGoogleId1792886400000 implements MigrationInterface {
  name = 'UserGoogleId1792886400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "googleId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_f382af58ab36057334fb262efd5" UNIQUE ("googleId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_f382af58ab36057334fb262efd5"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "googleId"`);
  }
}
