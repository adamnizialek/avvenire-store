import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline generated from the entities as of 2026-08-30.
 *
 * The production database was originally created by DB_SYNCHRONIZE, so this
 * migration must be a clean no-op there: every statement is guarded with
 * IF NOT EXISTS (constraint names are TypeORM's deterministic hashes, so the
 * guards match the synchronize-created schema exactly). On a fresh database
 * it creates the full schema.
 */
export class Baseline1788088720761 implements MigrationInterface {
  name = 'Baseline1788088720761';

  private async addForeignKeyIfMissing(
    queryRunner: QueryRunner,
    constraintName: string,
    sql: string,
  ): Promise<void> {
    const [{ exists }] = (await queryRunner.query(
      `SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conname = $1) AS "exists"`,
      [constraintName],
    )) as { exists: boolean }[];
    if (!exists) {
      await queryRunner.query(sql);
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text NOT NULL, "price" numeric(10,2) NOT NULL, "category" character varying NOT NULL DEFAULT 'clothing', "inventory" text NOT NULL DEFAULT '[]', "images" text NOT NULL DEFAULT '[]', "stripePriceId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_c3932231d2385ac248d0888d95" ON "products" ("category")`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" uuid NOT NULL, "productId" uuid NOT NULL, "quantity" integer NOT NULL, "price" numeric(10,2) NOT NULL, "size" character varying, CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_f1d359a55923bb45b057fbdab0" ON "order_items" ("orderId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_cdb99c05982d5191ac8465ac01" ON "order_items" ("productId")`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "totalAmount" numeric(10,2) NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "stripeSessionId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_151b79a83ba240b0cb31b2302d" ON "orders" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_178e0a88de0a59d8afc1d093db" ON "orders" ("stripeSessionId")`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'user', "tokenVersion" integer NOT NULL DEFAULT '0', "resetToken" character varying, "resetTokenExpiry" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      'FK_f1d359a55923bb45b057fbdab0d',
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      'FK_cdb99c05982d5191ac8465ac010',
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_cdb99c05982d5191ac8465ac010" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      'FK_151b79a83ba240b0cb31b2302d1',
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_cdb99c05982d5191ac8465ac010"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_178e0a88de0a59d8afc1d093db"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_151b79a83ba240b0cb31b2302d"`,
    );
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cdb99c05982d5191ac8465ac01"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f1d359a55923bb45b057fbdab0"`,
    );
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c3932231d2385ac248d0888d95"`,
    );
    await queryRunner.query(`DROP TABLE "products"`);
  }
}
