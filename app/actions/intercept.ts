"use server"

import { db } from "@/lib/db"
import {
  criticalConfirmations,
  confirmationItems,
  confirmationRules,
  ashMemos,
  type ConfirmationRule,
} from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import {
  armSchema,
  quickCheckSchema,
  ashMemoSchema,
  ashMemoUpdateSchema,
  type ArmInput,
  type QuickCheckInput,
  type AshMemoInput,
  type AshMemoUpdateInput,
} from "@/lib/validation"
import { escalateByState, isIrreversibleAction, isKeyPerson } from "@/lib/risk"
import { buildItemsForAction, BACKUP_PATH_LIBRARY } from "@/lib/templates"
import type { CurrentState, Domain, FinalActionType, RiskLevel } from "@/lib/types"
import { and, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// ---------- 规则命中 ----------

interface MatchContext {
  domain: Domain
  finalActionType: FinalActionType
  likelyMistake?: string | null
  scenario?: string | null
  currentState?: CurrentState
}

/**
 * 根据 domain / scenario / final_action_type / likely_mistake / current_state
 * 匹配已启用规则,命中则 hit_count + 1。
 */
async function matchRules(
  userId: string,
  ctx: MatchContext
): Promise<ConfirmationRule[]> {
  const activeRules = await db
    .select()
    .from(confirmationRules)
    .where(
      and(
        eq(confirmationRules.userId, userId),
        eq(confirmationRules.isActive, true)
      )
    )

  const text = `${ctx.likelyMistake ?? ""} ${ctx.scenario ?? ""}`
  const hits = activeRules.filter((rule) => {
    // 1. 领域匹配
    if (rule.domain === ctx.domain) return true
    // 2. 动作匹配
    if (rule.finalActionType && rule.finalActionType === ctx.finalActionType)
      return true
    // 3. 易错点关键词匹配
    if (rule.likelyMistakeKeywords) {
      const keywords = rule.likelyMistakeKeywords
        .split(/[,,、\s]+/)
        .filter(Boolean)
      if (keywords.some((k) => text.includes(k))) return true
    }
    // 4. 状态触发匹配
    if (
      rule.currentStateTrigger &&
      ctx.currentState &&
      rule.currentStateTrigger.includes(ctx.currentState)
    )
      return true
    return false
  })

  if (hits.length > 0) {
    for (const rule of hits) {
      await db
        .update(confirmationRules)
        .set({ hitCount: sql`${confirmationRules.hitCount} + 1` })
        .where(
          and(
            eq(confirmationRules.id, rule.id),
            eq(confirmationRules.userId, userId)
          )
        )
    }
  }
  return hits
}

// ---------- 80% 布防 ----------

/**
 * 80% 布防:3 个必填 + 3 个可选,提交后:
 * 1. 创建 armed 记录 2. 生成 3-5 条检查项 3. 命中规则自动加入
 */
export async function armConfirmation(input: ArmInput) {
  const userId = await getUserId()
  const parsed = armSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data

  // 布防阶段风险:不可逆动作或关键词由后续检查升级,这里保守评估
  let riskLevel: RiskLevel = "medium"
  if (isIrreversibleAction(data.finalActionType) && data.finalActionType !== "custom") {
    riskLevel = "high"
  }

  const inserted = await db
    .insert(criticalConfirmations)
    .values({
      userId,
      title: data.title,
      domain: data.domain,
      deadline: data.deadline ? new Date(data.deadline) : null,
      locationOrPlatform: data.locationOrPlatform ?? null,
      riskLevel,
      costIfFailed: data.costIfFailed,
      likelyMistake: data.likelyMistake,
      backupPath: data.backupPath ?? null,
      finalActionType: data.finalActionType,
      status: "armed",
      armedAt: new Date(),
    })
    .returning({ id: criticalConfirmations.id })
  const confirmationId = inserted[0].id

  // 基于易错点生成 3-5 条检查项(动作专属前 3 条 + 易错点针对项)
  const actionItems = buildItemsForAction(data.finalActionType, data.domain, false)
    .slice(0, 3)
    .map((i) => i.text)
  const items = [
    ...actionItems,
    `针对易错点再次核对:${data.likelyMistake}`,
    `确认失败代价可承受或已有补救:${data.costIfFailed}`,
  ]

  // 规则命中
  const matched = await matchRules(userId, {
    domain: data.domain,
    finalActionType: data.finalActionType,
    likelyMistake: data.likelyMistake,
  })

  await db.insert(confirmationItems).values([
    ...items.map((text, i) => ({
      userId,
      confirmationId,
      itemText: text,
      isRequired: true,
      confirmationRound: 1,
      orderIndex: i,
    })),
    ...matched.map((rule, i) => ({
      userId,
      confirmationId,
      itemText: `[历史规则] ${rule.ruleText}`,
      isRequired: true,
      confirmationRound: 1,
      orderIndex: items.length + i,
    })),
  ])

  revalidatePath("/")
  return {
    id: confirmationId,
    riskLevel,
    matchedRules: matched.map((r) => r.ruleText),
  }
}

// ---------- 90% 快速检查 ----------

/**
 * 90% 快速检查:回答 3 个必问问题后创建快速检查记录,
 * 状态直接进入 checking,生成动作专属检查项 + 命中规则。
 */
export async function createQuickCheck(input: QuickCheckInput) {
  const userId = await getUserId()
  const parsed = quickCheckSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data

  // 风险评估:不可逆动作 → high;状态不稳升级
  let riskLevel: RiskLevel = isIrreversibleAction(data.finalActionType)
    ? "high"
    : "medium"
  riskLevel = escalateByState(riskLevel, data.currentState, false)
  // 人际:关键对象自动高风险
  const keyPerson = isKeyPerson(data.targetPerson)
  if (keyPerson) riskLevel = "high"

  const inserted = await db
    .insert(criticalConfirmations)
    .values({
      userId,
      title: data.title,
      domain: data.domain,
      riskLevel,
      costIfFailed: data.costIfFailed,
      likelyMistake: data.likelyMistake,
      finalCheckFocus: data.finalCheckFocus,
      targetPerson: data.targetPerson ?? null,
      backupPath: data.backupPath ?? null,
      evidenceRequired: data.evidenceRequired,
      finalActionType: data.finalActionType,
      currentState: data.currentState,
      isQuickCheck: true,
      status: "checking",
      checkedAt: new Date(),
    })
    .returning({ id: criticalConfirmations.id })
  const confirmationId = inserted[0].id

  const isHighRisk = riskLevel === "high"
  const items = buildItemsForAction(data.finalActionType, data.domain, isHighRisk)

  const matched = await matchRules(userId, {
    domain: data.domain,
    finalActionType: data.finalActionType,
    likelyMistake: data.likelyMistake,
    currentState: data.currentState,
  })

  await db.insert(confirmationItems).values([
    ...items.map((item, i) => ({
      userId,
      confirmationId,
      itemText: item.text,
      isRequired: item.required,
      confirmationRound: item.round,
      orderIndex: i,
    })),
    ...matched.map((rule, i) => ({
      userId,
      confirmationId,
      itemText: `[历史规则] ${rule.ruleText}`,
      isRequired: true,
      confirmationRound: 1,
      orderIndex: items.length + i,
    })),
  ])

  revalidatePath("/")
  return {
    id: confirmationId,
    riskLevel,
    needsStabilize: isHighRisk,
    keyPerson,
    matchedRules: matched.map((r) => r.ruleText),
  }
}

/** 供前端预取:某场景下的默认备用方案 */
export async function getBackupSuggestions(domain: Domain) {
  return BACKUP_PATH_LIBRARY[domain] ?? BACKUP_PATH_LIBRARY.custom
}

// ---------- 灰烬备忘录 ----------

export async function getAshMemos() {
  const userId = await getUserId()
  return db
    .select()
    .from(ashMemos)
    .where(eq(ashMemos.userId, userId))
    .orderBy(desc(ashMemos.createdAt))
}

/**
 * 保存灰烬备忘录(极简优先):教训 / 原则填一个即可提交。
 * 拦截规则是可选的独立笔记 —— 填了才写入规则库并启用;
 * 没填可以事后随时补充(updateAshMemo)。
 */
export async function createAshMemo(input: AshMemoInput) {
  const userId = await getUserId()
  const parsed = ashMemoSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data

  // 1. 只有填写了拦截规则,才写入规则库(灰烬产生的规则直接启用)
  let ruleId: number | null = null
  if (data.interceptionRule?.trim()) {
    const ruleInserted = await db
      .insert(confirmationRules)
      .values({
        userId,
        domain: data.domain,
        ruleText: data.interceptionRule,
        principleText: data.principle ?? null,
        triggerCondition: data.ignoredFact ?? null,
        finalActionType:
          data.finalActionType !== "custom" ? data.finalActionType : null,
        likelyMistakeKeywords: data.likelyMistakeKeywords ?? null,
        isActive: true,
        sourceType: "ash_memo",
        weaknessKey: data.exposedWeakness ?? null,
      })
      .returning({ id: confirmationRules.id })
    ruleId = ruleInserted[0].id
  }

  // 2. 保存灰烬备忘录(标题缺省时用教训/原则的前 30 字兜底)
  const fallbackTitle =
    data.title?.trim() ||
    (data.lesson?.trim() || data.principle?.trim() || "灰烬备忘录").slice(0, 30)
  const memoInserted = await db
    .insert(ashMemos)
    .values({
      userId,
      confirmationId: data.confirmationId ?? null,
      title: fallbackTitle,
      whatHappened: data.whatHappened ?? null,
      cost: data.cost ?? null,
      skippedReason: data.skippedReason ?? null,
      ignoredFact: data.ignoredFact ?? null,
      lesson: data.lesson ?? null,
      principle: data.principle ?? null,
      interceptionRule: data.interceptionRule ?? null,
      linkedRuleId: ruleId,
      exposedWeakness: data.exposedWeakness ?? null,
      whySystemFailed: data.whySystemFailed ?? null,
      nextInterceptionPoint: data.nextInterceptionPoint ?? null,
      weaknessTag: data.exposedWeakness ?? null,
    })
    .returning({ id: ashMemos.id })

  // 3. 关联的确认任务标记为已复盘
  if (data.confirmationId) {
    await db
      .update(criticalConfirmations)
      .set({ status: "reviewed", updatedAt: new Date() })
      .where(
        and(
          eq(criticalConfirmations.id, data.confirmationId),
          eq(criticalConfirmations.userId, userId)
        )
      )
  }

  revalidatePath("/")
  revalidatePath("/ash-memos")
  revalidatePath("/rules")
  return { id: memoInserted[0].id, ruleId }
}

/**
 * 事后补充灰烬备忘录:只更新填写的字段。
 * 如果这次补充了拦截规则且之前没有关联规则,自动写入规则库并启用。
 */
export async function updateAshMemo(input: AshMemoUpdateInput) {
  const userId = await getUserId()
  const parsed = ashMemoUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data

  const existing = await db
    .select()
    .from(ashMemos)
    .where(and(eq(ashMemos.id, data.id), eq(ashMemos.userId, userId)))
    .limit(1)
  if (existing.length === 0) return { error: "备忘录不存在" }
  const memo = existing[0]

  // 补充了拦截规则且此前没有关联规则 → 写入规则库
  let ruleId = memo.linkedRuleId
  if (data.interceptionRule?.trim() && !memo.linkedRuleId) {
    const ruleInserted = await db
      .insert(confirmationRules)
      .values({
        userId,
        domain: data.domain ?? "custom",
        ruleText: data.interceptionRule,
        principleText: data.principle ?? memo.principle,
        isActive: true,
        sourceType: "ash_memo",
        weaknessKey: memo.exposedWeakness,
      })
      .returning({ id: confirmationRules.id })
    ruleId = ruleInserted[0].id
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (data.title !== undefined && data.title !== null) patch.title = data.title
  if (data.whatHappened !== undefined) patch.whatHappened = data.whatHappened
  if (data.cost !== undefined) patch.cost = data.cost
  if (data.skippedReason !== undefined) patch.skippedReason = data.skippedReason
  if (data.ignoredFact !== undefined) patch.ignoredFact = data.ignoredFact
  if (data.lesson !== undefined) patch.lesson = data.lesson
  if (data.principle !== undefined) patch.principle = data.principle
  if (data.interceptionRule !== undefined)
    patch.interceptionRule = data.interceptionRule
  if (ruleId !== memo.linkedRuleId) patch.linkedRuleId = ruleId

  await db
    .update(ashMemos)
    .set(patch)
    .where(and(eq(ashMemos.id, data.id), eq(ashMemos.userId, userId)))

  revalidatePath("/ash-memos")
  revalidatePath("/rules")
  revalidatePath("/")
  return { success: true, ruleId }
}

export async function deleteAshMemo(id: number) {
  const userId = await getUserId()
  await db
    .delete(ashMemos)
    .where(and(eq(ashMemos.id, id), eq(ashMemos.userId, userId)))
  revalidatePath("/ash-memos")
}
