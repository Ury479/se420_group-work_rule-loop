"use server"

import { db } from "@/lib/db"
import {
  spendingReviews,
  toolPurchaseChecks,
  decisionBaselines,
  spendingReviewExports,
  externalReviewResults,
  decisionRecoveryActions,
  spendingPostmortems,
  ashMemos,
} from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { and, eq, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
  SPENDING_CATEGORIES,
  CURRENT_STATES,
  FUNDING_SOURCES,
  GPT_CONCLUSIONS,
  FINAL_DECISIONS,
  MAINLINE_TYPES,
  calculateDecisionRisk,
  RECOVERY_SUGGESTIONS,
  DEFAULT_BASELINE,
} from "@/lib/spending-review-types"
import { generateReviewMarkdown } from "@/lib/spending-markdown"

// ─────────────────────────────────────────────
// 决策拦截台 Server Actions
// 每个查询都必须 eq(userId) 隔离
// ─────────────────────────────────────────────

const categoryValues = SPENDING_CATEGORIES.map((c) => c.value) as [string, ...string[]]
const stateValues: string[] = CURRENT_STATES.map((s) => s.value)
const fundingValues = FUNDING_SOURCES.map((f) => f.value) as [string, ...string[]]
const gptConclusionValues = GPT_CONCLUSIONS.map((g) => g.value) as [string, ...string[]]
const finalDecisionValues = FINAL_DECISIONS.map((f) => f.value) as [string, ...string[]]
const mainlineValues = MAINLINE_TYPES.map((m) => m.value) as [string, ...string[]]

const reviewSchema = z.object({
  title: z.string().min(1, "支出名称不能为空").max(200),
  category: z.enum(categoryValues),
  amount: z.number().int().min(0).max(10000000),
  currency: z.enum(["CNY", "USD"]).default("CNY"),
  isSubscription: z.boolean().default(false),
  billingCycle: z.string().max(20).optional().nullable(),
  autoRenew: z.boolean().default(false),
  refundable: z.boolean().nullable().default(null),
  reversible: z.boolean().nullable().default(null),
  currentStates: z.array(z.string()).default([]),
  impulseLevel: z.number().int().min(0).max(10).default(0),
  sleepStatus: z.string().max(20).optional().nullable(),
  fundingSource: z.enum(fundingValues),
  monthlyBudgetRemaining: z.number().int().nullable().default(null),
  usesLivingExpense: z.boolean().default(false),
  usesHealthBudget: z.boolean().default(false),
  usesTuition: z.boolean().default(false),
  usesEmergencyFund: z.boolean().default(false),
  usesCredit: z.boolean().default(false),
  realNeed: z.string().max(2000).optional().nullable(),
  problemToSolve: z.string().max(2000).optional().nullable(),
  consequenceIfNotBuy: z.string().max(2000).optional().nullable(),
  emotionalRelief: z.boolean().default(false),
  taskAvoidance: z.boolean().default(false),
  alternatives: z.string().max(2000).optional().nullable(),
  currentMainline: z.string().max(500).optional().nullable(),
  affectsSleep: z.boolean().default(false),
  affectsCourse: z.boolean().default(false),
  affectsDashboard: z.boolean().default(false),
  affectsAlgorithm: z.boolean().default(false),
  affectsAiCourse: z.boolean().default(false),
  affectsPmLearning: z.boolean().default(false),
  affectsTraining: z.boolean().default(false),
  affectsBudget: z.boolean().default(false),
  // 工具专项(可选)
  toolCheck: z
    .object({
      toolName: z.string().max(200).optional().nullable(),
      useCaseNext7Days: z.string().max(2000).optional().nullable(),
      expectedUsageCount: z.number().int().min(0).nullable().default(null),
      existingTools: z.string().max(2000).optional().nullable(),
      overlapDescription: z.string().max(2000).optional().nullable(),
      currentQuotaRemaining: z.string().max(500).optional().nullable(),
      expectedOutput: z.string().max(2000).optional().nullable(),
      canContinueWithoutPurchase: z.boolean().nullable().default(null),
      anxietyDriven: z.boolean().default(false),
    })
    .optional()
    .nullable(),
})

export type SpendingReviewInput = z.infer<typeof reviewSchema>

// 风险阈值(100/300/1000)以人民币为基准;美元支出按近似汇率折算后参与风险计算。
// 注意:"use server" 文件只能导出 async 函数,此常量与逻辑必须保持模块内私有。
const USD_TO_CNY = 7.3

function riskInputFrom(data: SpendingReviewInput, decisionTime: Date) {
  return {
    amount: data.currency === "USD" ? Math.round(data.amount * USD_TO_CNY) : data.amount,
    category: data.category,
    currentStates: data.currentStates.filter((s) => stateValues.includes(s)),
    impulseLevel: data.impulseLevel,
    isSubscription: data.isSubscription,
    reversible: data.reversible,
    decisionTime,
    usesLivingExpense: data.usesLivingExpense,
    usesHealthBudget: data.usesHealthBudget,
    usesTuition: data.usesTuition,
    usesEmergencyFund: data.usesEmergencyFund,
    usesCredit: data.usesCredit,
    affectsSleep: data.affectsSleep,
    affectsCourse: data.affectsCourse,
    affectsDashboard: data.affectsDashboard,
    affectsAlgorithm: data.affectsAlgorithm,
    affectsAiCourse: data.affectsAiCourse,
    affectsPmLearning: data.affectsPmLearning,
  }
}

// ── 创建支出审核 ──

export async function createSpendingReview(input: SpendingReviewInput) {
  const userId = await getUserId()
  const parsed = reviewSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data
  const now = new Date()
  const risk = calculateDecisionRisk(riskInputFrom(data, now))

  // L3 强制延期 / 冷静期
  const coolingUntil = risk.coolingHours > 0 ? new Date(now.getTime() + risk.coolingHours * 3600 * 1000) : null
  const needsGpt = risk.riskLevel === "high" || risk.riskLevel === "critical" || data.amount >= 300
  const decisionStatus = risk.forceDelay || coolingUntil ? "cooling" : needsGpt ? "awaiting_gpt" : "draft"

  const [row] = await db
    .insert(spendingReviews)
    .values({
      userId,
      title: data.title,
      category: data.category,
      amount: data.amount,
      currency: data.currency,
      isSubscription: data.isSubscription,
      billingCycle: data.billingCycle || null,
      autoRenew: data.autoRenew,
      refundable: data.refundable,
      reversible: data.reversible,
      decisionTime: now,
      timeRiskLevel: risk.timeRisk.level,
      currentStates: data.currentStates.filter((s) => stateValues.includes(s)).join(","),
      impulseLevel: data.impulseLevel,
      sleepStatus: data.sleepStatus || null,
      fundingSource: data.fundingSource,
      monthlyBudgetRemaining: data.monthlyBudgetRemaining,
      usesLivingExpense: data.usesLivingExpense,
      usesHealthBudget: data.usesHealthBudget,
      usesTuition: data.usesTuition,
      usesEmergencyFund: data.usesEmergencyFund,
      usesCredit: data.usesCredit,
      realNeed: data.realNeed || null,
      problemToSolve: data.problemToSolve || null,
      consequenceIfNotBuy: data.consequenceIfNotBuy || null,
      emotionalRelief: data.emotionalRelief,
      taskAvoidance: data.taskAvoidance,
      alternatives: data.alternatives || null,
      currentMainline: data.currentMainline || null,
      affectsSleep: data.affectsSleep,
      affectsCourse: data.affectsCourse,
      affectsDashboard: data.affectsDashboard,
      affectsAlgorithm: data.affectsAlgorithm,
      affectsAiCourse: data.affectsAiCourse,
      affectsPmLearning: data.affectsPmLearning,
      affectsTraining: data.affectsTraining,
      affectsBudget: data.affectsBudget,
      riskLevel: risk.riskLevel,
      riskTriggers: risk.triggers.join(","),
      decisionStatus,
      coolingUntil,
      systemRecommendation: risk.recommendation,
    })
    .returning()

  // 工具专项审查
  const isToolCategory = ["ai_tool", "software", "course"].includes(data.category)
  if (isToolCategory && data.toolCheck) {
    await db.insert(toolPurchaseChecks).values({
      userId,
      spendingReviewId: row.id,
      toolName: data.toolCheck.toolName || null,
      useCaseNext7Days: data.toolCheck.useCaseNext7Days || null,
      expectedUsageCount: data.toolCheck.expectedUsageCount,
      existingTools: data.toolCheck.existingTools || null,
      overlapDescription: data.toolCheck.overlapDescription || null,
      currentQuotaRemaining: data.toolCheck.currentQuotaRemaining || null,
      expectedOutput: data.toolCheck.expectedOutput || null,
      canContinueWithoutPurchase: data.toolCheck.canContinueWithoutPurchase,
      anxietyDriven: data.toolCheck.anxietyDriven,
    })
  }

  revalidatePath("/spending-review")
  revalidatePath("/")
  return { review: row, risk }
}

// ── 查询 ──

export async function getSpendingReviews() {
  const userId = await getUserId()
  return db
    .select()
    .from(spendingReviews)
    .where(eq(spendingReviews.userId, userId))
    .orderBy(desc(spendingReviews.createdAt))
}

export async function getSpendingReview(id: number) {
  const userId = await getUserId()
  const [review] = await db
    .select()
    .from(spendingReviews)
    .where(and(eq(spendingReviews.id, id), eq(spendingReviews.userId, userId)))
  if (!review) return null

  const [toolCheck] = await db
    .select()
    .from(toolPurchaseChecks)
    .where(and(eq(toolPurchaseChecks.spendingReviewId, id), eq(toolPurchaseChecks.userId, userId)))
  const [exportRecord] = await db
    .select()
    .from(spendingReviewExports)
    .where(and(eq(spendingReviewExports.spendingReviewId, id), eq(spendingReviewExports.userId, userId)))
    .orderBy(desc(spendingReviewExports.exportedAt))
  const [gptResult] = await db
    .select()
    .from(externalReviewResults)
    .where(and(eq(externalReviewResults.spendingReviewId, id), eq(externalReviewResults.userId, userId)))
    .orderBy(desc(externalReviewResults.createdAt))
  const recoveryActions = await db
    .select()
    .from(decisionRecoveryActions)
    .where(and(eq(decisionRecoveryActions.spendingReviewId, id), eq(decisionRecoveryActions.userId, userId)))
    .orderBy(desc(decisionRecoveryActions.createdAt))
  const [postmortem] = await db
    .select()
    .from(spendingPostmortems)
    .where(and(eq(spendingPostmortems.spendingReviewId, id), eq(spendingPostmortems.userId, userId)))
    .orderBy(desc(spendingPostmortems.createdAt))

  return { review, toolCheck: toolCheck ?? null, exportRecord: exportRecord ?? null, gptResult: gptResult ?? null, recoveryActions, postmortem: postmortem ?? null }
}

export async function deleteSpendingReview(id: number) {
  const userId = await getUserId()
  await db.delete(spendingReviews).where(and(eq(spendingReviews.id, id), eq(spendingReviews.userId, userId)))
  revalidatePath("/spending-review")
  return { ok: true }
}

// ── Markdown 导出 ──

export async function exportMarkdown(id: number) {
  const userId = await getUserId()
  const detail = await getSpendingReview(id)
  if (!detail) return { error: "记录不存在" }

  const markdown = generateReviewMarkdown(detail.review, detail.toolCheck)
  const [row] = await db
    .insert(spendingReviewExports)
    .values({ userId, spendingReviewId: id, markdownContent: markdown })
    .returning()
  // 注意:此函数会在 Markdown 页渲染期间被调用,
  // 渲染期不允许 revalidatePath,页面本身就是最新数据,无需刷新缓存
  return { export: row, markdown }
}

export async function markSubmittedToGpt(exportId: number) {
  const userId = await getUserId()
  await db
    .update(spendingReviewExports)
    .set({ submittedToGpt: true, submittedAt: new Date() })
    .where(and(eq(spendingReviewExports.id, exportId), eq(spendingReviewExports.userId, userId)))
  revalidatePath("/spending-review")
  return { ok: true }
}

// ── GPT 结果回写 ──

const gptResultSchema = z.object({
  spendingReviewId: z.number().int(),
  conclusion: z.enum(gptConclusionValues),
  mainReason: z.string().max(2000).optional().nullable(),
  risks: z.string().max(2000).optional().nullable(),
  alternatives: z.string().max(2000).optional().nullable(),
  suggestedCoolingPeriod: z.string().max(200).optional().nullable(),
  rawResponse: z.string().max(20000).optional().nullable(),
})

export async function saveGptResult(input: z.infer<typeof gptResultSchema>) {
  const userId = await getUserId()
  const parsed = gptResultSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  const data = parsed.data

  // 校验归属
  const [review] = await db
    .select({ id: spendingReviews.id })
    .from(spendingReviews)
    .where(and(eq(spendingReviews.id, data.spendingReviewId), eq(spendingReviews.userId, userId)))
  if (!review) return { error: "记录不存在" }

  const [row] = await db
    .insert(externalReviewResults)
    .values({
      userId,
      spendingReviewId: data.spendingReviewId,
      conclusion: data.conclusion,
      mainReason: data.mainReason || null,
      risks: data.risks || null,
      alternatives: data.alternatives || null,
      suggestedCoolingPeriod: data.suggestedCoolingPeriod || null,
      rawResponse: data.rawResponse || null,
    })
    .returning()

  // GPT 审核完成 → 进入待人工确认(注意:manual_confirmation ≠ 批准付款)
  await db
    .update(spendingReviews)
    .set({ decisionStatus: "awaiting_final", updatedAt: new Date() })
    .where(and(eq(spendingReviews.id, data.spendingReviewId), eq(spendingReviews.userId, userId)))

  revalidatePath(`/spending-review/${data.spendingReviewId}`)
  revalidatePath("/spending-review")
  return { result: row }
}

// ── 最终人工决定 ──

const finalDecisionSchema = z.object({
  id: z.number().int(),
  finalDecision: z.enum(finalDecisionValues),
  finalDecisionReason: z.string().max(2000).optional().nullable(),
  paymentCompleted: z.boolean().default(false),
})

export async function saveFinalDecision(input: z.infer<typeof finalDecisionSchema>) {
  const userId = await getUserId()
  const parsed = finalDecisionSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  const data = parsed.data

  const statusMap: Record<string, string> = {
    cancel: "cancelled",
    delay: "delayed",
    reduce_or_replace: "reduced",
    confirm_pay: data.paymentCompleted ? "paid" : "confirmed",
  }

  await db
    .update(spendingReviews)
    .set({
      finalDecision: data.finalDecision,
      finalDecisionReason: data.finalDecisionReason || null,
      paymentCompleted: data.paymentCompleted,
      decisionStatus: statusMap[data.finalDecision] ?? "confirmed",
      updatedAt: new Date(),
    })
    .where(and(eq(spendingReviews.id, data.id), eq(spendingReviews.userId, userId)))

  revalidatePath(`/spending-review/${data.id}`)
  revalidatePath("/spending-review")
  return { ok: true }
}

// ── 冷静期重新检查 ──

export async function recheckAfterCooling(id: number, stillNeeded: boolean) {
  const userId = await getUserId()
  const [review] = await db
    .select()
    .from(spendingReviews)
    .where(and(eq(spendingReviews.id, id), eq(spendingReviews.userId, userId)))
  if (!review) return { error: "记录不存在" }
  if (review.coolingUntil && new Date(review.coolingUntil) > new Date()) {
    return { error: "冷静期尚未结束" }
  }

  const newStatus = stillNeeded
    ? review.amount >= 300
      ? "awaiting_gpt"
      : "awaiting_final"
    : "cancelled"
  await db
    .update(spendingReviews)
    .set({ decisionStatus: newStatus, updatedAt: new Date() })
    .where(and(eq(spendingReviews.id, id), eq(spendingReviews.userId, userId)))
  revalidatePath(`/spending-review/${id}`)
  revalidatePath("/spending-review")
  return { ok: true, newStatus }
}

// ── 主线回归动作 ──

const recoverySchema = z.object({
  spendingReviewId: z.number().int().nullable().default(null),
  mainlineType: z.enum(mainlineValues),
  actionTitle: z.string().min(1).max(500),
  actionDescription: z.string().max(2000).optional().nullable(),
})

export async function createRecoveryAction(input: z.infer<typeof recoverySchema>) {
  const userId = await getUserId()
  const parsed = recoverySchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  const data = parsed.data
  const [row] = await db
    .insert(decisionRecoveryActions)
    .values({
      userId,
      spendingReviewId: data.spendingReviewId,
      mainlineType: data.mainlineType,
      actionTitle: data.actionTitle,
      actionDescription: data.actionDescription || null,
    })
    .returning()
  revalidatePath("/spending-review/recovery")
  return { action: row }
}

export async function completeRecoveryAction(id: number, evidenceText: string) {
  const userId = await getUserId()
  if (!evidenceText.trim()) return { error: "必须留下完成证据" }
  await db
    .update(decisionRecoveryActions)
    .set({ status: "done", evidenceText: evidenceText.trim(), completedAt: new Date() })
    .where(and(eq(decisionRecoveryActions.id, id), eq(decisionRecoveryActions.userId, userId)))
  revalidatePath("/spending-review/recovery")
  return { ok: true }
}

export async function getRecoveryActions() {
  const userId = await getUserId()
  return db
    .select()
    .from(decisionRecoveryActions)
    .where(eq(decisionRecoveryActions.userId, userId))
    .orderBy(desc(decisionRecoveryActions.createdAt))
}

export async function suggestRecoveryAction(mainlineType: string) {
  const suggestion = RECOVERY_SUGGESTIONS[mainlineType] ?? RECOVERY_SUGGESTIONS.dashboard
  return suggestion
}

// ── 事后复盘(灰烬备忘录联动) ──

const postmortemSchema = z.object({
  spendingReviewId: z.number().int(),
  actualAmount: z.number().int().nullable().default(null),
  actualTimeMinutes: z.number().int().nullable().default(null),
  regretLevel: z.number().int().min(0).max(10).default(0),
  actualUsage: z.string().max(2000).optional().nullable(),
  affectedMainline: z.string().max(500).optional().nullable(),
  ignoredRisk: z.string().max(2000).optional().nullable(),
  lesson: z.string().max(2000).optional().nullable(),
  principle: z.string().max(2000).optional().nullable(),
  interceptionRule: z.string().max(2000).optional().nullable(),
  writeToAshMemo: z.boolean().default(false),
})

export async function savePostmortem(input: z.infer<typeof postmortemSchema>) {
  const userId = await getUserId()
  const parsed = postmortemSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  const data = parsed.data

  const [review] = await db
    .select()
    .from(spendingReviews)
    .where(and(eq(spendingReviews.id, data.spendingReviewId), eq(spendingReviews.userId, userId)))
  if (!review) return { error: "记录不存在" }

  const [row] = await db
    .insert(spendingPostmortems)
    .values({
      userId,
      spendingReviewId: data.spendingReviewId,
      actualAmount: data.actualAmount,
      actualTimeMinutes: data.actualTimeMinutes,
      regretLevel: data.regretLevel,
      actualUsage: data.actualUsage || null,
      affectedMainline: data.affectedMainline || null,
      ignoredRisk: data.ignoredRisk || null,
      lesson: data.lesson || null,
      principle: data.principle || null,
      interceptionRule: data.interceptionRule || null,
    })
    .returning()

  // 满足条件写入灰烬备忘录
  if (data.writeToAshMemo || data.regretLevel >= 5) {
    await db.insert(ashMemos).values({
      userId,
      title: `支出复盘:${review.title}`,
      whatHappened: `支出「${review.title}」${review.amount} ${review.currency},实际 ${data.actualAmount ?? review.amount} 元。${data.actualUsage ?? ""}`,
      cost: `${data.actualAmount ?? review.amount} 元${data.actualTimeMinutes ? ` + ${data.actualTimeMinutes} 分钟` : ""}`,
      ignoredFact: data.ignoredRisk || null,
      lesson: data.lesson || null,
      principle: data.principle || null,
      interceptionRule: data.interceptionRule || null,
      weaknessTag: "impulse_spending",
    })
    revalidatePath("/ash-memos")
  }

  revalidatePath(`/spending-review/${data.spendingReviewId}`)
  return { postmortem: row }
}

// ── 最佳状态决策协议 ──

export async function getActiveBaseline() {
  const userId = await getUserId()
  const [baseline] = await db
    .select()
    .from(decisionBaselines)
    .where(and(eq(decisionBaselines.userId, userId), eq(decisionBaselines.isActive, true)))
    .orderBy(desc(decisionBaselines.updatedAt))
  if (baseline) return baseline

  // 首次访问自动初始化默认协议
  const [created] = await db
    .insert(decisionBaselines)
    .values({ userId, ...DEFAULT_BASELINE })
    .returning()
  return created
}

const baselineSchema = z.object({
  id: z.number().int(),
  title: z.string().min(1).max(200),
  coreAbilities: z.string().max(5000).optional().nullable(),
  financialRules: z.string().max(5000).optional().nullable(),
  healthRules: z.string().max(5000).optional().nullable(),
  mainlineRules: z.string().max(5000).optional().nullable(),
  sleepRules: z.string().max(5000).optional().nullable(),
  toolPurchaseRules: z.string().max(5000).optional().nullable(),
  decisionProcess: z.string().max(5000).optional().nullable(),
})

export async function updateBaseline(input: z.infer<typeof baselineSchema>) {
  const userId = await getUserId()
  const parsed = baselineSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  const data = parsed.data
  await db
    .update(decisionBaselines)
    .set({
      title: data.title,
      coreAbilities: data.coreAbilities || null,
      financialRules: data.financialRules || null,
      healthRules: data.healthRules || null,
      mainlineRules: data.mainlineRules || null,
      sleepRules: data.sleepRules || null,
      toolPurchaseRules: data.toolPurchaseRules || null,
      decisionProcess: data.decisionProcess || null,
      updatedAt: new Date(),
    })
    .where(and(eq(decisionBaselines.id, data.id), eq(decisionBaselines.userId, userId)))
  revalidatePath("/spending-review/baseline")
  return { ok: true }
}

// ── 首页统计 ──

export async function getSpendingStats() {
  const userId = await getUserId()
  const all = await db
    .select()
    .from(spendingReviews)
    .where(eq(spendingReviews.userId, userId))
    .orderBy(desc(spendingReviews.createdAt))

  const now = new Date()
  return {
    total: all.length,
    cooling: all.filter((r) => r.decisionStatus === "cooling"),
    coolingReady: all.filter(
      (r) => r.decisionStatus === "cooling" && r.coolingUntil && new Date(r.coolingUntil) <= now
    ),
    awaitingGpt: all.filter((r) => r.decisionStatus === "awaiting_gpt"),
    awaitingFinal: all.filter((r) => r.decisionStatus === "awaiting_final"),
    highRisk: all.filter((r) => r.riskLevel === "high" || r.riskLevel === "critical").slice(0, 5),
    recent: all.slice(0, 8),
    intercepted: all.filter((r) => ["cancelled", "delayed", "reduced"].includes(r.decisionStatus)).length,
  }
}

// ── FormData 包装(供表单组件直接调用) ──

export async function getDecisionBaseline() {
  return getActiveBaseline()
}

function fdText(fd: FormData, key: string): string | null {
  const v = fd.get(key)
  if (typeof v !== "string") return null
  const trimmed = v.trim()
  return trimmed.length > 0 ? trimmed : null
}

function fdNumber(fd: FormData, key: string): number | null {
  const v = fd.get(key)
  if (typeof v !== "string" || v.trim() === "") return null
  const n = Number(v)
  return Number.isNaN(n) ? null : Math.trunc(n)
}

export async function saveDecisionBaseline(fd: FormData) {
  const baseline = await getActiveBaseline()
  return updateBaseline({
    id: baseline.id,
    title: fdText(fd, "title") ?? "最佳状态决策协议",
    coreAbilities: fdText(fd, "coreAbilities"),
    financialRules: fdText(fd, "financialRules"),
    healthRules: fdText(fd, "healthRules"),
    mainlineRules: fdText(fd, "mainlineRules"),
    sleepRules: fdText(fd, "sleepRules"),
    toolPurchaseRules: fdText(fd, "toolPurchaseRules"),
    decisionProcess: fdText(fd, "decisionProcess"),
  })
}

export async function createSpendingPostmortem(reviewId: number, fd: FormData) {
  return savePostmortem({
    spendingReviewId: reviewId,
    actualAmount: fdNumber(fd, "actualAmount"),
    actualTimeMinutes: fdNumber(fd, "actualTimeMinutes"),
    regretLevel: fdNumber(fd, "regretLevel") ?? 0,
    actualUsage: fdText(fd, "actualUsage"),
    affectedMainline: fdText(fd, "affectedMainline"),
    ignoredRisk: fdText(fd, "ignoredRisk"),
    lesson: fdText(fd, "lesson"),
    principle: fdText(fd, "principle"),
    interceptionRule: fdText(fd, "interceptionRule"),
    writeToAshMemo: fd.get("writeToAsh") === "1",
  })
}
