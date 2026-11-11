import { it, expect } from "vitest";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  copyFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
it("upgrades a populated pre-agent schema, preserves historical records, and replays without duplicates", async () => {
  const base = new URL(process.env.MIGRATION_DATABASE_URL!);
  if (!base.pathname.endsWith("_test"))
    throw new Error("Dedicated test database required");
  const admin = new Pool({ connectionString: base.toString() });
  const database = `ruleloop_schema_test_${Date.now()}`;
  let fresh: Pool | undefined;
  const oldMigrations = await mkdtemp(join(tmpdir(), "ruleloop-before-agent-"));
  try {
    await admin.query(`CREATE DATABASE "${database}"`);
    base.pathname = "/" + database;
    fresh = new Pool({ connectionString: base.toString() });
    const journal = JSON.parse(
      await readFile("drizzle/meta/_journal.json", "utf8"),
    );
    journal.entries = journal.entries.filter(
      (entry: { idx: number }) => entry.idx < 2,
    );
    await mkdir(join(oldMigrations, "meta"));
    await writeFile(
      join(oldMigrations, "meta/_journal.json"),
      JSON.stringify(journal),
    );
    for (const entry of journal.entries)
      await copyFile(
        `drizzle/${entry.tag}.sql`,
        join(oldMigrations, `${entry.tag}.sql`),
      );
    await migrate(drizzle(fresh), { migrationsFolder: oldMigrations });
    await fresh.query('INSERT INTO "user" (id,name,email) VALUES ($1,$1,$2)', [
      "legacy-synthetic",
      "legacy-synthetic@ruleloop.test",
    ]);
    const legacyEvent = (
      await fresh.query(
        'INSERT INTO event_cases ("userId",title) VALUES ($1,$2) RETURNING id',
        ["legacy-synthetic", "Synthetic history, do not infer source"],
      )
    ).rows[0].id;
    const legacyReview = (
      await fresh.query(
        'INSERT INTO event_reviews ("userId",event_id,what_happened,root_cause) VALUES ($1,$2,$3,$4) RETURNING id',
        [
          "legacy-synthetic",
          legacyEvent,
          "Existing incomplete source",
          "over_confidence",
        ],
      )
    ).rows[0].id;
    const legacyRule = (
      await fresh.query(
        'INSERT INTO confirmation_rules ("userId",rule_text,is_active,status) VALUES ($1,$2,true,$3) RETURNING id',
        ["legacy-synthetic", "Existing rule without proven origin", "draft"],
      )
    ).rows[0].id;
    const legacySnapshot = JSON.stringify({
      schemaVersion: 1,
      calculatedAt: "2026-09-01T00:00:00.000Z",
      input: {
        currency: "USD",
        amountMinor: 12_000,
        toCnyRate: "7.000000",
        cnyAmountMinor: 84_000,
      },
      items: [],
    });
    const legacyConversion = (
      await fresh.query(
        `INSERT INTO spend_conversions (
           "userId", decision_stage, input_currency, planned_amount_minor,
           input_to_cny_rate, snapshot_json, resolution, actual_amount_minor,
           protected_amount_minor, redirected_amount_minor, resolved_at
         ) VALUES ($1, 'considering', 'USD', 12000, '7.000000', $2, 'partial', 5000, 7000, 3000, now())
         RETURNING id`,
        ["legacy-synthetic", legacySnapshot],
      )
    ).rows[0].id;
    await migrate(drizzle(fresh), { migrationsFolder: "drizzle" });
    await migrate(drizzle(fresh), { migrationsFolder: "drizzle" });
    expect(
      (
        await fresh.query(
          "SELECT linked_rule_id FROM event_reviews WHERE id=$1",
          [legacyReview],
        )
      ).rows[0],
    ).toEqual({ linked_rule_id: null });
    expect(
      (
        await fresh.query(
          "SELECT rule_text,source_id,is_active,status FROM confirmation_rules WHERE id=$1",
          [legacyRule],
        )
      ).rows[0],
    ).toEqual({
      rule_text: "Existing rule without proven origin",
      source_id: null,
      is_active: true,
      status: "draft",
    });
    expect(
      (
        await fresh.query(
          `SELECT input_currency, planned_amount_minor, input_to_cny_rate,
                  snapshot_json, outcome_amounts_in_cny,
                  actual_amount_minor::text, protected_amount_minor::text,
                  redirected_amount_minor::text,
                  pg_typeof(actual_amount_minor)::text AS actual_amount_type,
                  pg_typeof(protected_amount_minor)::text AS protected_amount_type,
                  pg_typeof(redirected_amount_minor)::text AS redirected_amount_type
           FROM spend_conversions WHERE id=$1`,
          [legacyConversion],
        )
      ).rows[0],
    ).toEqual({
      input_currency: "USD",
      planned_amount_minor: 12_000,
      input_to_cny_rate: "7.000000",
      snapshot_json: legacySnapshot,
      outcome_amounts_in_cny: false,
      actual_amount_minor: "5000",
      protected_amount_minor: "7000",
      redirected_amount_minor: "3000",
      actual_amount_type: "bigint",
      protected_amount_type: "bigint",
      redirected_amount_type: "bigint",
    });
    expect(
      (
        await fresh.query(
          "SELECT count(*)::int n FROM pg_tables WHERE schemaname='public'",
        )
      ).rows[0].n,
    ).toBe(67);
    expect(
      (
        await fresh.query(
          "SELECT count(*)::int n FROM drizzle.__drizzle_migrations",
        )
      ).rows[0].n,
    ).toBe(6);
    expect(
      (
        await fresh.query(
          "SELECT count(*)::int n FROM pg_policies WHERE schemaname='public'",
        )
      ).rows[0].n,
    ).toBe(65);
  } finally {
    await fresh?.end();
    await admin.query(`DROP DATABASE IF EXISTS "${database}"`);
    await admin.end();
    await rm(oldMigrations, { recursive: true, force: true });
  }
});
