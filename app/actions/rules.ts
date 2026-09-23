"use server"

import { db } from "@/lib/db"
import { choiceValidations, confirmationRules, interventionRuleVersions, triggerSessions } from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { ruleSchema, type RuleInput } from "@/lib/validation"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { canTransitionRule, type RuleStatus } from "@/lib/domain/experience-trigger"

export async function getRules() {
  const userId = await getUserId()
  return db
    .select()
    .from(confirmationRules)
    .where(eq(confirmationRules.userId, userId))
    .orderBy(desc(confirmationRules.createdAt))
}

export async function getRule(id: number) {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(confirmationRules)
    .where(
      and(eq(confirmationRules.id, id), eq(confirmationRules.userId, userId))
    )
  return rows[0] ?? null
}

export async function createRule(input: RuleInput) {
  const userId = await getUserId()
  const parsed = ruleSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data
  const inserted = await db.transaction(async (tx) => {
    const rows = await tx.insert(confirmationRules).values({
      userId, domain: data.domain, scenario: data.scenario ?? null,
      ruleText: data.ruleText, principleText: data.principleText ?? null,
      triggerCondition: data.triggerCondition ?? null, sourceReviewId: data.sourceReviewId ?? null,
      sourceId: data.sourceReviewId ?? null, isActive: data.isActive,
      status: data.isActive ? "active" : "draft", triggerText: data.ruleText,
      recommendedAction: data.ruleText, currentVersion: 1,
    }).returning()
    const rule = rows[0]
    await tx.insert(interventionRuleVersions).values({
      userId, ruleId: rule.id, version: 1, sceneTagsSnapshot: rule.scenario,
      riskTagsSnapshot: rule.likelyMistakeKeywords, triggerTextSnapshot: rule.ruleText,
      actionSnapshot: rule.ruleText, severitySnapshot: rule.severity,
      changeReason: "创建规则",
    })
    return rows
  })
  revalidatePath("/rules")
  return { id: inserted[0].id }
}

export async function setRuleActive(id: number, isActive: boolean) {
  const userId = await getUserId()
  const existing = await getRule(id)
  if (!existing) return { error: "规则不存在" }
  const next = isActive ? "active" : "paused"
  if (!canTransitionRule(existing.status as RuleStatus, next)) return { error: "当前规则状态不能执行此操作" }
  await db
    .update(confirmationRules)
    .set({ isActive, status: next, updatedAt: new Date() })
    .where(
      and(eq(confirmationRules.id, id), eq(confirmationRules.userId, userId))
    )
  revalidatePath("/rules")
}

export async function updateRuleText(id: number, ruleText: string) {
  const userId = await getUserId()
  const text = ruleText.trim()
  if (!text || text.length > 500) return { error: "规则内容无效" }
  const existing = await getRule(id)
  if (!existing) return { error: "规则不存在" }
  const nextVersion = existing.currentVersion + 1
  await db.transaction(async (tx) => {
    await tx.update(confirmationRules).set({
      ruleText: text, triggerText: text, recommendedAction: text,
      currentVersion: nextVersion, updatedAt: new Date(),
    }).where(and(eq(confirmationRules.id, id), eq(confirmationRules.userId, userId)))
    await tx.insert(interventionRuleVersions).values({
      userId, ruleId: id, version: nextVersion, sceneTagsSnapshot: existing.scenario,
      riskTagsSnapshot: existing.likelyMistakeKeywords, triggerTextSnapshot: text,
      actionSnapshot: text, severitySnapshot: existing.severity,
      changeReason: "修改规则文案",
    })
  })
  revalidatePath("/rules")
  return { success: true }
}

// ── 复盘时的已有规则匹配(纯关键词重合度,无 AI) ──

export type RuleMatchResult = {
  ruleId: number
  ruleText: string
  matchPercent: number
  validatedCount: number
  helpfulCount: number
}

/** 中英文混合分词:连续汉字按 2-gram,英文/数字按词 */
function tokenize(text: string): string[] {
  const tokens: string[] = []
  for (const m of text.toLowerCase().matchAll(/[a-z0-9]+|[\u4e00-\u9fff]+/g)) {
    const seg = m[0]
    if (/[a-z0-9]/.test(seg[0])) {
      tokens.push(seg)
    } else {
      // 汉字段:单字 + 相邻双字组合,兼顾短词与词组
      for (let i = 0; i < seg.length; i++) {
        tokens.push(seg[i])
        if (i < seg.length - 1) tokens.push(seg.slice(i, i + 2))
      }
    }
  }
  return tokens
}

export async function matchRuleForReview(text: string): Promise<RuleMatchResult | null> {
  const userId = await getUserId()
  const query = text.trim()
  if (query.length < 4) return null

  const rules = await db
    .select()
    .from(confirmationRules)
    .where(and(eq(confirmationRules.userId, userId), eq(confirmationRules.status, "active")))

  const queryTokens = new Set(tokenize(query))
  if (queryTokens.size === 0) return null

  let best: RuleMatchResult | null = null
  for (const rule of rules) {
    const ruleTokens = new Set(
      tokenize([rule.ruleText, rule.triggerCondition ?? "", rule.scenario ?? ""].join(" ")),
    )
    if (ruleTokens.size === 0) continue
    let hit = 0
    for (const t of queryTokens) if (ruleTokens.has(t)) hit++
    const percent = Math.round((hit / queryTokens.size) * 100)
    if (percent >= 30 && (!best || percent > best.matchPercent)) {
      best = {
        ruleId: rule.id,
        ruleText: rule.ruleText,
        matchPercent: Math.min(percent, 99),
        validatedCount: rule.validatedCount,
        helpfulCount: rule.helpfulCount,
      }
    }
  }
  return best
}

// ── 规则详情:真实验证战报 ──

export type RuleValidationReport = {
  id: number
  good: boolean
  title: string
  detail: string
  validatedAt: Date
}

/** 取该规则关联触发会话的真实验证记录(matched_rule_ids 为 JSON 数组文本,取回后在 JS 侧过滤) */
export async function getRuleValidations(ruleId: number): Promise<RuleValidationReport[]> {
  const userId = await getUserId()
  const rows = await db
    .select({
      id: choiceValidations.id,
      actualOutcome: choiceValidations.actualOutcome,
      decisionQuality: choiceValidations.decisionQuality,
      ruleHelpfulness: choiceValidations.ruleHelpfulness,
      validatedAt: choiceValidations.validatedAt,
      matchedRuleIds: triggerSessions.matchedRuleIds,
    })
    .from(choiceValidations)
    .innerJoin(triggerSessions, eq(choiceValidations.triggerSessionId, triggerSessions.id))
    .where(eq(choiceValidations.userId, userId))
    .orderBy(desc(choiceValidations.validatedAt))

  const reports: RuleValidationReport[] = []
  for (const row of rows) {
    let ids: number[] = []
    try {
      const parsed = JSON.parse(row.matchedRuleIds)
      if (Array.isArray(parsed)) ids = parsed.map(Number)
    } catch {
      // 忽略脏数据
    }
    if (!ids.includes(ruleId)) continue
    const good = row.ruleHelpfulness === "helpful" || row.decisionQuality === "better"
    reports.push({
      id: row.id,
      good,
      title: good ? "结果改善" : "未遵守",
      detail: row.actualOutcome,
      validatedAt: row.validatedAt,
    })
  }
  return reports.slice(0, 10)
}

/** 复盘关联已有规则:计一次匹配 */
export async function linkRuleFromReview(ruleId: number) {
  const userId = await getUserId()
  const existing = await getRule(ruleId)
  if (!existing) return { error: "规则不存在" }
  await db
    .update(confirmationRules)
    .set({
      matchCount: existing.matchCount + 1,
      lastMatchedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(confirmationRules.id, ruleId), eq(confirmationRules.userId, userId)))
  revalidatePath("/rules")
  return { ok: true }
}

export async function deleteRule(id: number) {
  const userId = await getUserId()
  await db.update(confirmationRules).set({
    status: "archived", isActive: false, updatedAt: new Date(),
  }).where(and(eq(confirmationRules.id, id), eq(confirmationRules.userId, userId)))
  revalidatePath("/rules")
}
