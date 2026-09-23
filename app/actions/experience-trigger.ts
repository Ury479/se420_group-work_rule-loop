"use server"

import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { ashMemos, choiceValidations, confirmationRules, interventionRuleVersions, mistakeReviews, triggerSessions } from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { canTransitionRule, canTransitionSession, parseIdSnapshot, selectMatchingRules, type RuleStatus, type SessionStatus } from "@/lib/domain/experience-trigger"

const sessionSchema = z.object({ sceneType: z.string().trim().min(1).max(50), sceneSummary: z.string().trim().min(1).max(1000), idempotencyKey: z.string().trim().min(8).max(100) })
const choiceSchema = z.object({ sessionId: z.coerce.number().int().positive(), choice: z.enum(["proceed", "adjust", "postpone", "cancel"]), note: z.string().trim().max(1000).optional() })
const validationSchema = z.object({ sessionId: z.coerce.number().int().positive(), expectedOutcome: z.string().trim().max(1000).optional(), actualOutcome: z.string().trim().min(1).max(2000), costDelta: z.coerce.number().int().min(-1000000).max(1000000), emotionDelta: z.coerce.number().int().min(-10).max(10), decisionQuality: z.enum(["better", "same", "worse", "unclear"]), ruleHelpfulness: z.enum(["helpful", "neutral", "harmful", "unclear"]), followupAction: z.enum(["keep", "revise", "pause", "archive", "none"]) })
const lessonSchema = z.object({ sourceType: z.enum(["ash_memo", "mistake_review"]), sourceId: z.coerce.number().int().positive(), pastChoice: z.string().trim().min(1).max(2000), actualCost: z.string().trim().min(1).max(2000), alternativeChoice: z.string().trim().min(1).max(2000), lessonStatement: z.string().trim().min(1).max(2000), lessonStatus: z.enum(["draft", "confirmed", "superseded", "archived"]) })

export async function saveStructuredLesson(input: unknown) {
  const parsed = lessonSchema.safeParse(input); if (!parsed.success) return { error: "教训字段不完整" }
  const userId = await getUserId(); const { sourceType, sourceId, ...patch } = parsed.data
  if (sourceType === "ash_memo") {
    const source = await db.select({ id: ashMemos.id }).from(ashMemos).where(and(eq(ashMemos.id, sourceId), eq(ashMemos.userId, userId))).limit(1)
    if (!source[0]) return { error: "灰烬记录不存在" }
    await db.update(ashMemos).set({ ...patch, updatedAt: new Date() }).where(and(eq(ashMemos.id, sourceId), eq(ashMemos.userId, userId)))
  } else {
    const source = await db.select({ id: mistakeReviews.id }).from(mistakeReviews).where(and(eq(mistakeReviews.id, sourceId), eq(mistakeReviews.userId, userId))).limit(1)
    if (!source[0]) return { error: "错误复盘不存在" }
    await db.update(mistakeReviews).set(patch).where(and(eq(mistakeReviews.id, sourceId), eq(mistakeReviews.userId, userId)))
  }
  return { ok: true as const }
}

export async function getExperienceTriggerSummary() {
  const userId = await getUserId()
  const sessions = await db.select().from(triggerSessions).where(eq(triggerSessions.userId, userId)).orderBy(desc(triggerSessions.createdAt)).limit(20)
  const pending = sessions.filter((session) => ["decided", "awaiting_validation"].includes(session.status))
  const ruleIds = [...new Set(sessions.flatMap((session) => parseIdSnapshot(session.matchedRuleIds)))]
  const rules = ruleIds.length ? await db.select().from(confirmationRules).where(and(eq(confirmationRules.userId, userId), inArray(confirmationRules.id, ruleIds))) : []
  const validations = await db.select().from(choiceValidations).where(eq(choiceValidations.userId, userId)).orderBy(desc(choiceValidations.validatedAt)).limit(20)
  return {
    pending: pending.slice(0, 5), recent: sessions.slice(0, 5), rules,
    metrics: {
      total: sessions.length, validated: sessions.filter((session) => session.status === "validated").length,
      adjusted: sessions.filter((session) => ["adjust", "postpone", "cancel"].includes(session.userChoice)).length,
      helpful: validations.filter((item) => item.ruleHelpfulness === "helpful").length,
    },
  }
}

export async function createTriggerSession(input: unknown) {
  const parsed = sessionSchema.safeParse(input); if (!parsed.success) return { error: "场景信息不完整" }
  const userId = await getUserId(); const data = parsed.data
  const existing = await db.select().from(triggerSessions).where(and(eq(triggerSessions.userId, userId), eq(triggerSessions.idempotencyKey, data.idempotencyKey))).limit(1)
  if (existing[0]) return { ok: true as const, session: existing[0], repeated: true }
  const rules = await db.select().from(confirmationRules).where(and(eq(confirmationRules.userId, userId), eq(confirmationRules.status, "active")))
  const matched = selectMatchingRules(rules, { sceneType: data.sceneType, summary: data.sceneSummary })
  const [session] = await db.transaction(async (tx) => {
    const inserted = await tx.insert(triggerSessions).values({ userId, ...data, matchedRuleIds: JSON.stringify(matched.map((r) => r.id)), matchedRuleVersions: JSON.stringify(matched.map((r) => r.currentVersion)) }).returning()
    for (const rule of matched) await tx.update(confirmationRules).set({ matchCount: sql`${confirmationRules.matchCount} + 1`, hitCount: sql`${confirmationRules.hitCount} + 1`, lastMatchedAt: new Date() }).where(and(eq(confirmationRules.id, rule.id), eq(confirmationRules.userId, userId)))
    return inserted
  })
  return { ok: true as const, session, matched }
}

export async function recordTriggerChoice(input: unknown) {
  const parsed = choiceSchema.safeParse(input); if (!parsed.success) return { error: "选择信息无效" }
  const userId = await getUserId(); const data = parsed.data
  const rows = await db.select().from(triggerSessions).where(and(eq(triggerSessions.id, data.sessionId), eq(triggerSessions.userId, userId))).limit(1); const session = rows[0]
  if (!session) return { error: "触发会话不存在" }; if (!canTransitionSession(session.status as SessionStatus, "decided")) return { error: "当前状态不能重复选择" }
  await db.transaction(async (tx) => {
    await tx.update(triggerSessions).set({ userChoice: data.choice, choiceNote: data.note, status: "decided", updatedAt: new Date() }).where(and(eq(triggerSessions.id, session.id), eq(triggerSessions.userId, userId)))
    if (data.choice !== "proceed") for (const id of parseIdSnapshot(session.matchedRuleIds)) await tx.update(confirmationRules).set({ actedCount: sql`${confirmationRules.actedCount} + 1` }).where(and(eq(confirmationRules.id, id), eq(confirmationRules.userId, userId)))
  })
  return { ok: true as const }
}

export async function openTriggerValidation(sessionId: number) {
  const userId = await getUserId(); const rows = await db.select().from(triggerSessions).where(and(eq(triggerSessions.id, sessionId), eq(triggerSessions.userId, userId))).limit(1); const session = rows[0]
  if (!session || !canTransitionSession(session.status as SessionStatus, "awaiting_validation")) return { error: "当前会话不能进入验证" }
  await db.update(triggerSessions).set({ status: "awaiting_validation", updatedAt: new Date() }).where(and(eq(triggerSessions.id, sessionId), eq(triggerSessions.userId, userId)))
  return { ok: true as const }
}

export async function submitChoiceValidation(input: unknown) {
  const parsed = validationSchema.safeParse(input); if (!parsed.success) return { error: "验证结果无效" }
  const userId = await getUserId(); const data = parsed.data
  try { await db.transaction(async (tx) => {
    const rows = await tx.select().from(triggerSessions).where(and(eq(triggerSessions.id, data.sessionId), eq(triggerSessions.userId, userId))).limit(1); const session = rows[0]
    if (!session) throw new Error("NOT_FOUND"); if (!canTransitionSession(session.status as SessionStatus, "validated")) throw new Error("INVALID_STATE")
    await tx.insert(choiceValidations).values({ userId, triggerSessionId: data.sessionId, expectedOutcome: data.expectedOutcome, actualOutcome: data.actualOutcome, costDelta: data.costDelta, emotionDelta: data.emotionDelta, decisionQuality: data.decisionQuality, ruleHelpfulness: data.ruleHelpfulness, followupAction: data.followupAction })
    for (const id of parseIdSnapshot(session.matchedRuleIds)) await tx.update(confirmationRules).set({ validatedCount: sql`${confirmationRules.validatedCount} + 1`, helpfulCount: data.ruleHelpfulness === "helpful" ? sql`${confirmationRules.helpfulCount} + 1` : confirmationRules.helpfulCount }).where(and(eq(confirmationRules.id, id), eq(confirmationRules.userId, userId)))
    await tx.update(triggerSessions).set({ status: "validated", updatedAt: new Date() }).where(and(eq(triggerSessions.id, session.id), eq(triggerSessions.userId, userId)))
  }); return { ok: true as const } } catch (error) { return { error: error instanceof Error && error.message === "INVALID_STATE" ? "当前会话不能提交验证" : "验证已存在或保存失败" } }
}

export async function transitionExperienceRule(ruleId: number, next: RuleStatus, changeReason?: string) {
  const userId = await getUserId(); const rows = await db.select().from(confirmationRules).where(and(eq(confirmationRules.id, ruleId), eq(confirmationRules.userId, userId))).limit(1); const rule = rows[0]
  if (!rule || !canTransitionRule(rule.status as RuleStatus, next)) return { error: "规则状态转换无效" }
  await db.transaction(async (tx) => { await tx.update(confirmationRules).set({ status: next, isActive: next === "active", updatedAt: new Date() }).where(and(eq(confirmationRules.id, ruleId), eq(confirmationRules.userId, userId))); await tx.insert(interventionRuleVersions).values({ userId, ruleId, version: rule.currentVersion, sceneTagsSnapshot: rule.scenario, riskTagsSnapshot: rule.likelyMistakeKeywords, triggerTextSnapshot: rule.triggerText ?? rule.ruleText, actionSnapshot: rule.recommendedAction ?? rule.ruleText, severitySnapshot: rule.severity, changeReason: changeReason ?? `状态变更为 ${next}` }) })
  return { ok: true as const }
}
