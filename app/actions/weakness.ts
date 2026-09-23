"use server"

import { db } from "@/lib/db"
import {
  demands,
  weaknessEvents,
  criticalConfirmations,
  confirmationRules,
  ashMemos,
} from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import {
  demandSchema,
  escalateDemandSchema,
  weaknessEventUpdateSchema,
  type DemandInput,
  type EscalateDemandInput,
  type WeaknessEventUpdateInput,
} from "@/lib/validation"
import {
  detectWeaknesses,
  shouldLockP0,
  WEAKNESS_INTERVENTIONS,
  WEAKNESS_LABELS,
  P0_LOCK_MESSAGE,
  type DetectedWeakness,
  type WeaknessKey,
} from "@/lib/weakness"
import type { CurrentState, FinalActionType } from "@/lib/types"
import { and, desc, eq, gte, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// ---------- 需求 / Backlog(P0 锁定机制) ----------

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

async function getP0LockState(userId: string) {
  const today = startOfToday()
  const [newToday] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(demands)
    .where(and(eq(demands.userId, userId), gte(demands.createdAt, today)))
  const [doneKeyFactors] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(demands)
    .where(
      and(
        eq(demands.userId, userId),
        eq(demands.status, "done"),
        eq(demands.isKeyFactor, true),
        gte(demands.completedAt, today)
      )
    )
  const [unfinishedP0] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(demands)
    .where(
      and(
        eq(demands.userId, userId),
        eq(demands.priority, "P0"),
        eq(demands.status, "active")
      )
    )
  const state = {
    todayNewDemandCount: newToday?.count ?? 0,
    todayCompletedKeyFactorCount: doneKeyFactors?.count ?? 0,
    hasUnfinishedP0: (unfinishedP0?.count ?? 0) > 0,
  }
  return { ...state, locked: shouldLockP0(state) }
}

/** 新建需求:P0 锁定时非 P0 需求强制进入 Backlog */
export async function createDemand(input: DemandInput) {
  const userId = await getUserId()
  const parsed = demandSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data
  const lock = await getP0LockState(userId)

  // P0 锁定:同一时间只能有一个 P0。锁定期间所有新需求
  // (包括想标为 P0 的)一律进入 Backlog,想提升必须走升级流程并说明理由。
  const forcedBacklog = lock.locked
  const priority = lock.locked && data.priority === "P0" ? "P1" : data.priority
  const status = forcedBacklog ? "backlog" : "active"

  const [demand] = await db
    .insert(demands)
    .values({
      userId,
      title: data.title,
      priority,
      isKeyFactor: data.isKeyFactor,
      status,
    })
    .returning()

  // 记录 scope_greed 弱点事件
  if (forcedBacklog) {
    await db.insert(weaknessEvents).values({
      userId,
      weaknessKey: "scope_greed",
      sourceType: "demand",
      sourceId: demand.id,
      triggerReason: `P0 锁定中新增需求「${data.title}」,已自动进入 Backlog`,
      severity: "medium",
      recommendedIntervention: WEAKNESS_INTERVENTIONS.scope_greed.advice,
    })
  }

  revalidatePath("/demands")
  revalidatePath("/")
  return {
    success: true,
    demand,
    lockedToBacklog: forcedBacklog,
    lockMessage: forcedBacklog ? P0_LOCK_MESSAGE : null,
  }
}

/** 手动升级 Backlog 需求为 active:必须填写理由 */
export async function escalateDemand(input: EscalateDemandInput) {
  const userId = await getUserId()
  const parsed = escalateDemandSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  await db
    .update(demands)
    .set({
      status: "active",
      escalateReason: parsed.data.escalateReason,
      updatedAt: new Date(),
    })
    .where(
      and(eq(demands.id, parsed.data.demandId), eq(demands.userId, userId))
    )
  revalidatePath("/demands")
  revalidatePath("/")
  return { success: true }
}

/** 完成需求 */
export async function completeDemand(demandId: number) {
  const userId = await getUserId()
  await db
    .update(demands)
    .set({ status: "done", completedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(demands.id, demandId), eq(demands.userId, userId)))
  revalidatePath("/demands")
  revalidatePath("/")
  return { success: true }
}

/** 需求列表 + P0 锁定状态 */
export async function getDemandsOverview() {
  const userId = await getUserId()
  const list = await db
    .select()
    .from(demands)
    .where(eq(demands.userId, userId))
    .orderBy(desc(demands.createdAt))
  const lock = await getP0LockState(userId)
  return {
    active: list.filter((d) => d.status === "active"),
    backlog: list.filter((d) => d.status === "backlog"),
    done: list.filter((d) => d.status === "done").slice(0, 10),
    lock,
  }
}

// ---------- 弱点检测与今日汇总 ----------

/**
 * 今日弱点检测:纯规则,不依赖 AI。
 * 汇总需求数据 + 今日进行中拦截任务的状态,输出命中的短板。
 */
export async function detectTodayWeaknesses(): Promise<{
  detected: DetectedWeakness[]
  lock: Awaited<ReturnType<typeof getP0LockState>>
  fallbackRule: { ruleText: string; weaknessKey: string | null } | null
}> {
  const userId = await getUserId()
  const lock = await getP0LockState(userId)
  const today = startOfToday()

  // 今日 active 需求数(P0/P1)
  const [activeCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(demands)
    .where(and(eq(demands.userId, userId), eq(demands.status, "active")))

  // 今日进行中的拦截任务(取最近一条作为状态/动作来源)
  const recentConfirmations = await db
    .select()
    .from(criticalConfirmations)
    .where(eq(criticalConfirmations.userId, userId))
    .orderBy(desc(criticalConfirmations.createdAt))
    .limit(5)
  const pending = recentConfirmations.find(
    (c) => c.status === "pending" || c.status === "armed" || c.status === "checking"
  )

  // 近 7 天灰烬短板标签
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000)
  const recentMemos = await db
    .select({ exposedWeakness: ashMemos.exposedWeakness })
    .from(ashMemos)
    .where(and(eq(ashMemos.userId, userId), gte(ashMemos.createdAt, weekAgo)))
  const recentWeaknessTags = recentMemos
    .map((m) => m.exposedWeakness)
    .filter((t): t is string => Boolean(t))

  const detected = detectWeaknesses({
    todayNewDemandCount: lock.todayNewDemandCount,
    todayCompletedKeyFactorCount: lock.todayCompletedKeyFactorCount,
    hasUnfinishedP0: lock.hasUnfinishedP0,
    activeDemandCount: activeCount?.count ?? 0,
    currentState: (pending?.currentState ?? null) as CurrentState | null,
    finalActionType: (pending?.finalActionType ?? null) as FinalActionType | null,
    targetPerson: pending?.targetPerson,
    domain: pending?.domain,
    mistakeHistory: pending?.mistakeHistory ?? false,
    recentWeaknessTags,
  })

  // 把 high/medium 命中写入 weakness_events(当日去重)
  for (const hit of detected.filter((d) => d.severity !== "low")) {
    const [existing] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(weaknessEvents)
      .where(
        and(
          eq(weaknessEvents.userId, userId),
          eq(weaknessEvents.weaknessKey, hit.weaknessKey),
          eq(weaknessEvents.status, "open"),
          gte(weaknessEvents.createdAt, today)
        )
      )
    if ((existing?.count ?? 0) === 0) {
      await db.insert(weaknessEvents).values({
        userId,
        weaknessKey: hit.weaknessKey,
        sourceType: "custom",
        triggerReason: hit.triggerReason,
        severity: hit.severity,
        recommendedIntervention: hit.recommendedIntervention,
      })
    }
  }

  // 今日兜底规则:优先取命中短板对应的最高优先级启用规则
  let fallbackRule: { ruleText: string; weaknessKey: string | null } | null =
    null
  const topWeakness = detected[0]?.weaknessKey
  const activeRules = await db
    .select()
    .from(confirmationRules)
    .where(
      and(
        eq(confirmationRules.userId, userId),
        eq(confirmationRules.isActive, true)
      )
    )
    .orderBy(desc(confirmationRules.rulePriority), desc(confirmationRules.hitCount))
  if (topWeakness) {
    const matched = activeRules.find((r) => r.weaknessKey === topWeakness)
    if (matched)
      fallbackRule = { ruleText: matched.ruleText, weaknessKey: matched.weaknessKey }
  }
  if (!fallbackRule && activeRules[0]) {
    fallbackRule = {
      ruleText: activeRules[0].ruleText,
      weaknessKey: activeRules[0].weaknessKey,
    }
  }
  if (!fallbackRule && lock.locked) {
    fallbackRule = {
      ruleText: "P0 未完成前,不新增 P2 功能。",
      weaknessKey: "scope_greed",
    }
  }

  return { detected, lock, fallbackRule }
}

/** 弱点事件列表 */
export async function getWeaknessEvents(status?: "open" | "acknowledged" | "resolved") {
  const userId = await getUserId()
  const conditions = [eq(weaknessEvents.userId, userId)]
  if (status) conditions.push(eq(weaknessEvents.status, status))
  return db
    .select()
    .from(weaknessEvents)
    .where(and(...conditions))
    .orderBy(desc(weaknessEvents.createdAt))
    .limit(50)
}

/** 更新弱点事件状态 */
export async function updateWeaknessEvent(input: WeaknessEventUpdateInput) {
  const userId = await getUserId()
  const parsed = weaknessEventUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  await db
    .update(weaknessEvents)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(
      and(
        eq(weaknessEvents.id, parsed.data.eventId),
        eq(weaknessEvents.userId, userId)
      )
    )
  revalidatePath("/weakness")
  revalidatePath("/")
  return { success: true }
}

/** 按短板汇总:近 30 天灰烬中每类短板出现次数 */
export async function getWeaknessStats() {
  const userId = await getUserId()
  const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000)
  const memos = await db
    .select({ exposedWeakness: ashMemos.exposedWeakness })
    .from(ashMemos)
    .where(and(eq(ashMemos.userId, userId), gte(ashMemos.createdAt, monthAgo)))
  const stats: Partial<Record<WeaknessKey, number>> = {}
  for (const m of memos) {
    if (m.exposedWeakness && m.exposedWeakness in WEAKNESS_LABELS) {
      const key = m.exposedWeakness as WeaknessKey
      stats[key] = (stats[key] ?? 0) + 1
    }
  }
  return stats
}
