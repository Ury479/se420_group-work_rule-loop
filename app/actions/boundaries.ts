"use server"

import { db } from "@/lib/db"
import {
  executionBoundaries,
  boundaryChecks,
  demands,
  unifiedCards,
  type ExecutionBoundary,
  type BoundaryCheck,
} from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { and, eq, desc, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ─────────────────────────────────────────────
// 校验(所有输入必须过 zod)
// ─────────────────────────────────────────────

const SOURCE_TYPES = ["task", "demand", "relationship", "purchase", "project", "study", "custom"] as const
const CONFIDENCE = ["high", "medium", "low", "unknown"] as const
type Decision = "continue" | "validate_small" | "pause" | "backlog" | "stop"

const boundarySchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200),
  sourceType: z.enum(SOURCE_TYPES),
  minimumDoneStandard: z.string().min(1, "必须写清:最低做到什么程度就够"),
  opportunityCost: z.string().min(1, "必须写清:继续深做会挤占什么"),
  stopCondition: z.string().min(1, "必须写清:什么时候必须停下来"),
  standardDoneDefinition: z.string().optional().nullable(),
  explicitNonGoals: z.string().optional().nullable(),
  timeboxMinutes: z.union([z.literal(10), z.literal(30), z.literal(60), z.literal(90)]),
  informationConfidence: z.enum(CONFIDENCE),
})

const checkSchema = z.object({
  boundaryId: z.number().int().positive(),
  timeSpentMinutes: z.number().int().min(0).max(6000),
  evidenceCreated: z.boolean(),
  reachedMinimum: z.boolean(),
  crowdingOut: z.boolean(),
  emotionDriven: z.boolean(),
  infoInsufficient: z.boolean(),
  whatIsBeingCrowdedOut: z.string().max(500).optional().nullable(),
  currentProgress: z.string().max(500).optional().nullable(),
})

export type BoundaryInput = z.infer<typeof boundarySchema>
export type CheckInput = z.infer<typeof checkSchema>

// ─────────────────────────────────────────────
// 内部:P0 锁定状态(与需求系统联动)
// ─────────────────────────────────────────────

async function hasUnfinishedP0(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(demands)
    .where(and(eq(demands.userId, userId), eq(demands.priority, "P0"), eq(demands.status, "active")))
  return (row?.count ?? 0) > 0
}

// ─────────────────────────────────────────────
// 规则检测引擎(第一版纯规则,不用 AI)
// 输出五类决策:continue / validate_small / pause / backlog / stop
// ─────────────────────────────────────────────

export type RuleVerdict = {
  recommendation: Decision
  isOverExecution: boolean
  reasons: string[]
}

function runRuleEngine(input: {
  timeSpentMinutes: number
  timeboxMinutes: number
  evidenceCreated: boolean
  reachedMinimum: boolean
  crowdingOut: boolean
  emotionDriven: boolean
  infoInsufficient: boolean
  informationConfidence: string
  p0Unfinished: boolean
}): RuleVerdict {
  const reasons: string[] = []
  let over = false

  const overTimebox = input.timeSpentMinutes > input.timeboxMinutes

  // 规则 1:已达最低可用仍继续 → stop
  if (input.reachedMinimum && overTimebox) {
    reasons.push("已达到最低可用标准,且已超过时间盒。继续优化属于贪完美。")
    return { recommendation: "stop", isOverExecution: true, reasons }
  }

  // 规则 2:超时间盒且无完成证据 → 过度执行
  if (overTimebox && !input.evidenceCreated) {
    over = true
    reasons.push("已超过时间盒但没有完成证据,投入产出失衡。")
  }

  // 规则 3:P0 未完成 + 正在挤占 → backlog
  if (input.p0Unfinished && input.crowdingOut) {
    reasons.push("P0 尚未完成,这件事正在挤占更重要的任务。")
    return { recommendation: "backlog", isOverExecution: true, reasons }
  }

  // 规则 4:信息不足重投入 → validate_small
  if (
    (input.infoInsufficient || input.informationConfidence === "low" || input.informationConfidence === "unknown") &&
    (overTimebox || input.timeboxMinutes > 60)
  ) {
    reasons.push("信息不足,不适合重投入。先做 10-30 分钟小验证,确认关键事实。")
    return { recommendation: "validate_small", isOverExecution: over, reasons }
  }

  // 规则 5:情绪驱动 → pause
  if (input.emotionDriven) {
    reasons.push("当前继续做的动力来自兴奋/贪多/完美主义,而不是收益判断。先暂停。")
    return { recommendation: "pause", isOverExecution: over, reasons }
  }

  // 规则 6:正在挤占(P0 已完成) → pause
  if (input.crowdingOut) {
    reasons.push("这件事正在挤占其他任务,深做的收益需要重新对比机会成本。")
    return { recommendation: "pause", isOverExecution: over, reasons }
  }

  // 规则 7:仅超时间盒 → stop 提示
  if (over) {
    reasons.push("你已经超过本次时间盒。请判断:继续做是否比其他 P0 更重要?")
    return { recommendation: "stop", isOverExecution: true, reasons }
  }

  // 规则 8:已达最低可用 → 提示可以停
  if (input.reachedMinimum) {
    reasons.push("已达到最低可用标准。好的事情也需要边界,可以停在这里。")
    return { recommendation: "stop", isOverExecution: false, reasons }
  }

  reasons.push("边界内推进,状态健康。守住时间盒即可。")
  return { recommendation: "continue", isOverExecution: false, reasons }
}

// ─────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────

/** 创建边界卡:信息不足时自动限制初始决策 */
export async function createBoundary(input: BoundaryInput) {
  const userId = await getUserId()
  const parsed = boundarySchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data
  const p0Unfinished = await hasUnfinishedP0(userId)

  // 初始决策:信息充分度 + P0 状态决定
  let decision: Decision = "continue"
  if (data.informationConfidence === "low" || data.informationConfidence === "unknown") {
    decision = "validate_small"
  }
  if (p0Unfinished && (data.sourceType === "demand" || data.sourceType === "project")) {
    decision = "backlog"
  }

  const [row] = await db
    .insert(executionBoundaries)
    .values({
      userId,
      title: data.title,
      sourceType: data.sourceType,
      minimumDoneStandard: data.minimumDoneStandard,
      standardDoneDefinition: data.standardDoneDefinition || null,
      explicitNonGoals: data.explicitNonGoals || null,
      opportunityCost: data.opportunityCost,
      stopCondition: data.stopCondition,
      timeboxMinutes: data.timeboxMinutes,
      informationConfidence: data.informationConfidence,
      decision,
      status: decision === "backlog" ? "backlogged" : "active",
    })
    .returning()

  // 沉淀:同步在统一卡片流中生成一张边界卡,内容即三问答案
  if (row) {
    const contentParts = [
      `够用标准:${data.minimumDoneStandard}`,
      `会挤占:${data.opportunityCost}`,
      `停止条件:${data.stopCondition}`,
    ]
    if (data.standardDoneDefinition) contentParts.push(`标准完成:${data.standardDoneDefinition}`)
    if (data.explicitNonGoals) contentParts.push(`明确不做:${data.explicitNonGoals}`)
    await db.insert(unifiedCards).values({
      userId,
      cardType: "boundary",
      title: data.title,
      content: contentParts.join("\n"),
      contextType: "boundary",
      contextId: row.id,
      priority: decision === "backlog" ? "low" : "normal",
    })
  }

  revalidatePath("/boundaries")
  revalidatePath("/")
  return { boundary: row, p0Unfinished }
}

export async function listBoundaries(): Promise<ExecutionBoundary[]> {
  const userId = await getUserId()
  return db
    .select()
    .from(executionBoundaries)
    .where(eq(executionBoundaries.userId, userId))
    .orderBy(desc(executionBoundaries.createdAt))
}

export async function getBoundary(id: number) {
  const userId = await getUserId()
  const [boundary] = await db
    .select()
    .from(executionBoundaries)
    .where(and(eq(executionBoundaries.id, id), eq(executionBoundaries.userId, userId)))
  if (!boundary) return null
  const checks = await db
    .select()
    .from(boundaryChecks)
    .where(and(eq(boundaryChecks.boundaryId, id), eq(boundaryChecks.userId, userId)))
    .orderBy(desc(boundaryChecks.createdAt))
  return { boundary, checks }
}

export async function updateBoundaryStatus(id: number, status: "active" | "completed" | "stopped" | "backlogged") {
  const userId = await getUserId()
  await db
    .update(executionBoundaries)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(executionBoundaries.id, id), eq(executionBoundaries.userId, userId)))
  revalidatePath("/boundaries")
  revalidatePath(`/boundaries/${id}`)
  return { ok: true }
}

export async function deleteBoundary(id: number) {
  const userId = await getUserId()
  await db
    .delete(unifiedCards)
    .where(
      and(
        eq(unifiedCards.contextType, "boundary"),
        eq(unifiedCards.contextId, id),
        eq(unifiedCards.userId, userId)
      )
    )
  await db
    .delete(boundaryChecks)
    .where(and(eq(boundaryChecks.boundaryId, id), eq(boundaryChecks.userId, userId)))
  await db
    .delete(executionBoundaries)
    .where(and(eq(executionBoundaries.id, id), eq(executionBoundaries.userId, userId)))
  revalidatePath("/boundaries")
  return { ok: true }
}

// ─────────────────────────────────────────────
// 边界检查:跑规则引擎并落库
// ─────────────────────────────────────────────

export async function runBoundaryCheck(input: CheckInput) {
  const userId = await getUserId()
  const parsed = checkSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data

  const [boundary] = await db
    .select()
    .from(executionBoundaries)
    .where(and(eq(executionBoundaries.id, data.boundaryId), eq(executionBoundaries.userId, userId)))
  if (!boundary) return { error: "边界卡不存在" }

  const p0Unfinished = await hasUnfinishedP0(userId)

  const verdict = runRuleEngine({
    timeSpentMinutes: data.timeSpentMinutes,
    timeboxMinutes: boundary.timeboxMinutes,
    evidenceCreated: data.evidenceCreated,
    reachedMinimum: data.reachedMinimum,
    crowdingOut: data.crowdingOut,
    emotionDriven: data.emotionDriven,
    infoInsufficient: data.infoInsufficient,
    informationConfidence: boundary.informationConfidence,
    p0Unfinished,
  })

  const [check] = await db
    .insert(boundaryChecks)
    .values({
      userId,
      boundaryId: boundary.id,
      currentProgress: data.currentProgress || null,
      timeSpentMinutes: data.timeSpentMinutes,
      evidenceCreated: data.evidenceCreated,
      reachedMinimum: data.reachedMinimum,
      crowdingOut: data.crowdingOut,
      emotionDriven: data.emotionDriven,
      infoInsufficient: data.infoInsufficient,
      isOverExecution: verdict.isOverExecution,
      whatIsBeingCrowdedOut: data.whatIsBeingCrowdedOut || null,
      recommendation: verdict.recommendation,
      reasons: verdict.reasons.join("\n"),
    })
    .returning()

  // 同步边界卡决策与状态
  const statusMap: Record<string, string> = {
    stop: "stopped",
    backlog: "backlogged",
  }
  await db
    .update(executionBoundaries)
    .set({
      decision: verdict.recommendation,
      status: statusMap[verdict.recommendation] ?? boundary.status,
      updatedAt: new Date(),
    })
    .where(and(eq(executionBoundaries.id, boundary.id), eq(executionBoundaries.userId, userId)))

  revalidatePath("/boundaries")
  revalidatePath(`/boundaries/${boundary.id}`)
  revalidatePath("/")
  return { check: check as BoundaryCheck, verdict, p0Unfinished }
}

// ─────────────────────────────────────────────
// Dashboard 摘要
// ─────────────────────────────────────────────

export async function getBoundarySummary() {
  const userId = await getUserId()
  const all = await db
    .select()
    .from(executionBoundaries)
    .where(eq(executionBoundaries.userId, userId))
    .orderBy(desc(executionBoundaries.updatedAt))

  const active = all.filter((b) => b.status === "active")
  return {
    deepWorking: active.filter((b) => b.decision === "continue"),
    overExecuting: all.filter((b) => b.status === "stopped" || b.decision === "stop" || b.decision === "pause"),
    lowInfoAdvancing: active.filter(
      (b) => b.informationConfidence === "low" || b.informationConfidence === "unknown"
    ),
    backlogged: all.filter((b) => b.status === "backlogged"),
    todayBoundaries: active.slice(0, 5),
  }
}
