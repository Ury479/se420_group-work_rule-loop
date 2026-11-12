import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import { db, pool, withAccountDatabase } from "@/db";
import { identity } from "./identity";
import mapping from "../docs/upgrade/relationships.json";
import * as events from "@/app/actions/event-library";
import * as confirmations from "@/app/actions/confirmations";
import * as evidence from "@/app/actions/evidence-review";
import * as rules from "@/app/actions/rules";
import * as tasks from "@/app/actions/tree-tasks";
import * as entropy from "@/app/actions/entropy-principles";
import * as preferences from "@/app/actions/preferences";
import * as conversion from "@/app/actions/spend-conversion";
import * as rhythm from "@/app/actions/rhythm";
import * as lifespan from "@/app/actions/lifespan";
import * as mind from "@/app/actions/mind-regulation";
import * as people from "@/app/actions/people-resources";
import * as resources from "@/app/actions/resources";
import * as relationships from "@/app/actions/relationships";
import * as boundaries from "@/app/actions/boundaries";
import * as weakness from "@/app/actions/weakness";
import * as entertainment from "@/app/actions/entertainment";
import * as spending from "@/app/actions/spending-review";
import * as trigger from "@/app/actions/experience-trigger";
import * as archive from "@/app/actions/archive";
import { habitCommandSchema, type HabitCommand } from "@/lib/habit-domain";
import { applyHabitCommand, readHabitDashboard } from "@/lib/habit-store";
import {
  getConversionCnyAmounts,
  parseSnapshot,
  RESOLUTION_LABEL,
  type Resolution,
} from "@/lib/convert-domain";
import {
  createConfirmationSchema,
  evidenceSchema,
  quickScreenSchema,
} from "@/lib/validation";

const admin = new Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
const quote = (s: string) => '"' + s.replaceAll('"', '""') + '"';
const configs = Object.values(schema)
  .map((t) => getTableConfig(t as PgTable))
  .filter(
    (c) => !["user", "account", "session", "verification"].includes(c.name),
  );
const fixtureIds = new Map<string, number | string>();
async function fixture(
  table: string,
  userId: string,
  fresh = false,
): Promise<number | string> {
  const key = `${userId}:${table}`;
  const existing = fixtureIds.get(key);
  if (existing && !fresh) return existing;
  const config = configs.find((c) => c.name === table)!;
  const values: Record<string, unknown> = { userId };
  if (table === "spending_review_jobs") {
    values.review_id = await fixture("spending_reviews", userId, fresh);
    values.payload = {};
  }
  for (const column of config.columns) {
    if (column.name in values || !column.notNull || column.hasDefault)
      continue;
    const relation = mapping.relations.find(
      (r) => r[0] === table && r[1] === column.name,
    );
    values[column.name] = relation
      ? await fixture(relation[2], userId)
      : column.dataType === "number"
        ? 1
        : column.dataType === "boolean"
          ? false
          : column.dataType === "date"
            ? new Date()
            : `${table}-${column.name}-${userId}-${randomUUID()}`;
  }
  const keys = Object.keys(values);
  const idColumn = table === "spending_review_jobs" ? "review_id" : "id";
  const result = await admin.query(
    `INSERT INTO ${quote(table)} (${keys.map(quote)}) VALUES (${keys.map((_, i) => "$" + (i + 1))}) RETURNING ${quote(idColumn)} AS id`,
    Object.values(values),
  );
  const id = result.rows[0].id;
  if (!fresh) fixtureIds.set(key, id);
  return id;
}
async function asAccount<T>(
  id: string,
  run: (client: PoolClient) => Promise<T>,
) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.user_id',$1,true)", [id]);
    return await run(c);
  } finally {
    await c.query("ROLLBACK");
    c.release();
  }
}
function successful<T extends object>(value: T): Exclude<T, { error: string }> {
  expect(value).not.toHaveProperty("error");
  return value as Exclude<T, { error: string }>;
}
beforeAll(async () => {
  if (!new URL(process.env.DATABASE_URL!).pathname.endsWith("_test"))
    throw new Error("Tests require a dedicated _test database");
  await admin.query('TRUNCATE "user" CASCADE');
  for (const id of [
    "test-account-a",
    "test-account-b",
    "policy-a",
    "policy-b",
    "test-conversion-defaults-a",
    "test-conversion-defaults-b",
    "test-inline-comparison-a",
    "test-inline-comparison-b",
    "test-conversion-outcomes",
    "test-conversion-legacy",
    "test-conversion-evidence",
    "test-home-task-owner",
    "test-home-task-other",
    "test-task-timing",
    "test-near-term-owner",
    "test-near-term-other",
    "test-birth-date-owner",
    "test-birth-date-other",
    "test-habits-owner",
    "test-habits-other",
    "test-habits-constraints",
    "test-habits-calendar",
  ])
    await admin.query('INSERT INTO "user" (id,name,email) VALUES ($1,$1,$2)', [
      id,
      `${id}@ruleloop.test`,
    ]);
  for (const c of configs) {
    await fixture(c.name, "policy-a");
    await fixture(c.name, "policy-b");
  }
});
beforeEach(() => {
  identity.userId = "test-account-a";
});
afterAll(async () => {
  await admin.end();
  await pool.end();
});

describe("all business tables enforce account isolation", () => {
  it("uses 67 tables, 63 forced RLS policies and an unprivileged runtime role", async () => {
    expect(configs).toHaveLength(63);
    const roles = await pool.query(
      "SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
    );
    expect(roles.rows[0]).toEqual({ rolsuper: false, rolbypassrls: false });
    const result = await admin.query(
      "SELECT count(*)::int n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relrowsecurity AND c.relforcerowsecurity",
    );
    expect(result.rows[0].n).toBe(63);
  });
  it.each(configs.map((c) => c.name))(
    "%s hides other accounts, rejects forged owners and unscoped reads",
    async (table) => {
      const other = fixtureIds.get(`policy-b:${table}`);
      const idColumn = table === "spending_review_jobs" ? "review_id" : "id";
      await asAccount("policy-a", async (c) => {
        expect(
          (await c.query(`SELECT ${idColumn} FROM ${quote(table)}`)).rows,
        ).toHaveLength(1);
        expect(
          (await c.query(`SELECT ${idColumn} FROM ${quote(table)} WHERE ${idColumn}=$1`, [other]))
            .rows,
        ).toHaveLength(0);
        expect(
          (await c.query(`DELETE FROM ${quote(table)} WHERE ${idColumn}=$1`, [other]))
            .rowCount,
        ).toBe(0);
      });
      await expect(
        asAccount("policy-a", (c) =>
          c.query(`UPDATE ${quote(table)} SET "userId"='policy-b'`),
        ),
      ).rejects.toMatchObject({ code: "42501" });
      expect(
        (await pool.query(`SELECT ${idColumn} FROM ${quote(table)}`)).rows,
      ).toHaveLength(0);
    },
  );
  it.each(mapping.relations)(
    "%s.%s rejects a foreign account parent",
    async (child, column, parent) => {
      const foreignParent = await fixture(parent, "policy-b", true);
      await expect(
        asAccount("policy-a", (c) =>
          c.query(
            `UPDATE ${quote(child)} SET ${quote(column)}=$1 WHERE id=$2`,
            [foreignParent, fixtureIds.get(`policy-a:${child}`)],
          ),
        ),
      ).rejects.toMatchObject({ code: "23503" });
    },
  );
  it("rejects polymorphic cross-account references", async () => {
    await expect(
      asAccount("policy-a", (c) =>
        c.query(
          "UPDATE unified_cards SET context_type=$1,context_id=$2 WHERE id=$3",
          [
            "boundary",
            fixtureIds.get("policy-b:execution_boundaries"),
            fixtureIds.get("policy-a:unified_cards"),
          ],
        ),
      ),
    ).rejects.toMatchObject({ code: "23503" });
  });
  it("requires identity and rolls back throws and structured failures", async () => {
    expect(() => db.select()).toThrow("authenticated transaction");
    await expect(
      withAccountDatabase("test-account-a", async () => {
        await db
          .insert(schema.demands)
          .values({ userId: "test-account-a", title: "rollback-marker" });
        throw new Error("injected failure");
      }),
    ).rejects.toThrow("injected failure");
    await withAccountDatabase("test-account-a", async () => {
      await db
        .insert(schema.demands)
        .values({ userId: "test-account-a", title: "rollback-marker" });
      return { error: "rejected" };
    });
    expect(
      (
        await admin.query(
          "SELECT id FROM demands WHERE title='rollback-marker'",
        )
      ).rows,
    ).toHaveLength(0);
    identity.userId = null;
    await expect(events.getEventCases()).rejects.toThrow("Unauthorized");
  });
});

describe("real server action workflows", () => {
  it("records an event, reviews it, creates a draft rule, and preserves the rule after event deletion", async () => {
    const created = successful(
      await events.createEventCase({
        title: "复盘回归事件",
        eventType: "study",
        scene: "classroom",
        status: "solved",
        impactLevel: "high",
      }),
    );
    expect(created.eventCase).toBeDefined();
    const id = created.eventCase!.id;
    successful(
      await events.submitMiniReview({
        eventId: id,
        whatHappened: "提交前未检查版本",
        rootCause: "leaving_without_checking",
        prevention: "先核对版本",
        newRuleText: "提交前核对最终版本",
      }),
    );
    expect((await events.getEventCase(id))?.eventCase.reviewed).toBe(true);
    expect(
      (await rules.getRules()).some((r) => r.ruleText === "提交前核对最终版本"),
    ).toBe(true);
    const duplicate = await events.submitMiniReview({
      eventId: id,
      whatHappened: "重复提交",
      rootCause: "leaving_without_checking",
    });
    expect(duplicate).toHaveProperty("error");
    successful(await events.deleteEventCase(id));
    expect(await events.getEventCase(id)).toBeNull();
    expect(
      (await rules.getRules()).some((r) => r.ruleText === "提交前核对最终版本"),
    ).toBe(true);
  });
  it("validates required confirmation items, saves evidence and clears children on deletion", async () => {
    const r = successful(
      await confirmations.createConfirmation(
        createConfirmationSchema.parse({
          title: "确认链路",
          domain: "study",
          riskLevel: "high",
        }),
      ),
    );
    const id = r.id!;
    expect(await confirmations.completeCheck(id)).toHaveProperty("error");
    for (const item of await confirmations.getConfirmationItems(id))
      await confirmations.toggleItem(item.id, true);
    expect(await confirmations.completeCheck(id)).toEqual({ next: "evidence" });
    successful(
      await evidence.saveEvidence(
        evidenceSchema.parse({
          confirmationId: id,
          evidenceType: "text",
          evidenceText: "已核对",
        }),
      ),
    );
    expect((await confirmations.getConfirmation(id))?.status).toBe("confirmed");
    identity.userId = "test-account-b";
    expect(await confirmations.getConfirmation(id)).toBeNull();
    await expect(
      evidence.saveEvidence(
        evidenceSchema.parse({
          confirmationId: id,
          evidenceType: "text",
          evidenceText: "越权证据",
        }),
      ),
    ).rejects.toThrow();
    identity.userId = "test-account-a";
    await confirmations.deleteConfirmation(id);
    expect(
      (
        await admin.query(
          "SELECT id FROM confirmation_evidence WHERE confirmation_id=$1",
          [id],
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("initializes catalogs and preferences once under concurrent requests and computes a real conversion", async () => {
    await Promise.all([
      conversion.getCatalogItems(),
      conversion.getCatalogItems(),
      conversion.getConversionPreferences(),
      conversion.getConversionPreferences(),
    ]);
    const items = await conversion.getCatalogItems();
    expect(new Set(items.map((i) => i.name)).size).toBe(items.length);
    expect(
      (
        await admin.query(
          'SELECT id FROM conversion_preferences WHERE "userId"=$1',
          ["test-account-a"],
        )
      ).rows,
    ).toHaveLength(1);
    const result = successful(
      await conversion.createSpendConversion({
        decisionStage: "considering",
        inputCurrency: "CNY",
        plannedAmountMinor: 10000,
        catalogItemIds: [items[0].id],
        privacyLabel: "购物",
        sensitiveLabel: null,
      }),
    );
    expect(result.id).toBeTypeOf("number");
    expect(await conversion.getConversion(result.id!)).not.toBeNull();
  });
  it("preserves conversion item order and rejects unavailable or duplicate selections atomically", async () => {
    const [first, second] = await conversion.getEnabledCatalogItems();
    const [foreign] = await withAccountDatabase(
      "test-account-b",
      conversion.getEnabledCatalogItems,
    );
    const catalogItemIds = [second.id, first.id];
    const input = {
      decisionStage: "considering",
      inputCurrency: "CNY",
      plannedAmountMinor: 80000,
      catalogItemIds,
      privacyLabel: "购物",
      sensitiveLabel: null,
    } as const;
    const saved = successful(await conversion.createSpendConversion(input));
    const detail = await conversion.getConversion(saved.id!);
    expect(
      parseSnapshot(detail!.snapshotJson)?.items.map(
        (item) => item.catalogItemId,
      ),
    ).toEqual(catalogItemIds);
    const before = (await conversion.getConversions()).map((row) => row.id);

    successful(await conversion.toggleCatalogItem(second.id, false));
    try {
      for (const invalidId of [foreign.id, second.id, 2_147_483_647]) {
        expect(
          await conversion.createSpendConversion({
            ...input,
            catalogItemIds: [first.id, invalidId],
          }),
        ).toEqual({ error: "部分比较项不可用，请重新选择" });
      }
      expect(
        await conversion.createSpendConversion({
          ...input,
          catalogItemIds: [first.id, first.id],
        }),
      ).toEqual({ error: "比较项不能重复" });
      expect(
        await conversion.createSpendConversion({
          ...input,
          catalogItemIds: [first.id, 2_147_483_648],
        }),
      ).toEqual({ error: "比较项编号无效" });
      expect((await conversion.getConversions()).map((row) => row.id)).toEqual(
        before,
      );
    } finally {
      successful(await conversion.toggleCatalogItem(second.id, true));
    }
  });
  it("settles USD outcomes with the saved rate and retains actual CNY payments", async () => {
    identity.userId = "test-conversion-outcomes";
    const [item] = await conversion.getEnabledCatalogItems();
    const create = async (
      plannedAmountMinor: number,
      decisionStage: "considering" | "spent" = "considering",
    ) => {
      const { id } = successful(
        await conversion.createSpendConversion({
          decisionStage,
          inputCurrency: "USD",
          plannedAmountMinor,
          catalogItemIds: [item.id],
          privacyLabel: "购物",
          sensitiveLabel: null,
        }),
      );
      expect(id).toBeTypeOf("number");
      return id!;
    };
    const partialId = await create(12_000);
    const explicitPaidId = await create(12_000);
    const implicitPaidId = await create(12_000);
    const alreadySpentId = await create(12_000, "spent");
    const largeId = await create(1_000_000_000);
    successful(
      await conversion.updateConversionPreferences({
        usdToCnyRate: "8.000000",
        defaultCooldownMinutes: 120,
        highImpactThresholdMinor: 100_000,
        privacyMode: "neutral",
      }),
    );

    const partial = {
      conversionId: partialId,
      resolution: "partial",
      actualAmountMinor: 40_000,
      redirectedAmountMinor: 30_000,
      redirectTarget: "训练预算",
    } as const;
    expect(await conversion.resolveSpendConversion(partial)).toHaveProperty(
      "error",
    );
    expect(
      await conversion.resolveSpendConversion({
        ...partial,
        expectedPlannedCnyMinor: 96_000,
      }),
    ).toHaveProperty("error");
    expect(await conversion.getConversion(partialId)).toMatchObject({
      resolution: null,
      outcomeAmountsInCny: false,
    });
    successful(
      await conversion.resolveSpendConversion({
        ...partial,
        expectedPlannedCnyMinor: 84_000,
      }),
    );
    expect(await conversion.getConversion(partialId)).toMatchObject({
      actualAmountMinor: 40_000,
      protectedAmountMinor: 44_000,
      redirectedAmountMinor: 30_000,
      outcomeAmountsInCny: true,
    });

    // This exact numeric match is a confirmed yuan payment in a new outcome.
    successful(
      await conversion.resolveSpendConversion({
        conversionId: explicitPaidId,
        resolution: "spent",
        actualAmountMinor: 12_000,
        expectedPlannedCnyMinor: 84_000,
        redirectedAmountMinor: 0,
        redirectTarget: null,
      }),
    );
    successful(
      await conversion.resolveSpendConversion({
        conversionId: implicitPaidId,
        resolution: "spent",
        actualAmountMinor: null,
        expectedPlannedCnyMinor: 84_000,
        redirectedAmountMinor: 0,
        redirectTarget: null,
      }),
    );
    const explicit = await conversion.getConversion(explicitPaidId);
    const implicit = await conversion.getConversion(implicitPaidId);
    expect(getConversionCnyAmounts(explicit!).actualCnyMinor).toBe(12_000);
    expect(getConversionCnyAmounts(implicit!).actualCnyMinor).toBe(84_000);
    expect(
      await conversion.resolveSpendConversion({
        conversionId: alreadySpentId,
        resolution: "avoided",
        actualAmountMinor: null,
        expectedPlannedCnyMinor: 84_000,
        redirectedAmountMinor: 0,
        redirectTarget: null,
      }),
    ).toHaveProperty("error");

    successful(
      await conversion.resolveSpendConversion({
        conversionId: largeId,
        resolution: "avoided",
        actualAmountMinor: null,
        expectedPlannedCnyMinor: 7_000_000_000,
        redirectedAmountMinor: 3_000_000_000,
        redirectTarget: null,
      }),
    );
    expect(await conversion.getConversion(largeId)).toMatchObject({
      protectedAmountMinor: 7_000_000_000,
      redirectedAmountMinor: 3_000_000_000,
    });
    expect(await conversion.getConversionSummary()).toMatchObject({
      historySpentMinor: BigInt(220_000),
      historySpentUncertainCount: 0,
    });
  });
  it("recalculates legacy USD protection and leaves ambiguous payments out of spending totals", async () => {
    identity.userId = "test-conversion-legacy";
    const { rows } = await admin.query<{ id: number }>(
      `INSERT INTO spend_conversions (
         "userId", decision_stage, input_currency, planned_amount_minor,
         input_to_cny_rate, snapshot_json, resolution, actual_amount_minor,
         protected_amount_minor, redirected_amount_minor, resolved_at
       ) VALUES
         ($1, 'considering', 'USD', 12000, '7.000000', '{}', 'partial', 5000, 7000, 3000, now()),
         ($1, 'considering', 'USD', 12000, '7.000000', '{}', 'spent', 12000, 0, 0, now())
       RETURNING id`,
      [identity.userId],
    );
    const partial = await conversion.getConversion(rows[0].id);
    const spent = await conversion.getConversion(rows[1].id);
    expect(getConversionCnyAmounts(partial!)).toMatchObject({
      plannedCnyMinor: 84_000,
      actualCnyMinor: 5_000,
      protectedCnyMinor: 79_000,
    });
    expect(getConversionCnyAmounts(spent!)).toMatchObject({
      plannedCnyMinor: 84_000,
      actualCnyMinor: null,
      protectedCnyMinor: 0,
    });
    expect(await conversion.getConversionSummary()).toMatchObject({
      historySpentMinor: BigInt(5_000),
      historySpentUncertainCount: 1,
    });
    const timeline = await archive.getArchiveTimeline("verify");
    expect(
      timeline.find((entry) => entry.href === `/convert/${rows[0].id}`)?.title,
    ).toContain("¥790");
  });
  it("records conversion outcomes without treating a rule association as validation", async () => {
    identity.userId = "test-conversion-evidence";
    const [item] = await conversion.getEnabledCatalogItems();
    const settle = async (
      resolution: Resolution,
      actualAmountMinor: number | null = null,
    ) => {
      const { id } = successful(
        await conversion.createSpendConversion({
          decisionStage: "considering",
          inputCurrency: "CNY",
          plannedAmountMinor: 80_000,
          catalogItemIds: [item.id],
          privacyLabel: "购物",
          sensitiveLabel: null,
        }),
      );
      expect(id).toBeTypeOf("number");
      const { ruleId } = successful(await conversion.linkConversionRule(id!));
      successful(
        await conversion.resolveSpendConversion({
          conversionId: id!,
          resolution,
          actualAmountMinor,
          redirectedAmountMinor: 0,
          redirectTarget: null,
        }),
      );
      return { id, ruleId };
    };

    const avoided = await settle("avoided");
    expect(await conversion.getConversion(avoided.id!)).toMatchObject({
      ruleId: avoided.ruleId,
      cooldownEndsAt: null,
      protectedAmountMinor: 80_000,
    });
    const partial = await settle("partial", 80_000);
    expect(await conversion.getConversion(partial.id!)).toMatchObject({
      actualAmountMinor: 80_000,
      protectedAmountMinor: 0,
    });
    const unknown = await settle("unknown");
    expect(await rules.getRule(avoided.ruleId!)).toMatchObject({
      validatedCount: 0,
      helpfulCount: 0,
    });

    expect(await archive.getArchiveStats()).toMatchObject({
      spendBelowPlanCount: 1,
    });
    const timeline = await archive.getArchiveTimeline("verify");
    expect(timeline).toHaveLength(2);
    for (const [record, resolution] of [
      [avoided, "avoided"],
      [partial, "partial"],
    ] as const) {
      expect(
        timeline.find((entry) => entry.href === `/convert/${record.id}`),
      ).toMatchObject({
        subtitle: `消费决定 · ${RESOLUTION_LABEL[resolution]}`,
        sourceBadge: null,
      });
    }
    expect(
      timeline.some((entry) => entry.href === `/convert/${unknown.id}`),
    ).toBe(false);

    await admin.query(
      'UPDATE confirmation_rules SET helpful_count = 1 WHERE id = $1 AND "userId" = $2',
      [avoided.ruleId, identity.userId],
    );
    expect((await archive.getArchiveStats()).effectiveRules).toBe(0);
    const feedbackSession = (
      await admin.query<{ id: number }>(
        `INSERT INTO trigger_sessions
           ("userId", scene_type, scene_summary, matched_rule_ids, user_choice, status, idempotency_key)
         VALUES ($1, 'spending', '换算后调整决定', $2, 'adjust', 'decided', $3)
         RETURNING id`,
        [identity.userId, JSON.stringify([avoided.ruleId]), randomUUID()],
      )
    ).rows[0];
    successful(await trigger.openTriggerValidation(feedbackSession.id));
    successful(
      await trigger.submitChoiceValidation({
        sessionId: feedbackSession.id,
        actualOutcome: "对照预算后保留了原来的资金计划",
        costDelta: 0,
        emotionDelta: 0,
        decisionQuality: "better",
        ruleHelpfulness: "helpful",
        followupAction: "keep",
      }),
    );
    expect((await archive.getArchiveStats()).effectiveRules).toBe(1);
  });
  it("stores two ordered comparison defaults per account and reports invalid saved choices", async () => {
    identity.userId = "test-conversion-defaults-a";
    const otherAccount = "test-conversion-defaults-b";
    expect(await conversion.getDefaultConversionPreviewData()).toEqual({
      items: [],
      usdToCnyRate: "7.000000",
      defaultsUnavailable: false,
    });
    const { rows } = await admin.query(
      `SELECT EXISTS (SELECT 1 FROM conversion_preferences WHERE "userId" = $1) AS preferences,
              EXISTS (SELECT 1 FROM spending_anchors WHERE "userId" = $1) AS catalog`,
      [identity.userId],
    );
    expect(rows[0]).toEqual({ preferences: false, catalog: false });
    const initial = await conversion.getConversionFormData();
    expect(initial.defaultItemIds).toEqual([]);
    expect(initial.defaultsUnavailable).toBe(false);
    const [first, second] = initial.items;
    const otherInitial = await withAccountDatabase(
      otherAccount,
      conversion.getConversionFormData,
    );
    const [foreign] = otherInitial.items;
    const settings = {
      usdToCnyRate: "8.123456",
      defaultCooldownMinutes: 45,
      highImpactThresholdMinor: 250_000,
      privacyMode: "explicit",
    } as const;
    successful(await conversion.updateConversionPreferences(settings));

    const pair = [second.id, first.id];
    successful(await conversion.saveDefaultConversionItems(pair));
    const saved = await conversion.getConversionFormData();
    expect(saved.defaultItemIds).toEqual(pair);
    expect(saved.defaultsUnavailable).toBe(false);
    expect(saved.prefs).toMatchObject(settings);
    const home = await conversion.getDefaultConversionPreviewData();
    expect(home.items.map((item) => item.catalogItemId)).toEqual(
      saved.defaultItemIds,
    );
    expect(home.usdToCnyRate).toBe(saved.prefs.usdToCnyRate);
    expect(home.defaultsUnavailable).toBe(saved.defaultsUnavailable);

    for (const invalid of [
      [first.id],
      [first.id, first.id],
      [first.id, foreign.id],
      [first.id, 2_147_483_647],
      [first.id, 2_147_483_648],
    ])
      expect(
        await conversion.saveDefaultConversionItems(invalid),
      ).toHaveProperty("error");
    expect((await conversion.getConversionFormData()).defaultItemIds).toEqual(
      pair,
    );

    const otherSaved = await withAccountDatabase(otherAccount, async () => {
      expect((await conversion.getConversionFormData()).defaultItemIds).toEqual(
        [],
      );
      expect(await conversion.saveDefaultConversionItems(pair)).toHaveProperty(
        "error",
      );
      return conversion.getConversionFormData();
    });
    expect(otherSaved.defaultItemIds).toEqual([]);
    expect(otherSaved.items.some((item) => pair.includes(item.id))).toBe(false);

    successful(await conversion.toggleCatalogItem(second.id, false));
    expect(await conversion.saveDefaultConversionItems(pair)).toHaveProperty(
      "error",
    );
    const stale = await conversion.getConversionFormData();
    expect(stale.defaultItemIds).toEqual([first.id]);
    expect(stale.defaultsUnavailable).toBe(true);
    expect(JSON.parse(stale.prefs.defaultCatalogItemIdsJson)).toEqual(pair);
    const staleHome = await conversion.getDefaultConversionPreviewData();
    expect(staleHome.items.map((item) => item.catalogItemId)).toEqual(
      stale.defaultItemIds,
    );
    expect(staleHome.defaultsUnavailable).toBe(stale.defaultsUnavailable);

    await admin.query(
      'UPDATE conversion_preferences SET default_catalog_item_ids_json=$1 WHERE "userId"=$2',
      [JSON.stringify([first.id, first.id]), identity.userId],
    );
    expect(await conversion.getConversionFormData()).toMatchObject({
      defaultItemIds: [],
      defaultsUnavailable: true,
    });
    expect(await conversion.getDefaultConversionPreviewData()).toMatchObject({
      items: [],
      defaultsUnavailable: true,
    });
  });
  it("loads enabled saved comparisons outside the catalog display cap", async () => {
    const userId = "test-conversion-defaults-b";
    await withAccountDatabase(userId, async () => {
      const [first] = await conversion.getEnabledCatalogItems();
      await db.insert(schema.spendingAnchors).values(
        Array.from({ length: 200 }, (_, index) => ({
          userId,
          name: `目录上限测试 ${index}`,
          priceCny: 10,
          priceMinor: 1_000,
          sortOrder: 100,
        })),
      );
      const [last] = await db
        .insert(schema.spendingAnchors)
        .values({
          userId,
          name: "目录上限后的常用项",
          priceCny: 20,
          priceMinor: 2_000,
          sortOrder: 101,
        })
        .returning();
      expect(
        (await conversion.getEnabledCatalogItems()).some(
          (item) => item.id === last.id,
        ),
      ).toBe(false);
      const pair = [last.id, first.id];
      successful(await conversion.saveDefaultConversionItems(pair));
      const formData = await conversion.getConversionFormData();
      expect(formData.defaultItemIds).toEqual(pair);
      expect(formData.defaultsUnavailable).toBe(false);
      expect(formData.items.filter((item) => item.id === last.id)).toHaveLength(
        1,
      );
    });
  });
  it("adds inline comparisons to the owned catalog and reuses an exact retry", async () => {
    identity.userId = "test-inline-comparison-a";
    const [first, second] = await conversion.getEnabledCatalogItems();
    const defaults = [first.id, second.id];
    successful(await conversion.saveDefaultConversionItems(defaults));
    const input = {
      id: null,
      name: "AI 额度即时对照",
      billingType: "credit_pack",
      currency: "USD",
      priceMinor: 12_000,
      maxPriceMinor: null,
      unitLabel: "包",
      sourceNote: null,
      useInConversion: true,
    } as const;
    const created = successful(await conversion.upsertCatalogItem(input));
    const items = (await conversion.getCatalogItems()).filter(
      ({ name }) => name === input.name,
    );
    expect(items).toHaveLength(1);
    const [item] = items;
    expect(item).toMatchObject({
      userId: identity.userId,
      name: input.name,
      billingType: "credit_pack",
      currency: "USD",
      priceMinor: 12_000,
      priceCny: 840,
      maxPriceMinor: null,
      unitLabel: "包",
      isActive: true,
    });
    expect(created).toMatchObject({ ok: true, reused: false, item });
    expect(await conversion.upsertCatalogItem(input)).toMatchObject({
      ok: true,
      reused: true,
      item,
    });
    expect(
      (await conversion.getCatalogItems()).filter(
        ({ name }) => name === input.name,
      ),
    ).toEqual([item]);
    expect(await conversion.getConversions()).toHaveLength(0);
    expect((await conversion.getConversionFormData()).defaultItemIds).toEqual(
      defaults,
    );

    identity.userId = "test-inline-comparison-b";
    expect(await conversion.upsertCatalogItem(input)).toMatchObject({
      ok: true,
      reused: false,
      item: { userId: identity.userId },
    });
    const other = (await conversion.getCatalogItems()).filter(
      ({ name }) => name === input.name,
    );
    expect(other).toHaveLength(1);
    expect(other[0].id).not.toBe(item.id);
  });
  it("creates and updates task hierarchies and recomputes progress", async () => {
    const root = successful(await tasks.createTreeTask({ title: "根任务" }));
    const child = successful(
      await tasks.createTreeTask({
        title: "子任务",
        parentId: root.id,
        weight: 2,
      }),
    );
    await tasks.toggleTaskStatus(child.id!);
    let forest = await tasks.getTaskTreeData();
    expect(forest.tasks.find((t) => t.id === root.id)?.progress).toBe(100);
    await tasks.deleteTreeTask(child.id!);
    forest = await tasks.getTaskTreeData();
    expect(forest.tasks.find((t) => t.id === root.id)?.progress).toBe(0);
    identity.userId = "test-account-b";
    expect(
      await tasks.createTreeTask({ title: "越权", parentId: root.id }),
    ).toHaveProperty("error");
  });
  it("preserves independent task timing edits and rejects stale or foreign writes", async () => {
    identity.userId = "test-task-timing";
    const created = successful(
      await tasks.createTreeTask({ title: "验证交付时间" }),
    );
    const id = created.id!;
    const legacyDeadline = new Date("2026-11-20T02:30:45.123Z");
    await admin.query(
      'UPDATE tree_tasks SET priority = $1, deadline = $2 WHERE id = $3 AND "userId" = $4',
      ["P1", legacyDeadline, id, identity.userId],
    );
    const expected = { priority: "P1", deadline: legacyDeadline.toISOString() };
    const readTask = async () =>
      (await tasks.getTaskTreeData()).tasks.find((task) => task.id === id);
    const editDeadline = {
      id,
      timing: { expected, deadlineLocal: "2026-11-20T10:30" },
    };
    const savedDeadline = new Date("2026-11-20T03:30:00Z");
    const savedAt = new Date("2026-11-08T03:00:00Z");

    vi.stubEnv("NEXT_PUBLIC_APP_TIME_ZONE", "Asia/Bangkok");
    try {
      successful(
        await tasks.updateTreeTask({
          id,
          timing: { expected, priority: "P0" },
        }),
      );
      expect(await readTask()).toMatchObject({
        priority: "P0",
        deadline: legacyDeadline,
      });

      vi.setSystemTime(savedAt);
      successful(await tasks.updateTreeTask(editDeadline));
      const saved = {
        priority: "P0",
        deadline: savedDeadline,
        updatedAt: savedAt,
      };
      expect(await readTask()).toMatchObject(saved);

      vi.setSystemTime(new Date("2026-11-08T03:01:00Z"));
      successful(await tasks.updateTreeTask(editDeadline));
      expect(await readTask()).toMatchObject(saved);
      expect(
        await tasks.updateTreeTask({
          id,
          timing: {
            expected: { ...expected, priority: "P0" },
            priority: "P2",
            deadlineLocal: "2026-11-20T11:30",
          },
        }),
      ).toMatchObject({ staleTiming: true });
      expect(await readTask()).toMatchObject(saved);

      const clearDeadline = {
        id,
        timing: {
          expected: { priority: "P0", deadline: savedDeadline.toISOString() },
          deadlineLocal: null,
        },
      };
      identity.userId = "test-account-b";
      expect(await tasks.updateTreeTask(clearDeadline)).toHaveProperty("error");
      identity.userId = "test-task-timing";
      expect(await readTask()).toMatchObject(saved);
      successful(await tasks.updateTreeTask(clearDeadline));
      expect(await readTask()).toMatchObject({
        priority: "P0",
        deadline: null,
      });
    } finally {
      vi.useRealTimers();
      vi.unstubAllEnvs();
    }
  });
  it("advances the homepage through the account's ordered unfinished leaf tasks", async () => {
    async function createCandidate(
      title: string,
      priority: "P0" | "P1" | "P2",
      deadline: string | null,
      parentId?: number,
    ) {
      const task = successful(await tasks.createTreeTask({ title, parentId }));
      // Set a fixed update time so the ordering test can exercise deadline ties.
      await admin.query(
        `UPDATE tree_tasks SET priority = $1, deadline = $2,
          updated_at = '2026-09-01T00:00:00Z'
         WHERE id = $3 AND "userId" = $4`,
        [priority, deadline, task.id, identity.userId],
      );
      return task.id!;
    }

    identity.userId = "test-home-task-other";
    const foreign = await createCandidate(
      "其他账户的优先任务",
      "P0",
      "2026-09-02T00:00:00Z",
    );
    const nextLeaf = async () =>
      (await entropy.getTodayFirstTask({ leafOnly: true }))?.id;
    expect(await nextLeaf()).toBe(foreign);

    identity.userId = "test-home-task-owner";
    const group = await createCandidate("任务组", "P0", "2026-09-04T00:00:00Z");
    const completed = await createCandidate(
      "较早但已完成",
      "P0",
      "2026-09-03T00:00:00Z",
      group,
    );
    successful(await tasks.toggleTaskStatus(completed));
    const earliest = await createCandidate(
      "第一项叶子任务",
      "P0",
      "2026-09-05T00:00:00Z",
      group,
    );
    const tied = await createCandidate(
      "同一天的下一项",
      "P0",
      "2026-09-05T00:00:00Z",
    );
    const later = await createCandidate(
      "截止日较晚",
      "P0",
      "2026-09-06T00:00:00Z",
    );
    const undated = await createCandidate("没有截止日", "P0", null);
    const lower = await createCandidate(
      "优先级较低",
      "P1",
      "2026-09-02T00:00:00Z",
    );
    await createCandidate("暂不推荐", "P2", "2026-09-02T00:00:00Z");

    expect((await entropy.getTodayFirstTask())?.id).toBe(group);
    expect(await nextLeaf()).toBe(earliest);
    for (const [current, next] of [
      [earliest, tied],
      [tied, later],
      [later, undated],
      [undated, lower],
      [lower, undefined],
    ] as const) {
      successful(await tasks.toggleTaskStatus(current));
      expect(await nextLeaf()).toBe(next);
    }
  });
  it("returns only the first three unfinished leaf deadlines in the account's seven calendar days", async () => {
    const owner = "test-near-term-owner";
    const other = "test-near-term-other";
    const first = "2026-11-27T17:00:00Z";
    const last = "2026-12-04T16:59:59Z";

    async function createTask(
      title: string,
      deadline: string | null,
      parentId?: number,
    ) {
      const { id } = successful(
        await tasks.createTreeTask({ title, parentId }),
      );
      await admin.query(
        'UPDATE tree_tasks SET priority = $1, deadline = $2 WHERE id = $3 AND "userId" = $4',
        ["P2", deadline, id, identity.userId],
      );
      return { id, title, deadline: deadline ? new Date(deadline) : null };
    }

    identity.userId = other;
    await createTask("其他账号的任务", first);
    identity.userId = owner;
    const group = await createTask("带日期的任务组", first);
    await createTask("前一天到期", "2026-11-27T16:59:59Z");
    await createTask("无截止时间", null);
    const done = await createTask("已完成", first);
    successful(await tasks.toggleTaskStatus(done.id!));
    const firstLeaf = await createTask("第一项", first, group.id);
    const tiedLeaf = await createTask("同一时间", first);
    const lastLeaf = await createTask("第七天最后一分钟", last);
    const extraLeaf = await createTask("超出展示数量", last);
    await createTask("第八天第一分钟", "2026-12-04T17:00:00Z");

    vi.stubEnv("NEXT_PUBLIC_APP_TIME_ZONE", "Asia/Bangkok");
    try {
      vi.setSystemTime(new Date("2026-11-27T17:30:00Z"));
      expect(await entropy.getUpcomingTaskDeadlines()).toEqual({
        today: "2026-11-28",
        lastDay: "2026-12-04",
        timeZone: "Asia/Bangkok",
        tasks: [firstLeaf, tiedLeaf, lastLeaf],
      });
      successful(await tasks.toggleTaskStatus(tiedLeaf.id!));
      expect((await entropy.getUpcomingTaskDeadlines()).tasks).toEqual([
        firstLeaf,
        lastLeaf,
        extraLeaf,
      ]);
      successful(await tasks.toggleTaskStatus(lastLeaf.id!));
      successful(await tasks.toggleTaskStatus(extraLeaf.id!));
      expect((await entropy.getUpcomingTaskDeadlines()).tasks).toEqual([
        firstLeaf,
      ]);
    } finally {
      vi.useRealTimers();
      vi.unstubAllEnvs();
    }
  });
  it("finds the account's nearest active cooldown or most recently ended unresolved cooldown", async () => {
    const owner = "test-near-term-owner";
    const other = "test-near-term-other";
    async function createCooldown(
      userId: string,
      deadline: string | null,
      stage = "considering",
      resolution: string | null = null,
    ) {
      const cooldownEndsAt = deadline ? new Date(deadline) : null;
      const { rows } = await admin.query<{ id: number }>(
        `INSERT INTO spend_conversions
           ("userId", decision_stage, planned_amount_minor, snapshot_json, sensitive_label, minimum_action, cooldown_ends_at, resolution)
         VALUES ($1, $2, 80000, '{}', '仅详情显示的别名', '仅详情显示的动作', $3, $4) RETURNING id`,
        [userId, stage, cooldownEndsAt, resolution],
      );
      return { id: rows[0].id, cooldownEndsAt };
    }

    try {
      vi.setSystemTime(new Date("2026-11-08T03:00:00Z"));
      const foreign = await createCooldown(other, "2026-11-08T03:00:01Z");
      identity.userId = other;
      expect(await conversion.getConversionCheckIn()).toEqual(foreign);
      identity.userId = owner;
      await createCooldown(owner, null);
      await createCooldown(owner, "2026-11-08T03:00:01Z", "spent");
      await createCooldown(
        owner,
        "2026-11-08T03:00:01Z",
        "considering",
        "avoided",
      );
      expect(await conversion.getConversionCheckIn()).toBeNull();

      await createCooldown(owner, "2026-11-08T02:59:59Z");
      await createCooldown(owner, "2026-11-08T03:00:00Z");
      const earlier = await createCooldown(owner, "2026-11-08T03:15:00Z");
      const tied = await createCooldown(owner, "2026-11-08T03:15:00Z");
      const later = await createCooldown(owner, "2026-11-08T03:30:00Z");
      expect(await conversion.getConversionCheckIn()).toEqual(tied);
      vi.setSystemTime(tied.cooldownEndsAt!);
      expect(await conversion.getConversionCheckIn()).toEqual(later);
      vi.setSystemTime(later.cooldownEndsAt!);
      expect(await conversion.getConversionCheckIn()).toEqual(later);
      successful(await conversion.deleteSpendConversion(later.id));
      expect(await conversion.getConversionCheckIn()).toEqual(tied);
      successful(
        await conversion.resolveSpendConversion({
          conversionId: tied.id,
          resolution: "avoided",
          actualAmountMinor: null,
          redirectedAmountMinor: 0,
          redirectTarget: null,
        }),
      );
      expect(await conversion.getConversionCheckIn()).toEqual(earlier);
    } finally {
      vi.useRealTimers();
    }
  });
  it("persists nav, rhythm and lifespan preferences with strict dates", async () => {
    successful(await preferences.saveNavOrder(["/rules", "/archive"]));
    expect(await preferences.getNavOrder()).toEqual(["/rules", "/archive"]);
    expect(
      await rhythm.upsertRhythmLog({ date: "2026-02-31", qualityScore: 80 }),
    ).toHaveProperty("error");
    successful(
      await rhythm.upsertRhythmLog({
        date: "2026-09-29",
        sleepTime: "23:30",
        qualityScore: 80,
      }),
    );
    successful(
      await rhythm.upsertRhythmLog({
        date: "2026-09-30",
        wakeTime: "07:30",
        qualityScore: 70,
      }),
    );
    expect((await rhythm.getYesterdaySnapshot("2026-09-30")).sleepHours).toBe(
      8,
    );
    expect(await lifespan.saveBirthDate("2026-02-31")).toHaveProperty("error");
    successful(await lifespan.saveBirthDate("2000-01-01"));
    expect((await lifespan.getLifespanSummary("2026-09-30")).configured).toBe(
      true,
    );
  });
  it("uses the app day for lifespan scores and rejects a tab left open past midnight", async () => {
    identity.userId = "test-account-b";
    vi.stubEnv("NEXT_PUBLIC_APP_TIME_ZONE", "Asia/Bangkok");
    try {
      vi.setSystemTime(new Date("2026-11-07T16:59:59Z"));
      successful(await lifespan.saveBirthDate("1900-01-01"));
      const previous = await lifespan.getLifespanSummary();
      expect(previous).toMatchObject({ configured: true, today: "2026-11-07" });
      successful(await lifespan.recordTodayQuality(75, previous.today));

      vi.setSystemTime(new Date("2026-11-07T17:00:00Z"));
      const current = await lifespan.getLifespanSummary();
      expect(current).toMatchObject({ today: "2026-11-08", todayScore: null });
      expect(
        await lifespan.recordTodayQuality(25, previous.today),
      ).toMatchObject({
        ok: false,
        error: expect.stringContaining("日期已切换"),
      });
      expect((await lifespan.getLifespanSummary()).todayScore).toBeNull();
      expect(
        (await lifespan.getLifespanSummary(previous.today)).todayScore,
      ).toBe(75);

      successful(await rhythm.upsertRhythmLog({ note: "今日节律" }));
      successful(await lifespan.recordTodayQuality(85, current.today));
      expect((await lifespan.getLifespanSummary()).todayScore).toBe(85);
      expect((await rhythm.getTodayRhythmLog())?.qualityScore).toBe(85);

      expect(await lifespan.saveBirthDate("2026-11-09")).toHaveProperty(
        "error",
      );
      successful(await lifespan.saveBirthDate("2026-11-08"));
      expect(await lifespan.getLifespanSummary()).toMatchObject({
        configured: true,
        daysUsed: 0,
      });

      successful(await lifespan.saveBirthDate("2024-02-29"));
      vi.setSystemTime(new Date("2104-02-22T17:00:00Z"));
      const summary = await lifespan.getLifespanSummary();
      expect(summary).toMatchObject({
        today: "2104-02-23",
        daysRemaining: 6,
        weeksRemaining: 0,
      });
      expect(await lifespan.getLifespanOverview()).toEqual({
        daysRemaining: summary.daysRemaining,
        weeksRemaining: summary.weeksRemaining,
      });
    } finally {
      vi.useRealTimers();
      vi.unstubAllEnvs();
    }
  });
  it("removes only the current birth date and keeps quality scores available without it", async () => {
    const owner = "test-birth-date-owner";
    const other = "test-birth-date-other";
    const oldDate = "2000-01-01";
    const newDate = "2000-01-02";
    const modelTreeUrl = "https://example.test/model-tree";
    const unset = { birthDate: null, hasStoredBirthDate: false };
    vi.setSystemTime(new Date("2026-11-08T07:00:00Z"));
    try {
      identity.userId = other;
      successful(await lifespan.saveBirthDate(newDate, null));

      identity.userId = owner;
      expect(await lifespan.getEntropyConfig()).toMatchObject(unset);
      const { today } = await lifespan.getLifespanSummary();
      successful(await rhythm.upsertRhythmLog({ note: "保留节律记录" }));
      successful(await lifespan.recordTodayQuality(85, today));
      const savedScore = {
        todayScore: 85,
        streakDays: 1,
        effectiveDaysTotal: 0.4,
      };
      expect(await lifespan.getLifespanSummary()).toMatchObject({
        ...savedScore,
        configured: false,
      });

      successful(await lifespan.saveModelTreeUrl(modelTreeUrl));
      successful(await lifespan.saveBirthDate(oldDate, null));
      successful(await lifespan.saveBirthDate(newDate, oldDate));
      expect(await lifespan.getLifespanOverview()).not.toBeNull();
      expect(await lifespan.removeBirthDate(oldDate)).toMatchObject({
        ok: false,
        current: { birthDate: newDate, hasStoredBirthDate: true },
      });
      expect(await lifespan.getEntropyConfig()).toMatchObject({
        birthDate: newDate,
      });
      expect(await lifespan.removeBirthDate(newDate)).toEqual({ ok: true });
      expect(await lifespan.removeBirthDate(newDate)).toEqual({ ok: true });
      expect(await lifespan.saveBirthDate(oldDate, oldDate)).toMatchObject({
        ok: false,
        current: unset,
      });
      expect(await lifespan.getEntropyConfig()).toMatchObject({
        ...unset,
        modelTreeUrl,
      });
      expect(await lifespan.getLifespanOverview()).toBeNull();
      expect(await lifespan.getLifespanSummary()).toMatchObject({
        ...savedScore,
        configured: false,
      });
      expect(await rhythm.getTodayRhythmLog()).toMatchObject({
        qualityScore: 85,
        note: "保留节律记录",
      });

      await admin.query(
        'INSERT INTO user_preferences ("userId", pref_key, pref_value) VALUES ($1, $2, $3)',
        [owner, "birth_date", "{malformed"],
      );
      expect(await lifespan.getEntropyConfig()).toMatchObject({
        birthDate: null,
        hasStoredBirthDate: true,
      });
      expect(await lifespan.removeBirthDate(null)).toEqual({ ok: true });
      expect(await lifespan.getEntropyConfig()).toMatchObject({
        ...unset,
        modelTreeUrl,
      });

      identity.userId = other;
      expect(await lifespan.getEntropyConfig()).toMatchObject({
        birthDate: newDate,
        hasStoredBirthDate: true,
      });
      expect((await lifespan.getLifespanSummary()).todayScore).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
  it("records mind state, accepts action, and creates one review/rule", async () => {
    const r = successful(
      await mind.createMindCheck({
        currentState: "procrastination",
        energyLevel: 3,
        agitationLevel: 2,
        currentTask: "开始学习",
      }),
    );
    const id = r.session!.id;
    successful(await mind.acceptMindAction(id));
    successful(
      await mind.reviewMindAction({
        sessionId: id,
        actualResult: "完成了两分钟任务",
        stateAfter: "balanced",
        effectiveness: "helpful",
        lessonText: "先做两分钟",
        convertToRule: true,
      }),
    );
    expect(
      (await mind.getMindRegulationDashboard()).reviews.some(
        (r) => r.sessionId === id,
      ),
    ).toBe(true);
    expect(
      await mind.reviewMindAction({
        sessionId: id,
        actualResult: "重复",
        stateAfter: "balanced",
        effectiveness: "helpful",
      }),
    ).toHaveProperty("error");
  });
  it("creates a person and hypothesis, protects ownership and deletes dependent records", async () => {
    const person = successful(
      await people.createPerson({
        personName: "测试联系人",
        relationshipStage: "initial_contact",
      }),
    );
    const id = person.person!.id;
    successful(
      await people.createHypothesis({
        personId: id,
        hypothesis: "需要核实的沟通需求",
        confidence: "low",
      }),
    );
    expect((await people.getPersonDetail(id))?.hypotheses).toHaveLength(1);
    identity.userId = "test-account-b";
    expect(await people.getPersonDetail(id)).toBeNull();
    await expect(
      people.createHypothesis({
        personId: id,
        hypothesis: "错误关联",
        confidence: "low",
      }),
    ).rejects.toThrow();
    identity.userId = "test-account-a";
    await people.deletePerson(id);
    expect(
      (
        await admin.query(
          "SELECT id FROM person_need_hypotheses WHERE person_id=$1",
          [id],
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("creates a resource, records evidence, and removes its dependent evidence", async () => {
    const r = successful(
      await resources.createResource({
        name: "课程资源",
        resourceType: "content",
        domain: "academic",
        status: "pending_review",
      } as Parameters<typeof resources.createResource>[0]),
    );
    const id = r.id!;
    expect(id).toBeTypeOf("number");
    successful(
      await resources.addResourceEvidence({
        resourceId: id,
        evidenceType: "note",
        content: "完成一次使用",
        conversionLevel: 1,
      } as Parameters<typeof resources.addResourceEvidence>[0]),
    );
    expect(await resources.getResourceDetail(id)).not.toBeNull();
    await resources.deleteResource(id);
    expect(
      (
        await admin.query(
          "SELECT id FROM resource_evidence WHERE resource_id=$1",
          [id],
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("screens a relationship and retains its interaction history", async () => {
    const r = successful(
      await relationships.quickScreen(
        quickScreenSchema.parse({
          personName: "同学",
          relationshipType: "classmate",
          interactionFact: "讨论了课程问题",
          energyAfter: "calm",
        }),
      ),
    );
    expect(r.id).toBeTypeOf("number");
    expect(await relationships.getInteractions(r.id!)).toHaveLength(1);
  });
  it("creates and checks an execution boundary", async () => {
    const r = successful(
      await boundaries.createBoundary({
        title: "任务边界",
        sourceType: "custom",
        minimumDoneStandard: "完成一题",
        opportunityCost: "休息时间",
        stopCondition: "30分钟结束",
        timeboxMinutes: 30,
        decision: "validate_small",
        informationConfidence: "unknown",
      } as Parameters<typeof boundaries.createBoundary>[0]),
    );
    expect(r).toHaveProperty("boundary");
    successful(
      await boundaries.runBoundaryCheck({
        boundaryId: r.boundary!.id,
        timeSpentMinutes: 40,
        reachedMinimum: true,
        evidenceCreated: true,
        crowdingOut: false,
        emotionDriven: false,
        infoInsufficient: false,
      } as Parameters<typeof boundaries.runBoundaryCheck>[0]),
    );
    expect(await boundaries.getBoundary(r.boundary!.id)).not.toBeNull();
  });
  it("creates a P0 demand and places another demand into backlog", async () => {
    const a = successful(
      await weakness.createDemand({
        title: "核心需求",
        priority: "P0",
        isKeyFactor: true,
      }),
    );
    expect(a).toBeDefined();
    successful(
      await weakness.createDemand({
        title: "后续需求",
        priority: "P1",
        isKeyFactor: false,
      }),
    );
    expect(await weakness.getDemandsOverview()).toBeDefined();
    expect((await weakness.getWeaknessEvents()).length).toBeGreaterThan(0);
  });
  it("starts and ends an entertainment session", async () => {
    const r = successful(
      await entertainment.startEntertainmentSession({
        title: "休闲阅读",
        entertainmentType: "reading",
        plannedMinutes: 20,
        plannedBudgetCny: 0,
        preState: "平静",
        purpose: "放松",
        mainline: "学习",
        latestEndAt: new Date(Date.now() + 1200000),
        nextAction: "回到学习",
      }),
    );
    expect(r).toHaveProperty("id");
    const id = r.id!;
    successful(await entertainment.endEntertainmentSession(id));
    expect(
      (await entertainment.getEntertainmentSessionDetail(id))?.session.status,
    ).toBe("ended");
  });
  it("creates a spending review, exports context and retains historical evidence", async () => {
    const r = successful(
      await spending.createSpendingReview({
        title: "软件支出",
        category: "software",
        amount: 100,
        fundingSource: "budget",
      } as Parameters<typeof spending.createSpendingReview>[0]),
    );
    expect(r.review!.id).toBeTypeOf("number");
    successful(await spending.exportMarkdown(r.review!.id));
    expect(await spending.getSpendingReview(r.review!.id)).not.toBeNull();
    expect(await archive.getArchiveStats()).toBeDefined();
  });
  it("deduplicates a cooling submission and queues only after the owner's recheck", async () => {
    const input = {
      requestId: randomUUID(),
      title: "合成审核 · 美元课程",
      category: "course",
      amount: 55,
      currency: "USD",
      fundingSource: "budget",
      problemToSolve: "用来检查金额换算、冷静期和重试。",
    } as const;
    const [first, second] = await Promise.all([
      spending.createSpendingReview(input),
      spending.createSpendingReview(input),
    ]);
    const review = successful(first).review;
    expect(successful(second).review.id).toBe(review.id);
    expect(review.decisionStatus).toBe("cooling");
    expect(review.coolingUntil!.getTime() - review.decisionTime!.getTime()).toBe(86_400_000);
    expect((await spending.getSpendingReview(review.id))?.aiReview).toBeNull();
    await expect(spending.recheckAfterCooling(review.id, true)).resolves.toHaveProperty("error");
    await expect(spending.saveGptResult({ spendingReviewId: review.id, conclusion: "manual_confirmation" })).resolves.toHaveProperty("error");
    await expect(spending.saveFinalDecision({ id: review.id, finalDecision: "cancel", paymentCompleted: false })).resolves.toHaveProperty("error");

    await admin.query("UPDATE spending_reviews SET cooling_until = now() - interval '1 minute' WHERE id=$1", [review.id]);
    await withAccountDatabase("test-account-b", async () => {
      expect(await spending.startOrRetryHermesReview(review.id)).toHaveProperty("error");
      expect(await spending.getSpendingReview(review.id)).toBeNull();
    });
    successful(await spending.recheckAfterCooling(review.id, true, "en"));
    await expect(spending.recheckAfterCooling(review.id, true)).resolves.toHaveProperty("error");
    const { rows: [job] } = await admin.query(
      "SELECT status, attempt, payload FROM spending_review_jobs WHERE review_id=$1", [review.id],
    );
    expect(job).toMatchObject({
      status: "queued", attempt: 1,
      payload: { language: "en", spending: { amount: 55, currency: "USD" } },
    });
    expect(JSON.stringify(job.payload)).not.toContain("test-account-a");
    await expect(spending.saveFinalDecision({ id: review.id, finalDecision: "delay", paymentCompleted: false })).resolves.toHaveProperty("error");
    await expect(spending.saveGptResult({ spendingReviewId: review.id, conclusion: "manual_confirmation" })).resolves.toHaveProperty("error");
  });
  it("deduplicates trigger creation and progresses through decision to validation", async () => {
    const input = {
      sceneType: "study",
      sceneSummary: "开始任务",
      idempotencyKey: "integration-trigger-key",
    };
    const a = successful(await trigger.createTriggerSession(input));
    const b = successful(await trigger.createTriggerSession(input));
    expect(a.session!.id).toBe(b.session!.id);
    successful(
      await trigger.recordTriggerChoice({
        sessionId: a.session!.id,
        choice: "adjust",
      }),
    );
    successful(await trigger.openTriggerValidation(a.session!.id));
    successful(
      await trigger.submitChoiceValidation({
        sessionId: a.session!.id,
        actualOutcome: "做出了调整",
        costDelta: 0,
        emotionDelta: 1,
        decisionQuality: "better",
        ruleHelpfulness: "helpful",
        followupAction: "keep",
      }),
    );
    expect(
      await trigger.submitChoiceValidation({
        sessionId: a.session!.id,
        actualOutcome: "重复提交",
        costDelta: 0,
        emotionDelta: 0,
        decisionQuality: "same",
        ruleHelpfulness: "neutral",
        followupAction: "none",
      }),
    ).toHaveProperty("error");
  });
});

it("moves, indents and outdents a task subtree without losing descendants", async () => {
  const a = successful(await tasks.createTreeTask({ title: "树操作A" }));
  const b = successful(await tasks.createTreeTask({ title: "树操作B" }));
  const child = successful(
    await tasks.createTreeTask({ title: "树操作子", parentId: b.id }),
  );
  await tasks.indentTask(b.id!);
  let rows = (await tasks.getTaskTreeData()).tasks;
  expect(rows.find((t) => t.id === b.id)?.parentId).toBe(a.id);
  expect(rows.find((t) => t.id === child.id)?.rootId).toBe(a.id);
  await tasks.outdentTask(b.id!);
  rows = (await tasks.getTaskTreeData()).tasks;
  expect(rows.find((t) => t.id === b.id)?.parentId).toBeNull();
  expect(rows.find((t) => t.id === child.id)?.rootId).toBe(b.id);
  await tasks.moveTask(b.id!, "up");
  rows = (await tasks.getTaskTreeData()).tasks;
  expect(rows.find((t) => t.id === b.id)!.sortOrder).toBeLessThan(
    rows.find((t) => t.id === a.id)!.sortOrder,
  );
  await tasks.deleteTreeTask(b.id!);
  expect(
    (await tasks.getTaskTreeData()).tasks.some((t) => t.id === child.id),
  ).toBe(false);
});
it("serializes simultaneous review submissions without duplicate records", async () => {
  const result = successful(
    await events.createEventCase({
      title: "并发复盘",
      eventType: "study",
      scene: "classroom",
      status: "solved",
      impactLevel: "high",
    }),
  );
  const input = {
    eventId: result.eventCase!.id,
    whatHappened: "重复点击保存",
    rootCause: "leaving_without_checking",
    newRuleText: "并发请求只创建一条规则",
  };
  const outcomes = await Promise.all([
    events.submitMiniReview(input),
    events.submitMiniReview(input),
  ]);
  expect(outcomes.filter((x) => "error" in x)).toHaveLength(1);
  expect(
    (
      await admin.query("SELECT id FROM event_reviews WHERE event_id=$1", [
        input.eventId,
      ])
    ).rows,
  ).toHaveLength(1);
});

describe("habit capacity and recorded progress", () => {
  const owner = "test-habits-owner";
  const other = "test-habits-other";
  const change = (command: HabitCommand, account = owner) =>
    withAccountDatabase(account, () => applyHabitCommand(habitCommandSchema.parse(command)));
  const read = (account = owner) => withAccountDatabase(account, () => readHabitDashboard());

  it("serializes concurrent adds and swaps, preserves records and next actions, and isolates accounts", async () => {
    const project = randomUUID(), reading = randomUUID(), thai = randomUUID();
    expect(await change({ type: "add", id: project, name: "项目开发", kind: "project" })).toMatchObject({ ok: true });
    const parallel = await Promise.all([
      change({ type: "add", id: reading, name: "论文阅读", kind: "reading" }),
      change({ type: "add", id: thai, name: "泰拳练习", kind: "quick" }),
    ]);
    expect(parallel.map((result) => result.ok && result.message).sort())
      .toEqual(["已添加到暂存区", "已添加到正在养成"].sort());

    const requestId = randomUUID();
    const checkin = { type: "record", id: project, requestId, progress: "完成打卡页", nextStep: "跑一遍手机流程" } as const;
    expect((await change(checkin)).ok).toBe(true);
    expect((await change(checkin)).ok).toBe(true);
    expect((await read()).recent).toHaveLength(1);
    const parked = (await read()).list.find((habit) => habit.activeSlot === null)!;
    const swap = { type: "activate", id: parked.id, replace: { id: project, slot: 1 } } as const;
    expect((await Promise.all([change(swap), change(swap)])).filter((result) => result.ok)).toHaveLength(1);
    expect((await change({ type: "record", id: project, requestId: randomUUID(), progress: "已暂存时记录" })).ok).toBe(false);
    const exchanged = await read();
    expect(exchanged.tracks.map((habit) => habit.id)).not.toContain(project);
    expect(exchanged.counts.some((row) => row.habitId === project)).toBe(false);
    expect(exchanged.recent[0].progress).toBe("完成打卡页");

    expect((await change({ type: "activate", id: project, replace: { id: parked.id, slot: 1 } })).ok).toBe(true);
    const resumed = await read();
    expect(resumed.tracks.find((habit) => habit.id === project)?.nextStep).toBe("跑一遍手机流程");
    expect(resumed.counts.find((item) => item.habitId === project)?.count).toBe(1);
    expect((await change({ type: "rename", id: project, name: "RuleLoop 开发" }, other)).ok).toBe(false);
    expect((await change({ type: "add", id: randomUUID(), name: "RuleLoop 开发", kind: "quick" }, other)).ok).toBe(true);
    expect((await read(other)).recent).toEqual([]);
    expect((await change({ type: "delete", id: project })).ok).toBe(true);
    const deleted = await read();
    expect(deleted.list.some((habit) => habit.id === project)).toBe(false);
    expect(deleted.recent[0].deletedAt).toBeInstanceOf(Date);
    expect((await change({ type: "activate", id: parked.id })).ok).toBe(true);
    expect((await read()).tracks).toHaveLength(2);
  });

  it("enforces the cap below application code", async () => {
    const account = "test-habits-constraints";
    await expect(
      asAccount(account, (client) => client.query(
        'INSERT INTO habits ("userId",name,active_slot) VALUES ($1,$2,3)',
        [account, "第三个位置"],
      )),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      asAccount(account, async (client) => {
        await client.query(
          'INSERT INTO habits ("userId",name,active_slot) VALUES ($1,$2,2)',
          [account, "已占用的位置"],
        );
        await client.query(
          'INSERT INTO habits ("userId",name,active_slot) VALUES ($1,$2,2)',
          [account, "重复占位"],
        );
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("counts thirteen calendar weeks across the account's midnight and year boundary", async () => {
    const account = "test-habits-calendar";
    const id = randomUUID();
    vi.stubEnv("NEXT_PUBLIC_APP_TIME_ZONE", "Asia/Bangkok");
    try {
      expect((await change({ type: "add", id, name: "阅读", kind: "quick" }, account)).ok).toBe(true);
      await admin.query(
        'INSERT INTO habit_checkins ("userId", habit_id, occurred_at) SELECT $1, $2, unnest($3::timestamptz[])',
        [
          account,
          id,
          [
            "2026-10-11T16:59:59Z",
            "2026-10-11T17:00:00Z",
            "2027-01-03T16:59:59Z",
            "2027-01-03T17:00:00Z",
            "2027-01-03T17:01:00Z",
          ],
        ],
      );
      const dashboard = await withAccountDatabase(account, () =>
        readHabitDashboard(new Date("2027-01-03T17:02:00Z")),
      );
      expect(dashboard.today).toBe("2027-01-04");
      expect(dashboard.days).toHaveLength(91);
      expect(dashboard.days[0]).toBe("2026-10-12");
      expect(dashboard.days.slice(-7)).toEqual([
        "2027-01-04",
        "2027-01-05",
        "2027-01-06",
        "2027-01-07",
        "2027-01-08",
        "2027-01-09",
        "2027-01-10",
      ]);
      expect(dashboard.counts.sort((a, b) => a.day.localeCompare(b.day))).toEqual([
        { habitId: id, day: "2026-10-12", count: 1 },
        { habitId: id, day: "2027-01-03", count: 1 },
        { habitId: id, day: "2027-01-04", count: 2 },
      ]);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
