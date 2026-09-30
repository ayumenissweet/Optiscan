import { MigrationInterface, QueryRunner } from "typeorm";

export class BrandEntity1730000000000 implements MigrationInterface {
  name = "BrandEntity1730000000000";

  public async up(q: QueryRunner): Promise<void> {
    // Fresh install (no old table): nothing to convert.
    const batch = await q.getTable("batch");
    if (!batch) return;
    // Already converted: do nothing.
    if (batch.findColumnByName("brandName")) return;

    // 1. brand table + the 3 original brands
    await q.query(
      `CREATE TABLE IF NOT EXISTS "lens_brand" ("name" varchar PRIMARY KEY NOT NULL)`,
    );
    await q.query(
      `INSERT OR IGNORE INTO "lens_brand" ("name") VALUES ('Soleko'), ('Cornelia'), ('Versa View')`,
    );
    // 2. anything else that exists in old batches (safety net)
    await q.query(
      `INSERT OR IGNORE INTO "lens_brand" ("name")
       SELECT DISTINCT "brand" FROM "batch" WHERE "brand" IS NOT NULL`,
    );

    // 3. rebuild batch with the FK column
    await q.query(`
      CREATE TABLE "temporary_batch" (
        "id" varchar PRIMARY KEY NOT NULL,
        "code" integer,
        "status" varchar CHECK ("status" IN ('Draft','Sent','Received')) NOT NULL DEFAULT ('Draft'),
        "created_at" date NOT NULL DEFAULT (datetime('now')),
        "exported_at" date NOT NULL DEFAULT (datetime('now')),
        "brandName" varchar,
        CONSTRAINT "FK_batch_brand" FOREIGN KEY ("brandName")
          REFERENCES "lens_brand" ("name") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await q.query(`
      INSERT INTO "temporary_batch" ("id","code","status","created_at","exported_at","brandName")
      SELECT "id","code","status","created_at","exported_at","brand" FROM "batch"
    `);
    await q.query(`DROP TABLE "batch"`);
    await q.query(`ALTER TABLE "temporary_batch" RENAME TO "batch"`);
  }

  public async down(): Promise<void> {
    throw new Error("Irreversible migration");
  }
}
