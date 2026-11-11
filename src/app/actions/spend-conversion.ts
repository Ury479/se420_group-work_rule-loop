"use server";

import { withAccount } from "@/lib/action";

import { db } from "@/db";
import {
  conversionPreferences,
  confirmationRules,
  eventCases,
  spendConversions,
  spendingAnchors,
  type SpendingAnchor,
} from "@/db/schema";
import { getUserId } from "@/lib/user";
import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  MAX_COOLDOWN_MINUTES,
  MAX_SPEND_CONVERSION_MINOR,
  applyRate,
  buildSnapshot,
  computeProtectedMinor,
  conversionQuoteKey,
  currencyToCnyRate,
  formatCny,
  getConversionCnyAmounts,
  getPlannedConversionCnyMinor,
  isCooldownOver,
  normalizeRate,
  parseSnapshot,
  rateToMicro,
  type BillingType,
  type CatalogInput,
  type CurrencyCode,
} from "@/lib/convert-domain";

// ─────────────────────────────────────────────
// 消费价值换算与冲动拦截
// 所有金额以整数分在服务端重新计算,客户端派生值一律不信任
// 每条查询必须 eq(userId) 隔离
// ─────────────────────────────────────────────

// PRD 预置价值目录:全部标记「用户录入,未自动核验」
const PRESET_CATALOG = [
  {
    name: "GPT Pro",
    billingType: "subscription",
    currency: "USD",
    priceMinor: 10000,
    unitLabel: "个月",
    category: "ai_tool",
  },
  {
    name: "豆包个人高阶版",
    billingType: "subscription",
    currency: "CNY",
    priceMinor: 15900,
    unitLabel: "个月",
    category: "ai_tool",
  },
  {
    name: "v0",
    billingType: "subscription",
    currency: "CNY",
    priceMinor: 15000,
    unitLabel: "个月",
    category: "ai_tool",
  },
  {
    name: "Kimi",
    billingType: "subscription",
    currency: "CNY",
    priceMinor: 30000,
    unitLabel: "个月",
    category: "ai_tool",
  },
  {
    name: "智谱官方额度",
    billingType: "subscription",
    currency: "CNY",
    priceMinor: 30000,
    unitLabel: "个月",
    category: "ai_tool",
  },
  {
    name: "Cursor Pro",
    billingType: "subscription",
    currency: "USD",
    priceMinor: 2000,
    unitLabel: "个月",
    category: "ai_tool",
  },
  {
    name: "Claude Max",
    billingType: "subscription",
    currency: "USD",
    priceMinor: 10000,
    unitLabel: "个月",
    category: "ai_tool",
  },
  {
    name: "Claude Pro 年付月均",
    billingType: "subscription",
    currency: "USD",
    priceMinor: 1700,
    unitLabel: "个月",
    category: "ai_tool",
  },
  {
    name: "GPT API 额度包",
    billingType: "credit_pack",
    currency: "USD",
    priceMinor: 20000,
    unitLabel: "包",
    category: "ai_tool",
  },
  {
    name: "日常一顿饭",
    billingType: "range_unit",
    currency: "CNY",
    priceMinor: 4000,
    maxPriceMinor: 6000,
    unitLabel: "顿",
    category: "dining",
  },
  {
    name: "面膜",
    billingType: "single_unit",
    currency: "CNY",
    priceMinor: 17000,
    unitLabel: "份",
    category: "shopping",
  },
] as const;

const SUGGESTED_RULE_TEXT =
  "当我准备进行超过自定义阈值的非计划消费,并注意到自己想立刻付款时,先打开价值换算,等待至少 2 小时,再决定是否支付。";

async function readPreferences(userId: string) {
  const [preferences] = await db
    .select()
    .from(conversionPreferences)
    .where(eq(conversionPreferences.userId, userId))
    .limit(1);
  return preferences;
}

async function ensurePreferences(userId: string) {
  const existing = await readPreferences(userId);
  if (existing) return existing;
  const [created] = await db
    .insert(conversionPreferences)
    .values({ userId })
    .returning();
  return created;
}

// 幂等播种:只补缺失的目录项,不覆盖用户已编辑的价格
async function seedCatalogIfMissing(userId: string) {
  const existing = await db
    .select({ name: spendingAnchors.name })
    .from(spendingAnchors)
    .where(eq(spendingAnchors.userId, userId));
  const existingNames = new Set(existing.map((row) => row.name));
  const missing = PRESET_CATALOG.filter(
    (item) => !existingNames.has(item.name),
  );
  if (missing.length === 0) return;
  await db.insert(spendingAnchors).values(
    missing.map((item, index) => {
      const rate = currencyToCnyRate(item.currency as CurrencyCode, "7.000000");
      const cnyMinor = applyRate(
        item.priceMinor,
        rateToMicro(rate) ?? 1_000_000,
      );
      return {
        userId,
        name: item.name,
        priceCny: Math.round(cnyMinor / 100),
        unitLabel: item.unitLabel,
        category: item.category,
        sourceType: "preset",
        billingType: item.billingType,
        currency: item.currency,
        priceMinor: item.priceMinor,
        maxPriceMinor:
          "maxPriceMinor" in item ? (item.maxPriceMinor as number) : null,
        sortOrder: index,
        sourceNote: "用户录入,未自动核验",
      };
    }),
  );
}

export async function getConversionPreferences() {
  return withAccount(async () => {
    const userId = await getUserId();
    return ensurePreferences(userId);
  });
}

export async function getCatalogItems() {
  return withAccount(async () => {
    const userId = await getUserId();
    await seedCatalogIfMissing(userId);
    return db
      .select()
      .from(spendingAnchors)
      .where(eq(spendingAnchors.userId, userId))
      .orderBy(spendingAnchors.sortOrder, spendingAnchors.priceMinor)
      .limit(200);
  });
}

export async function getEnabledCatalogItems() {
  return withAccount(async () => {
    const items = await getCatalogItems();
    return items.filter((item) => item.isActive && item.priceMinor > 0);
  });
}

const POSTGRES_INT_MAX = 2_147_483_647;
const catalogItemIdSchema = z
  .number()
  .int()
  .positive()
  .max(POSTGRES_INT_MAX, "比较项编号无效");
const defaultCatalogItemIdsSchema = z
  .array(catalogItemIdSchema)
  .length(2, "请选择两项作为常用对照")
  .refine((ids) => new Set(ids).size === ids.length, "比较项不能重复");

function parseDefaultCatalogItemIds(raw: string) {
  try {
    const value: unknown = JSON.parse(raw);
    if (Array.isArray(value) && value.length === 0) return [];
    const parsed = defaultCatalogItemIdsSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function getActiveCatalogItemsByIds(userId: string, ids: number[]) {
  return db
    .select()
    .from(spendingAnchors)
    .where(
      and(
        eq(spendingAnchors.userId, userId),
        eq(spendingAnchors.isActive, true),
        inArray(spendingAnchors.id, ids),
      ),
    );
}

function resolveDefaultCatalogItems(
  savedIds: number[] | null,
  items: SpendingAnchor[],
) {
  const defaultItems = (savedIds ?? []).flatMap((id) => {
    const item = items.find((row) => row.id === id && row.priceMinor > 0);
    return item ? [item] : [];
  });
  return {
    defaultItems,
    defaultsUnavailable:
      savedIds === null || defaultItems.length !== savedIds.length,
  };
}

function toCatalogInput(row: SpendingAnchor): CatalogInput {
  return {
    catalogItemId: row.id,
    name: row.name,
    billingType: row.billingType as BillingType,
    currency: row.currency as CurrencyCode,
    priceMinor: row.priceMinor,
    maxPriceMinor: row.maxPriceMinor,
    unitLabel: row.unitLabel,
  };
}

export async function getDefaultConversionPreviewData() {
  return withAccount(async () => {
    const userId = await getUserId();
    const prefs = await readPreferences(userId);
    const savedIds = prefs
      ? parseDefaultCatalogItemIds(prefs.defaultCatalogItemIdsJson)
      : [];
    const rows = savedIds?.length
      ? await getActiveCatalogItemsByIds(userId, savedIds)
      : [];
    const { defaultItems, defaultsUnavailable } = resolveDefaultCatalogItems(
      savedIds,
      rows,
    );
    return {
      items: defaultItems.map(toCatalogInput),
      usdToCnyRate: prefs?.usdToCnyRate ?? "7.000000",
      defaultsUnavailable,
    };
  });
}

export async function getConversionFormData() {
  return withAccount(async () => {
    const userId = await getUserId();
    const prefs = await ensurePreferences(userId);
    const items = await getEnabledCatalogItems();
    const savedIds = parseDefaultCatalogItemIds(
      prefs.defaultCatalogItemIdsJson,
    );

    // 常用项可以排在目录的显示上限之后，按保存的 ID 单独补齐。
    const unlistedIds = savedIds?.filter(
      (id) => !items.some((item) => item.id === id),
    );
    if (unlistedIds?.length) {
      const extraItems = await getActiveCatalogItemsByIds(userId, unlistedIds);
      items.push(...extraItems.filter((item) => item.priceMinor > 0));
    }

    const { defaultItems, defaultsUnavailable } = resolveDefaultCatalogItems(
      savedIds,
      items,
    );
    return {
      items,
      prefs,
      defaultItemIds: defaultItems.map((item) => item.id),
      defaultsUnavailable,
    };
  });
}

export async function saveDefaultConversionItems(ids: number[]) {
  return withAccount(async () => {
    const userId = await getUserId();
    const parsed = defaultCatalogItemIdsSchema.safeParse(ids);
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "常用对照无效" };

    const items = await getActiveCatalogItemsByIds(userId, parsed.data);
    if (
      items.length !== parsed.data.length ||
      items.some((item) => item.priceMinor <= 0)
    )
      return { error: "部分比较项不可用，请重新选择" };

    await ensurePreferences(userId);
    await db
      .update(conversionPreferences)
      .set({
        defaultCatalogItemIdsJson: JSON.stringify(parsed.data),
        updatedAt: new Date(),
      })
      .where(eq(conversionPreferences.userId, userId));

    revalidatePath("/convert");
    revalidatePath("/dashboard");
    return { ok: true };
  });
}

export async function getConversions(limit = 30) {
  return withAccount(async () => {
    const userId = await getUserId();
    return db
      .select()
      .from(spendConversions)
      .where(eq(spendConversions.userId, userId))
      .orderBy(desc(spendConversions.createdAt))
      .limit(limit);
  });
}

export async function getConversionCheckIn(): Promise<{
  id: number;
  cooldownEndsAt: Date;
} | null> {
  return withAccount(async () => {
    const userId = await getUserId();
    const { id, cooldownEndsAt } = spendConversions;
    const stillCooling = gt(cooldownEndsAt, new Date());
    const [candidate] = await db
      .select({ id, cooldownEndsAt })
      .from(spendConversions)
      .where(
        and(
          eq(spendConversions.userId, userId),
          eq(spendConversions.decisionStage, "considering"),
          isNull(spendConversions.resolution),
          isNotNull(cooldownEndsAt),
        ),
      )
      .orderBy(
        // 先按即将到期排序，没有进行中的计时再选最近到期的一条。
        sql`case when ${stillCooling} then ${cooldownEndsAt} end asc nulls last`,
        desc(cooldownEndsAt),
        desc(id),
      )
      .limit(1);

    return candidate?.cooldownEndsAt
      ? { id: candidate.id, cooldownEndsAt: candidate.cooldownEndsAt }
      : null;
  });
}

export async function getConversion(id: number) {
  return withAccount(async () => {
    const userId = await getUserId();
    const [row] = await db
      .select()
      .from(spendConversions)
      .where(
        and(eq(spendConversions.id, id), eq(spendConversions.userId, userId)),
      )
      .limit(1);
    return row ?? null;
  });
}

/** 派生摘要:保护金额与实际转向金额分列,绝不合并 */
export async function getConversionSummary() {
  return withAccount(async () => {
    const userId = await getUserId();
    const rows = await db
      .select({
        inputCurrency: spendConversions.inputCurrency,
        inputToCnyRate: spendConversions.inputToCnyRate,
        plannedAmountMinor: spendConversions.plannedAmountMinor,
        actualAmountMinor: spendConversions.actualAmountMinor,
        redirectedAmountMinor: spendConversions.redirectedAmountMinor,
        outcomeAmountsInCny: spendConversions.outcomeAmountsInCny,
        resolution: spendConversions.resolution,
        decisionStage: spendConversions.decisionStage,
        cooldownEndsAt: spendConversions.cooldownEndsAt,
      })
      .from(spendConversions)
      .where(eq(spendConversions.userId, userId));

    const considering = rows.filter((r) => r.decisionStage === "considering");
    const withCooldown = considering.filter((r) => r.cooldownEndsAt !== null);
    let protectedMinor = BigInt(0);
    let redirectedMinor = BigInt(0);
    let historySpentMinor = BigInt(0);
    let historySpentUncertainCount = 0;
    for (const row of rows) {
      const amounts = getConversionCnyAmounts(row);
      protectedMinor += BigInt(amounts.protectedCnyMinor ?? 0);
      redirectedMinor += BigInt(row.redirectedAmountMinor);
      if (amounts.actualCnyMinor !== null) {
        historySpentMinor += BigInt(amounts.actualCnyMinor);
      } else if (
        row.decisionStage === "spent" ||
        row.resolution === "spent" ||
        row.resolution === "partial"
      ) {
        historySpentUncertainCount++;
      }
    }
    return {
      totalCount: rows.length,
      protectedMinor,
      redirectedMinor,
      avoidedCount: considering.filter((r) => r.resolution === "avoided")
        .length,
      cooldownCount: withCooldown.length,
      resolvedCooldownCount: withCooldown.filter((r) => r.resolution !== null)
        .length,
      historySpentMinor,
      historySpentUncertainCount,
    };
  });
}

const createSchema = z.object({
  decisionStage: z.enum(["considering", "spent"]),
  inputCurrency: z.enum(["CNY", "USD"]),
  plannedAmountMinor: z
    .number()
    .int()
    .min(1, "金额需大于 0")
    .max(MAX_SPEND_CONVERSION_MINOR, "金额过大,请分次记录"),
  catalogItemIds: z
    .array(catalogItemIdSchema)
    .min(1, "请至少选择 1 个比较项")
    .refine((ids) => new Set(ids).size === ids.length, "比较项不能重复"),
  privacyLabel: z.string().min(1).max(20),
  sensitiveLabel: z.string().max(40).nullable().default(null),
  expectedQuoteKey: z.string().min(1).max(100_000).optional(),
});

export async function createSpendConversion(
  input: z.infer<typeof createSchema>,
) {
  return withAccount(async () => {
    const userId = await getUserId();
    const parsed = createSchema.safeParse(input);
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "输入无效" };
    const data = parsed.data;
    const rows = await getActiveCatalogItemsByIds(userId, data.catalogItemIds);
    const staleQuote = {
      error: "比较项或汇率已更新，请核对本次换算后再保存。",
      staleQuote: true,
      currentItems: rows.filter((row) => row.priceMinor > 0),
    };

    if (rows.length !== data.catalogItemIds.length)
      return data.expectedQuoteKey
        ? staleQuote
        : { error: "部分比较项不可用，请重新选择" };
    const invalid = rows.find((row) => row.priceMinor <= 0);
    if (invalid)
      return data.expectedQuoteKey
        ? staleQuote
        : { error: `「${invalid.name}」缺少有效单价,请先在目录中补全` };

    const rowsById = new Map(rows.map((row) => [row.id, row]));
    const items = data.catalogItemIds.map((id) =>
      toCatalogInput(rowsById.get(id)!),
    );

    const prefs = await ensurePreferences(userId);
    if (
      data.expectedQuoteKey &&
      data.expectedQuoteKey !==
        conversionQuoteKey(data.inputCurrency, prefs.usdToCnyRate, items)
    ) {
      return staleQuote;
    }

    const snapshot = buildSnapshot({
      inputCurrency: data.inputCurrency,
      amountMinor: data.plannedAmountMinor,
      usdToCnyRate: prefs.usdToCnyRate,
      items,
    });

    // 已经发生的消费:进入历史支出,永不产生保护金额;达到高影响阈值则建事件待复盘
    let eventCaseId: number | null = null;
    if (
      data.decisionStage === "spent" &&
      snapshot.input.cnyAmountMinor >= prefs.highImpactThresholdMinor
    ) {
      const [created] = await db
        .insert(eventCases)
        .values({
          userId,
          title: `${data.privacyLabel} · ¥${Math.round(snapshot.input.cnyAmountMinor / 100).toLocaleString("zh-CN")}`,
          summary: "高影响消费,已完成价值换算,待复盘。",
          eventType: "consumption",
          scene: "custom",
          status: "closed",
          moneyLoss: Math.round(snapshot.input.cnyAmountMinor / 100),
          reviewed: false,
        })
        .returning({ id: eventCases.id });
      eventCaseId = created?.id ?? null;
    }

    const [row] = await db
      .insert(spendConversions)
      .values({
        userId,
        eventCaseId,
        decisionStage: data.decisionStage,
        privacyLabel: data.privacyLabel,
        sensitiveLabel: data.sensitiveLabel,
        inputCurrency: data.inputCurrency,
        plannedAmountMinor: data.plannedAmountMinor,
        inputToCnyRate: snapshot.input.toCnyRate,
        snapshotJson: JSON.stringify(snapshot),
      })
      .returning({ id: spendConversions.id });

    revalidatePath("/convert");
    return { id: row.id };
  });
}

const cooldownSchema = z.object({
  conversionId: z.number().int().positive(),
  durationMinutes: z
    .number()
    .int()
    .min(1, "冷静期至少 1 分钟")
    .max(MAX_COOLDOWN_MINUTES, "冷静期最多 7 天"),
  minimumAction: z.string().min(1, "请选择一个最小行动").max(200),
});

export async function startConversionCooldown(
  input: z.infer<typeof cooldownSchema>,
) {
  return withAccount(async () => {
    const userId = await getUserId();
    const parsed = cooldownSchema.safeParse(input);
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "输入无效" };
    const data = parsed.data;

    const [row] = await db
      .select()
      .from(spendConversions)
      .where(
        and(
          eq(spendConversions.id, data.conversionId),
          eq(spendConversions.userId, userId),
        ),
      )
      .limit(1);
    if (!row) return { error: "记录不存在" };
    if (row.decisionStage !== "considering")
      return { error: "已经发生的消费不需要冷静期" };
    if (row.resolution) return { error: "该记录已有最终结果,不能重开冷静期" };
    if (row.cooldownEndsAt && !isCooldownOver(row.cooldownEndsAt))
      return { error: "冷静期正在进行中" };

    await db
      .update(spendConversions)
      .set({
        cooldownMinutes: data.durationMinutes,
        cooldownEndsAt: new Date(Date.now() + data.durationMinutes * 60_000),
        minimumAction: data.minimumAction,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(spendConversions.id, data.conversionId),
          eq(spendConversions.userId, userId),
        ),
      );

    revalidatePath(`/convert/${data.conversionId}`);
    revalidatePath("/convert");
    revalidatePath("/dashboard");
    revalidatePath("/");
    revalidatePath("/lifespan");
    return { ok: true };
  });
}

const resolveSchema = z
  .object({
    conversionId: z.number().int().positive(),
    resolution: z.enum(["avoided", "partial", "spent", "unknown"]),
    actualAmountMinor: z.number().int().min(0).nullable().default(null),
    redirectedAmountMinor: z.number().int().min(0).default(0),
    redirectTarget: z.string().max(80).nullable().default(null),
    expectedPlannedCnyMinor: z.number().int().min(0).optional(),
  })
  .refine(
    (v) =>
      v.resolution !== "partial" ||
      (v.actualAmountMinor !== null && v.actualAmountMinor > 0),
    {
      message: "部分消费必须填写实际消费金额",
      path: ["actualAmountMinor"],
    },
  );

export async function resolveSpendConversion(
  input: z.infer<typeof resolveSchema>,
) {
  return withAccount(async () => {
    const userId = await getUserId();
    const parsed = resolveSchema.safeParse(input);
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "输入无效" };
    const data = parsed.data;

    const [row] = await db
      .select()
      .from(spendConversions)
      .where(
        and(
          eq(spendConversions.id, data.conversionId),
          eq(spendConversions.userId, userId),
        ),
      )
      .limit(1);
    if (!row) return { error: "记录不存在" };
    if (row.resolution)
      return { error: "该记录已有最终结果,如需修改请新建一次换算" };
    if (row.decisionStage !== "considering")
      return { error: "这笔支出已发生，无需再次记录最终决定。" };

    const plannedCnyMinor = getPlannedConversionCnyMinor(row);
    if (plannedCnyMinor === null)
      return { error: "原换算汇率不可用，无法计算资金去向。" };
    if (
      (row.inputCurrency !== "CNY" ||
        data.expectedPlannedCnyMinor !== undefined) &&
      data.expectedPlannedCnyMinor !== plannedCnyMinor
    ) {
      return { error: "计划金额口径已更新，请刷新页面后再记录结果。" };
    }

    const actualMinor =
      data.resolution === "spent"
        ? (data.actualAmountMinor ?? plannedCnyMinor)
        : data.resolution === "partial"
          ? data.actualAmountMinor
          : null;
    const protectedMinor = computeProtectedMinor(
      data.resolution,
      plannedCnyMinor,
      actualMinor,
    );
    if (data.redirectedAmountMinor > protectedMinor) {
      return {
        error: `实际转向金额不能超过保护金额 ${formatCny(protectedMinor)}`,
      };
    }

    await db
      .update(spendConversions)
      .set({
        resolution: data.resolution,
        actualAmountMinor: actualMinor,
        protectedAmountMinor: protectedMinor,
        redirectedAmountMinor: data.redirectedAmountMinor,
        outcomeAmountsInCny: true,
        redirectTarget: data.redirectTarget,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(spendConversions.id, data.conversionId),
          eq(spendConversions.userId, userId),
        ),
      );

    revalidatePath(`/convert/${data.conversionId}`);
    revalidatePath("/convert");
    revalidatePath("/archive");
    revalidatePath("/dashboard");
    revalidatePath("/");
    revalidatePath("/lifespan");
    return { ok: true };
  });
}

/** 关联既有冲动消费规则;没有则创建一条 active 规则,不重复造第二套规则库 */
export async function linkConversionRule(conversionId: number) {
  return withAccount(async () => {
    const userId = await getUserId();
    const [row] = await db
      .select({ id: spendConversions.id, ruleId: spendConversions.ruleId })
      .from(spendConversions)
      .where(
        and(
          eq(spendConversions.id, conversionId),
          eq(spendConversions.userId, userId),
        ),
      )
      .limit(1);
    if (!row) return { error: "记录不存在" };
    if (row.ruleId) return { ruleId: row.ruleId };

    const [existing] = await db
      .select({ id: confirmationRules.id })
      .from(confirmationRules)
      .where(
        and(
          eq(confirmationRules.userId, userId),
          eq(confirmationRules.weaknessKey, "impulsive_spending"),
        ),
      )
      .orderBy(desc(confirmationRules.updatedAt))
      .limit(1);

    let ruleId = existing?.id;
    if (!ruleId) {
      const [created] = await db
        .insert(confirmationRules)
        .values({
          userId,
          domain: "spending",
          scenario: "非计划消费付款前",
          ruleText: SUGGESTED_RULE_TEXT,
          triggerCondition: "准备支付超过阈值的非计划消费",
          recommendedAction: "打开价值换算,等待至少 2 小时后再决定",
          weaknessKey: "impulsive_spending",
          sourceType: "manual",
          status: "active",
          isActive: true,
          severity: "high",
        })
        .returning({ id: confirmationRules.id });
      ruleId = created.id;
    }

    await db
      .update(spendConversions)
      .set({ ruleId, updatedAt: new Date() })
      .where(
        and(
          eq(spendConversions.id, conversionId),
          eq(spendConversions.userId, userId),
        ),
      );
    await db
      .update(confirmationRules)
      .set({
        matchCount: sql`${confirmationRules.matchCount} + 1`,
        lastMatchedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(confirmationRules.id, ruleId),
          eq(confirmationRules.userId, userId),
        ),
      );

    revalidatePath(`/convert/${conversionId}`);
    return { ruleId };
  });
}

const catalogSchema = z.object({
  id: catalogItemIdSchema.nullable().default(null),
  name: z.string().trim().min(1, "请填写名称").max(80),
  billingType: z.enum([
    "subscription",
    "credit_pack",
    "single_unit",
    "range_unit",
  ]),
  currency: z.enum(["CNY", "USD", "THB"]),
  priceMinor: z
    .number()
    .int()
    .min(1, "单价需大于 0")
    .max(POSTGRES_INT_MAX, "单价过大"),
  maxPriceMinor: z
    .number()
    .int()
    .min(1)
    .max(POSTGRES_INT_MAX, "价格上限过大")
    .nullable()
    .default(null),
  unitLabel: z.string().trim().min(1, "请填写单位").max(20),
  sourceNote: z.string().trim().max(200).nullable().default(null),
  useInConversion: z.boolean().default(false),
});

export async function upsertCatalogItem(
  input: z.input<typeof catalogSchema>,
): Promise<
  { error: string } | { ok: true; item: SpendingAnchor; reused: boolean }
> {
  return withAccount(async () => {
    const userId = await getUserId();
    const parsed = catalogSchema.safeParse(input);
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "输入无效" };
    const data = parsed.data;
    if (data.billingType === "range_unit") {
      if (data.maxPriceMinor === null)
        return { error: "区间单价必须填写价格上限" };
      if (data.maxPriceMinor < data.priceMinor)
        return { error: "价格上限不能小于下限" };
    }

    const itemFields = {
      name: data.name,
      billingType: data.billingType,
      currency: data.currency,
      priceMinor: data.priceMinor,
      maxPriceMinor:
        data.billingType === "range_unit" ? data.maxPriceMinor : null,
      unitLabel: data.unitLabel,
      sourceNote: data.sourceNote || null,
    };

    if (data.useInConversion && !data.id) {
      // The account transaction serializes matching and insertion, including retries.
      const candidates = await db
        .select()
        .from(spendingAnchors)
        .where(
          and(
            eq(spendingAnchors.userId, userId),
            eq(spendingAnchors.isActive, true),
            eq(spendingAnchors.billingType, itemFields.billingType),
            eq(spendingAnchors.currency, itemFields.currency),
            eq(spendingAnchors.priceMinor, itemFields.priceMinor),
            itemFields.maxPriceMinor === null
              ? isNull(spendingAnchors.maxPriceMinor)
              : eq(spendingAnchors.maxPriceMinor, itemFields.maxPriceMinor),
          ),
        )
        .orderBy(spendingAnchors.id);
      const existing = candidates.find(
        (row) =>
          row.name.trim() === itemFields.name &&
          row.unitLabel.trim() === itemFields.unitLabel &&
          (row.sourceNote?.trim() || null) === itemFields.sourceNote,
      );
      if (existing) return { ok: true, item: existing, reused: true };
    }

    const prefs = await ensurePreferences(userId);
    const rate = currencyToCnyRate(data.currency, prefs.usdToCnyRate);
    const priceTooLarge = { error: "按当前汇率折算后的单价过大" };
    let priceCny: number;
    try {
      const cnyMinor = applyRate(
        data.priceMinor,
        rateToMicro(rate) ?? 1_000_000,
      );
      priceCny = Math.max(Math.round(cnyMinor / 100), 1);
    } catch {
      return priceTooLarge;
    }
    if (priceCny > POSTGRES_INT_MAX) return priceTooLarge;
    const values = { ...itemFields, priceCny, updatedAt: new Date() };

    // 更新目录不影响历史快照(快照写入后不可变)
    const [item] = data.id
      ? await db
          .update(spendingAnchors)
          .set(values)
          .where(
            and(
              eq(spendingAnchors.id, data.id),
              eq(spendingAnchors.userId, userId),
            ),
          )
          .returning()
      : await db
          .insert(spendingAnchors)
          .values({ userId, sourceType: "history", sortOrder: 99, ...values })
          .returning();
    if (!item) return { error: "比较项不存在" };
    revalidatePath("/convert/catalog");
    revalidatePath("/convert");
    revalidatePath("/dashboard");
    return { ok: true, item, reused: false };
  });
}

export async function toggleCatalogItem(id: number, isActive: boolean) {
  return withAccount(async () => {
    const userId = await getUserId();
    await db
      .update(spendingAnchors)
      .set({ isActive, updatedAt: new Date() })
      .where(
        and(eq(spendingAnchors.id, id), eq(spendingAnchors.userId, userId)),
      );
    revalidatePath("/convert/catalog");
    revalidatePath("/convert");
    revalidatePath("/dashboard");
    return { ok: true };
  });
}

const prefsSchema = z.object({
  usdToCnyRate: z.string().min(1),
  defaultCooldownMinutes: z.number().int().min(1).max(MAX_COOLDOWN_MINUTES),
  highImpactThresholdMinor: z.number().int().min(100),
  privacyMode: z.enum(["neutral", "explicit"]),
});

export async function updateConversionPreferences(
  input: z.infer<typeof prefsSchema>,
) {
  return withAccount(async () => {
    const userId = await getUserId();
    const parsed = prefsSchema.safeParse(input);
    if (!parsed.success)
      return { error: parsed.error.issues[0]?.message ?? "输入无效" };
    const rate = normalizeRate(parsed.data.usdToCnyRate);
    if (!rate) return { error: "汇率必须是大于 0 的数字" };

    await ensurePreferences(userId);
    await db
      .update(conversionPreferences)
      .set({
        usdToCnyRate: rate,
        defaultCooldownMinutes: parsed.data.defaultCooldownMinutes,
        highImpactThresholdMinor: parsed.data.highImpactThresholdMinor,
        privacyMode: parsed.data.privacyMode,
        updatedAt: new Date(),
      })
      .where(eq(conversionPreferences.userId, userId));
    revalidatePath("/convert/catalog");
    revalidatePath("/convert");
    revalidatePath("/dashboard");
    return { ok: true };
  });
}

/** 保留已关联规则的历史结果，包括早期版本生成的验证计数。 */
export async function deleteSpendConversion(id: number) {
  return withAccount(async () => {
    const userId = await getUserId();
    const [row] = await db
      .select({
        ruleId: spendConversions.ruleId,
        resolution: spendConversions.resolution,
      })
      .from(spendConversions)
      .where(
        and(eq(spendConversions.id, id), eq(spendConversions.userId, userId)),
      )
      .limit(1);
    if (!row) return { error: "记录不存在" };
    if (row.ruleId && row.resolution) {
      return { error: "这条已保存的换算结果与规则有关联，暂不能删除。" };
    }
    await db
      .delete(spendConversions)
      .where(
        and(eq(spendConversions.id, id), eq(spendConversions.userId, userId)),
      );
    revalidatePath("/convert");
    revalidatePath("/dashboard");
    revalidatePath("/");
    revalidatePath("/lifespan");
    return { ok: true };
  });
}

/** 换算详情:同时返回解析后的快照,快照损坏时降级为 null */
export async function getConversionDetail(id: number) {
  return withAccount(async () => {
    const row = await getConversion(id);
    if (!row) return null;
    return { conversion: row, snapshot: parseSnapshot(row.snapshotJson) };
  });
}
