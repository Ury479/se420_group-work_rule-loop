"use server"

import { db } from "@/lib/db"
import { conversionPreferences, confirmationRules, eventCases, spendConversions, spendingAnchors } from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import {
  MAX_COOLDOWN_MINUTES,
  applyRate,
  buildSnapshot,
  computeProtectedMinor,
  currencyToCnyRate,
  isCooldownOver,
  normalizeRate,
  parseSnapshot,
  rateToMicro,
  type BillingType,
  type CatalogInput,
  type CurrencyCode,
} from "@/lib/convert-domain"

// ─────────────────────────────────────────────
// 消费价值换算与冲动拦截
// 所有金额以整数分在服务端重新计算,客户端派生值一律不信任
// 每条查询必须 eq(userId) 隔离
// ─────────────────────────────────────────────

// PRD 预置价值目录:全部标记「用户录入,未自动核验」
const PRESET_CATALOG = [
  { name: "GPT Pro", billingType: "subscription", currency: "USD", priceMinor: 10000, unitLabel: "个月", category: "ai_tool" },
  { name: "豆包个人高阶版", billingType: "subscription", currency: "CNY", priceMinor: 15900, unitLabel: "个月", category: "ai_tool" },
  { name: "v0", billingType: "subscription", currency: "CNY", priceMinor: 15000, unitLabel: "个月", category: "ai_tool" },
  { name: "Kimi", billingType: "subscription", currency: "CNY", priceMinor: 30000, unitLabel: "个月", category: "ai_tool" },
  { name: "智谱官方额度", billingType: "subscription", currency: "CNY", priceMinor: 30000, unitLabel: "个月", category: "ai_tool" },
  { name: "Cursor Pro", billingType: "subscription", currency: "USD", priceMinor: 2000, unitLabel: "个月", category: "ai_tool" },
  { name: "Claude Max", billingType: "subscription", currency: "USD", priceMinor: 10000, unitLabel: "个月", category: "ai_tool" },
  { name: "Claude Pro 年付月均", billingType: "subscription", currency: "USD", priceMinor: 1700, unitLabel: "个月", category: "ai_tool" },
  { name: "GPT API 额度包", billingType: "credit_pack", currency: "USD", priceMinor: 20000, unitLabel: "包", category: "ai_tool" },
  { name: "日常一顿饭", billingType: "range_unit", currency: "CNY", priceMinor: 4000, maxPriceMinor: 6000, unitLabel: "顿", category: "dining" },
  { name: "面膜", billingType: "single_unit", currency: "CNY", priceMinor: 17000, unitLabel: "份", category: "shopping" },
] as const

const SUGGESTED_RULE_TEXT =
  "当我准备进行超过自定义阈值的非计划消费,并注意到自己想立刻付款时,先打开价值换算,等待至少 2 小时,再决定是否支付。"

async function ensurePreferences(userId: string) {
  const [existing] = await db
    .select()
    .from(conversionPreferences)
    .where(eq(conversionPreferences.userId, userId))
    .limit(1)
  if (existing) return existing
  const [created] = await db.insert(conversionPreferences).values({ userId }).returning()
  return created
}

// 幂等播种:只补缺失的目录项,不覆盖用户已编辑的价格
async function seedCatalogIfMissing(userId: string) {
  const existing = await db
    .select({ name: spendingAnchors.name })
    .from(spendingAnchors)
    .where(eq(spendingAnchors.userId, userId))
  const existingNames = new Set(existing.map((row) => row.name))
  const missing = PRESET_CATALOG.filter((item) => !existingNames.has(item.name))
  if (missing.length === 0) return
  await db.insert(spendingAnchors).values(
    missing.map((item, index) => {
      const rate = currencyToCnyRate(item.currency as CurrencyCode, "7.000000")
      const cnyMinor = applyRate(item.priceMinor, rateToMicro(rate) ?? 1_000_000)
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
        maxPriceMinor: "maxPriceMinor" in item ? (item.maxPriceMinor as number) : null,
        sortOrder: index,
        sourceNote: "用户录入,未自动核验",
      }
    }),
  )
}

export async function getConversionPreferences() {
  const userId = await getUserId()
  return ensurePreferences(userId)
}

export async function getCatalogItems() {
  const userId = await getUserId()
  await seedCatalogIfMissing(userId)
  return db
    .select()
    .from(spendingAnchors)
    .where(eq(spendingAnchors.userId, userId))
    .orderBy(spendingAnchors.sortOrder, spendingAnchors.priceMinor)
    .limit(200)
}

export async function getEnabledCatalogItems() {
  const items = await getCatalogItems()
  return items.filter((item) => item.isActive && item.priceMinor > 0)
}

export async function getConversions(limit = 30) {
  const userId = await getUserId()
  return db
    .select()
    .from(spendConversions)
    .where(eq(spendConversions.userId, userId))
    .orderBy(desc(spendConversions.createdAt))
    .limit(limit)
}

export async function getConversion(id: number) {
  const userId = await getUserId()
  const [row] = await db
    .select()
    .from(spendConversions)
    .where(and(eq(spendConversions.id, id), eq(spendConversions.userId, userId)))
    .limit(1)
  return row ?? null
}

/** 派生摘要:保护金额与实际转向金额分列,绝不合并 */
export async function getConversionSummary() {
  const userId = await getUserId()
  const rows = await db
    .select({
      protectedMinor: spendConversions.protectedAmountMinor,
      redirectedMinor: spendConversions.redirectedAmountMinor,
      resolution: spendConversions.resolution,
      decisionStage: spendConversions.decisionStage,
      cooldownEndsAt: spendConversions.cooldownEndsAt,
      plannedMinor: spendConversions.plannedAmountMinor,
    })
    .from(spendConversions)
    .where(eq(spendConversions.userId, userId))
    .limit(500)

  const considering = rows.filter((r) => r.decisionStage === "considering")
  const withCooldown = considering.filter((r) => r.cooldownEndsAt !== null)
  return {
    totalCount: rows.length,
    protectedMinor: rows.reduce((sum, r) => sum + r.protectedMinor, 0),
    redirectedMinor: rows.reduce((sum, r) => sum + r.redirectedMinor, 0),
    avoidedCount: rows.filter((r) => r.resolution === "avoided").length,
    cooldownCount: withCooldown.length,
    resolvedCooldownCount: withCooldown.filter((r) => r.resolution !== null).length,
    historySpentMinor: rows
      .filter((r) => r.decisionStage === "spent" || r.resolution === "spent")
      .reduce((sum, r) => sum + r.plannedMinor, 0),
  }
}

const createSchema = z.object({
  decisionStage: z.enum(["considering", "spent"]),
  inputCurrency: z.enum(["CNY", "USD"]),
  plannedAmountMinor: z.number().int().min(1, "金额需大于 0").max(10_000_000_00),
  catalogItemIds: z.array(z.number().int().positive()).min(1, "请至少选择 1 个比较项"),
  privacyLabel: z.string().min(1).max(20),
  sensitiveLabel: z.string().max(40).nullable().default(null),
})

export async function createSpendConversion(input: z.infer<typeof createSchema>) {
  const userId = await getUserId()
  const parsed = createSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  const data = parsed.data

  const [prefs, rows] = await Promise.all([
    ensurePreferences(userId),
    db
      .select()
      .from(spendingAnchors)
      .where(and(eq(spendingAnchors.userId, userId), inArray(spendingAnchors.id, data.catalogItemIds))),
  ])
  if (rows.length === 0) return { error: "选中的比较项不存在" }
  const invalid = rows.find((row) => row.priceMinor <= 0)
  if (invalid) return { error: `「${invalid.name}」缺少有效单价,请先在目录中补全` }

  const items: CatalogInput[] = rows.map((row) => ({
    catalogItemId: row.id,
    name: row.name,
    billingType: row.billingType as BillingType,
    currency: row.currency as CurrencyCode,
    priceMinor: row.priceMinor,
    maxPriceMinor: row.maxPriceMinor,
    unitLabel: row.unitLabel,
  }))

  const snapshot = buildSnapshot({
    inputCurrency: data.inputCurrency,
    amountMinor: data.plannedAmountMinor,
    usdToCnyRate: prefs.usdToCnyRate,
    items,
  })

  // 已经发生的消费:进入历史支出,永不产生保护金额;达到高影响阈值则建事件待复盘
  let eventCaseId: number | null = null
  if (data.decisionStage === "spent" && snapshot.input.cnyAmountMinor >= prefs.highImpactThresholdMinor) {
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
      .returning({ id: eventCases.id })
    eventCaseId = created?.id ?? null
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
    .returning({ id: spendConversions.id })

  revalidatePath("/convert")
  redirect(`/convert/${row.id}`)
}

const cooldownSchema = z.object({
  conversionId: z.number().int().positive(),
  durationMinutes: z.number().int().min(1, "冷静期至少 1 分钟").max(MAX_COOLDOWN_MINUTES, "冷静期最多 7 天"),
  minimumAction: z.string().min(1, "请选择一个最小行动").max(200),
})

export async function startConversionCooldown(input: z.infer<typeof cooldownSchema>) {
  const userId = await getUserId()
  const parsed = cooldownSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  const data = parsed.data

  const [row] = await db
    .select()
    .from(spendConversions)
    .where(and(eq(spendConversions.id, data.conversionId), eq(spendConversions.userId, userId)))
    .limit(1)
  if (!row) return { error: "记录不存在" }
  if (row.decisionStage !== "considering") return { error: "已经发生的消费不需要冷静期" }
  if (row.resolution) return { error: "该记录已有最终结果,不能重开冷静期" }
  if (row.cooldownEndsAt && !isCooldownOver(row.cooldownEndsAt)) return { error: "冷静期正在进行中" }

  await db
    .update(spendConversions)
    .set({
      cooldownMinutes: data.durationMinutes,
      cooldownEndsAt: new Date(Date.now() + data.durationMinutes * 60_000),
      minimumAction: data.minimumAction,
      updatedAt: new Date(),
    })
    .where(and(eq(spendConversions.id, data.conversionId), eq(spendConversions.userId, userId)))

  revalidatePath(`/convert/${data.conversionId}`)
  revalidatePath("/convert")
  return { ok: true }
}

const resolveSchema = z
  .object({
    conversionId: z.number().int().positive(),
    resolution: z.enum(["avoided", "partial", "spent", "unknown"]),
    actualAmountMinor: z.number().int().min(0).nullable().default(null),
    redirectedAmountMinor: z.number().int().min(0).default(0),
    redirectTarget: z.string().max(80).nullable().default(null),
  })
  .refine((v) => v.resolution !== "partial" || (v.actualAmountMinor !== null && v.actualAmountMinor > 0), {
    message: "部分消费必须填写实际消费金额",
    path: ["actualAmountMinor"],
  })

export async function resolveSpendConversion(input: z.infer<typeof resolveSchema>) {
  const userId = await getUserId()
  const parsed = resolveSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  const data = parsed.data

  const [row] = await db
    .select()
    .from(spendConversions)
    .where(and(eq(spendConversions.id, data.conversionId), eq(spendConversions.userId, userId)))
    .limit(1)
  if (!row) return { error: "记录不存在" }
  if (row.resolution) return { error: "该记录已有最终结果,如需修改请新建一次换算" }

  // 保护金额永远由服务端按计划金额重新计算
  const actualMinor = data.resolution === "spent" ? (data.actualAmountMinor ?? row.plannedAmountMinor) : data.actualAmountMinor
  const protectedMinor = computeProtectedMinor(data.resolution, row.plannedAmountMinor, actualMinor)
  if (data.redirectedAmountMinor > protectedMinor) {
    return { error: `实际转向金额不能超过保护金额 ¥${(protectedMinor / 100).toFixed(2)}` }
  }

  await db
    .update(spendConversions)
    .set({
      resolution: data.resolution,
      actualAmountMinor: actualMinor,
      protectedAmountMinor: protectedMinor,
      redirectedAmountMinor: data.redirectedAmountMinor,
      redirectTarget: data.redirectTarget,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(spendConversions.id, data.conversionId), eq(spendConversions.userId, userId)))

  // 规则验证证据:想起 + 遵守 → 记一次验证;行为不同 → 记一次有效
  if (row.ruleId) {
    const improved = data.resolution === "avoided" || data.resolution === "partial"
    await db
      .update(confirmationRules)
      .set({
        validatedCount: sql`${confirmationRules.validatedCount} + 1`,
        helpfulCount: improved ? sql`${confirmationRules.helpfulCount} + 1` : confirmationRules.helpfulCount,
        updatedAt: new Date(),
      })
      .where(and(eq(confirmationRules.id, row.ruleId), eq(confirmationRules.userId, userId)))
  }

  revalidatePath(`/convert/${data.conversionId}`)
  revalidatePath("/convert")
  return { ok: true }
}

/** 关联既有冲动消费规则;没有则创建一条 active 规则,不重复造第二套规则库 */
export async function linkConversionRule(conversionId: number) {
  const userId = await getUserId()
  const [row] = await db
    .select({ id: spendConversions.id, ruleId: spendConversions.ruleId })
    .from(spendConversions)
    .where(and(eq(spendConversions.id, conversionId), eq(spendConversions.userId, userId)))
    .limit(1)
  if (!row) return { error: "记录不存在" }
  if (row.ruleId) return { ruleId: row.ruleId }

  const [existing] = await db
    .select({ id: confirmationRules.id })
    .from(confirmationRules)
    .where(and(eq(confirmationRules.userId, userId), eq(confirmationRules.weaknessKey, "impulsive_spending")))
    .orderBy(desc(confirmationRules.updatedAt))
    .limit(1)

  let ruleId = existing?.id
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
      .returning({ id: confirmationRules.id })
    ruleId = created.id
  }

  await db
    .update(spendConversions)
    .set({ ruleId, updatedAt: new Date() })
    .where(and(eq(spendConversions.id, conversionId), eq(spendConversions.userId, userId)))
  await db
    .update(confirmationRules)
    .set({ matchCount: sql`${confirmationRules.matchCount} + 1`, lastMatchedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(confirmationRules.id, ruleId), eq(confirmationRules.userId, userId)))

  revalidatePath(`/convert/${conversionId}`)
  return { ruleId }
}

const catalogSchema = z.object({
  id: z.number().int().positive().nullable().default(null),
  name: z.string().min(1, "请填写名称").max(80),
  billingType: z.enum(["subscription", "credit_pack", "single_unit", "range_unit"]),
  currency: z.enum(["CNY", "USD", "THB"]),
  priceMinor: z.number().int().min(1, "单价需大于 0"),
  maxPriceMinor: z.number().int().min(1).nullable().default(null),
  unitLabel: z.string().min(1, "请填写单位").max(20),
  sourceNote: z.string().max(200).nullable().default(null),
})

export async function upsertCatalogItem(input: z.infer<typeof catalogSchema>) {
  const userId = await getUserId()
  const parsed = catalogSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  const data = parsed.data
  if (data.billingType === "range_unit") {
    if (data.maxPriceMinor === null) return { error: "区间单价必须填写价格上限" }
    if (data.maxPriceMinor < data.priceMinor) return { error: "价格上限不能小于下限" }
  }

  const prefs = await ensurePreferences(userId)
  const rate = currencyToCnyRate(data.currency, prefs.usdToCnyRate)
  const cnyMinor = applyRate(data.priceMinor, rateToMicro(rate) ?? 1_000_000)
  const values = {
    name: data.name,
    billingType: data.billingType,
    currency: data.currency,
    priceMinor: data.priceMinor,
    maxPriceMinor: data.billingType === "range_unit" ? data.maxPriceMinor : null,
    unitLabel: data.unitLabel,
    sourceNote: data.sourceNote,
    priceCny: Math.max(Math.round(cnyMinor / 100), 1),
    updatedAt: new Date(),
  }

  // 更新目录不影响历史快照(快照写入后不可变)
  if (data.id) {
    await db
      .update(spendingAnchors)
      .set(values)
      .where(and(eq(spendingAnchors.id, data.id), eq(spendingAnchors.userId, userId)))
  } else {
    await db.insert(spendingAnchors).values({ userId, sourceType: "history", sortOrder: 99, ...values })
  }
  revalidatePath("/convert/catalog")
  revalidatePath("/convert")
  return { ok: true }
}

export async function toggleCatalogItem(id: number, isActive: boolean) {
  const userId = await getUserId()
  await db
    .update(spendingAnchors)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(spendingAnchors.id, id), eq(spendingAnchors.userId, userId)))
  revalidatePath("/convert/catalog")
  revalidatePath("/convert")
  return { ok: true }
}

const prefsSchema = z.object({
  usdToCnyRate: z.string().min(1),
  defaultCooldownMinutes: z.number().int().min(1).max(MAX_COOLDOWN_MINUTES),
  highImpactThresholdMinor: z.number().int().min(100),
  privacyMode: z.enum(["neutral", "explicit"]),
})

export async function updateConversionPreferences(input: z.infer<typeof prefsSchema>) {
  const userId = await getUserId()
  const parsed = prefsSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  const rate = normalizeRate(parsed.data.usdToCnyRate)
  if (!rate) return { error: "汇率必须是大于 0 的数字" }

  await ensurePreferences(userId)
  await db
    .update(conversionPreferences)
    .set({
      usdToCnyRate: rate,
      defaultCooldownMinutes: parsed.data.defaultCooldownMinutes,
      highImpactThresholdMinor: parsed.data.highImpactThresholdMinor,
      privacyMode: parsed.data.privacyMode,
      updatedAt: new Date(),
    })
    .where(eq(conversionPreferences.userId, userId))
  revalidatePath("/convert/catalog")
  revalidatePath("/convert")
  revalidatePath("/convert/[id]", "page")
  return { ok: true }
}

/** 删除换算:已有规则验证证据时阻止静默删除 */
export async function deleteSpendConversion(id: number) {
  const userId = await getUserId()
  const [row] = await db
    .select({ ruleId: spendConversions.ruleId, resolution: spendConversions.resolution })
    .from(spendConversions)
    .where(and(eq(spendConversions.id, id), eq(spendConversions.userId, userId)))
    .limit(1)
  if (!row) return { error: "记录不存在" }
  if (row.ruleId && row.resolution) {
    return { error: "该记录已作为规则验证证据,请先在规则里处理证据后再删除" }
  }
  await db.delete(spendConversions).where(and(eq(spendConversions.id, id), eq(spendConversions.userId, userId)))
  revalidatePath("/convert")
  revalidatePath(`/convert/${id}`)
  return { ok: true }
}

/** 换算详情:同一次查询读取记录和偏好,快照损坏时降级为 null */
export async function getConversionDetail(id: number) {
  const userId = await getUserId()
  if (!Number.isSafeInteger(id) || id <= 0) return null
  const [row] = await db
    .select({
      conversion: spendConversions,
      prefs: {
        privacyMode: conversionPreferences.privacyMode,
        defaultCooldownMinutes: conversionPreferences.defaultCooldownMinutes,
        usdToCnyRate: conversionPreferences.usdToCnyRate,
      },
    })
    .from(spendConversions)
    .leftJoin(conversionPreferences, eq(conversionPreferences.userId, userId))
    .where(and(eq(spendConversions.id, id), eq(spendConversions.userId, userId)))
    .limit(1)
  if (!row) return null
  return {
    conversion: row.conversion,
    snapshot: parseSnapshot(row.conversion.snapshotJson),
    // 缺少偏好时沿用表默认值;浏览或预取详情不应触发写入。
    prefs: row.prefs ?? { privacyMode: "neutral", defaultCooldownMinutes: 120, usdToCnyRate: "7.000000" },
  }
}
