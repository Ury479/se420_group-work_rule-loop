"use server"

import { db } from "@/lib/db"
import {
  eventCases,
  eventReviews,
  eventCandidateRules,
  confirmationRules,
  interventionRuleVersions,
  type EventCase,
  type EventCandidateRule,
} from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { and, eq, desc, sql, or, ilike } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
  EVENT_TYPES,
  EVENT_SCENES,
  EVENT_STATUSES,
  ROOT_CAUSES,
  RULE_STATUSES,
  rootCauseLabel,
  sceneLabel,
  statusLabel,
  eventTypeLabel,
} from "@/lib/event-library-types"

// ─────────────────────────────────────────────
// 事件案例库:事件 → 复盘 → 模式 → 规则 → 资产
// ─────────────────────────────────────────────

const typeValues = EVENT_TYPES.map((t) => t.value) as [string, ...string[]]
const sceneValues = EVENT_SCENES.map((s) => s.value) as [string, ...string[]]
const statusValues = EVENT_STATUSES.map((s) => s.value) as [string, ...string[]]
const rootCauseValues = ROOT_CAUSES.map((r) => r.value) as [string, ...string[]]
const ruleStatusValues = RULE_STATUSES.map((r) => r.value) as [string, ...string[]]

// ── 快速记录(30 秒) ──

const quickRecordSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200),
  eventType: z.enum(typeValues),
  scene: z.enum(sceneValues),
  status: z.enum(statusValues),
  itemName: z.string().max(100).optional().nullable(),
  moneyLoss: z.number().int().min(0).max(1000000).default(0),
  searchMinutes: z.number().int().min(0).max(10000).default(0),
  tags: z.string().max(200).optional().nullable(),
  impactLevel: z.enum(["low", "mid", "high"]).default("low"),
  isRepeat: z.boolean().default(false),
})

export async function createEventCase(input: z.input<typeof quickRecordSchema>) {
  const userId = await getUserId()
  const parsed = quickRecordSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data
  const [row] = await db
    .insert(eventCases)
    .values({
      userId,
      title: data.title,
      eventType: data.eventType,
      scene: data.scene,
      status: data.status,
      itemName: data.itemName || null,
      moneyLoss: data.moneyLoss,
      searchMinutes: data.searchMinutes,
      tags: data.tags || null,
      impactLevel: data.impactLevel,
      isRepeat: data.isRepeat,
    })
    .returning()
  revalidatePath("/event-library")
  revalidatePath("/")
  return { eventCase: row }
}

export async function updateEventStatus(id: number, status: string) {
  const userId = await getUserId()
  if (!statusValues.includes(status)) return { error: "状态无效" }
  await db
    .update(eventCases)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(eventCases.id, id), eq(eventCases.userId, userId)))
  revalidatePath("/event-library")
  revalidatePath(`/event-library/${id}`)
  return { ok: true }
}

export async function deleteEventCase(id: number) {
  const userId = await getUserId()
  await db
    .delete(eventReviews)
    .where(and(eq(eventReviews.eventId, id), eq(eventReviews.userId, userId)))
  await db
    .update(eventCandidateRules)
    .set({ sourceCaseId: null })
    .where(and(eq(eventCandidateRules.sourceCaseId, id), eq(eventCandidateRules.userId, userId)))
  await db.delete(eventCases).where(and(eq(eventCases.id, id), eq(eventCases.userId, userId)))
  revalidatePath("/event-library")
  revalidatePath("/")
  return { ok: true }
}

// ── 查询 ──

export async function getEventCases(): Promise<EventCase[]> {
  const userId = await getUserId()
  return db
    .select()
    .from(eventCases)
    .where(eq(eventCases.userId, userId))
    .orderBy(desc(eventCases.createdAt))
}

export async function getEventCase(id: number) {
  const userId = await getUserId()
  const [row] = await db
    .select()
    .from(eventCases)
    .where(and(eq(eventCases.id, id), eq(eventCases.userId, userId)))
  if (!row) return null
  const reviews = await db
    .select()
    .from(eventReviews)
    .where(and(eq(eventReviews.eventId, id), eq(eventReviews.userId, userId)))
    .orderBy(desc(eventReviews.createdAt))
  const rules = await db
    .select()
    .from(eventCandidateRules)
    .where(and(eq(eventCandidateRules.sourceCaseId, id), eq(eventCandidateRules.userId, userId)))
  // 同类案例:同场景或同根因
  const related = await db
    .select()
    .from(eventCases)
    .where(
      and(
        eq(eventCases.userId, userId),
        eq(eventCases.scene, row.scene),
        sql`${eventCases.id} != ${id}`
      )
    )
    .orderBy(desc(eventCases.createdAt))
    .limit(5)
  return { eventCase: row, reviews, rules, related }
}

// ── 五问极简复盘 ──

const reviewSchema = z.object({
  eventId: z.number().int().positive(),
  whatHappened: z.string().min(1, "第 1 问不能为空").max(2000),
  whyNotDiscovered: z.string().max(2000).optional().nullable(),
  rootCause: z.enum(rootCauseValues),
  prevention: z.string().max(2000).optional().nullable(),
  systemRule: z.string().max(500).optional().nullable(),
  // 复盘收尾双分支:关联已有拦截规则(matchCount+1)或创建一条新的拦截规则草稿
  linkedRuleId: z.number().int().positive().optional().nullable(),
  newRuleText: z.string().max(500).optional().nullable(),
})

export async function submitMiniReview(input: z.infer<typeof reviewSchema>) {
  const userId = await getUserId()
  const parsed = reviewSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data
  const [caseRow] = await db
    .select()
    .from(eventCases)
    .where(and(eq(eventCases.id, data.eventId), eq(eventCases.userId, userId)))
  if (!caseRow) return { error: "案例不存在" }

  const [review] = await db
    .insert(eventReviews)
    .values({
      userId,
      eventId: data.eventId,
      whatHappened: data.whatHappened,
      whyNotDiscovered: data.whyNotDiscovered || null,
      rootCause: data.rootCause,
      prevention: data.prevention || null,
      systemRule: data.systemRule || null,
    })
    .returning()

  // 摘要 = 第 1 问;标记已复盘
  await db
    .update(eventCases)
    .set({ reviewed: true, summary: data.whatHappened.slice(0, 200), updatedAt: new Date() })
    .where(and(eq(eventCases.id, data.eventId), eq(eventCases.userId, userId)))

  // 第 5 问自动生成候选规则,链接支撑案例
  let rule: EventCandidateRule | null = null
  if (data.systemRule && data.systemRule.trim()) {
    const [r] = await db
      .insert(eventCandidateRules)
      .values({
        userId,
        ruleText: data.systemRule.trim(),
        scene: caseRow.scene,
        rootCause: data.rootCause,
        sourceCaseId: data.eventId,
        status: "candidate",
      })
      .returning()
    rule = r
  }

  // 关联已有拦截规则:计一次匹配(证据积累)
  if (data.linkedRuleId) {
    await db
      .update(confirmationRules)
      .set({
        matchCount: sql`${confirmationRules.matchCount} + 1`,
        lastMatchedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(confirmationRules.id, data.linkedRuleId), eq(confirmationRules.userId, userId)))
  }

  // 创建新拦截规则草稿(与版本快照同事务,遵守规则版本约定)
  let newRuleId: number | null = null
  if (!data.linkedRuleId && data.newRuleText && data.newRuleText.trim()) {
    const text = data.newRuleText.trim()
    newRuleId = await db.transaction(async (tx) => {
      const rows = await tx
        .insert(confirmationRules)
        .values({
          userId,
          domain: "custom",
          scenario: caseRow.scene,
          ruleText: text,
          triggerCondition: data.whatHappened.slice(0, 200),
          isActive: false,
          status: "draft",
          triggerText: text,
          recommendedAction: text,
          sourceType: "review",
          currentVersion: 1,
        })
        .returning()
      const created = rows[0]
      await tx.insert(interventionRuleVersions).values({
        userId,
        ruleId: created.id,
        version: 1,
        sceneTagsSnapshot: caseRow.scene,
        riskTagsSnapshot: null,
        triggerTextSnapshot: text,
        actionSnapshot: text,
        severitySnapshot: created.severity,
        changeReason: "复盘任务创建规则",
      })
      return created.id
    })
    revalidatePath("/rules")
  }

  revalidatePath(`/event-library/${data.eventId}`)
  revalidatePath("/event-library")
  return { review, rule, newRuleId }
}

// ── 模式聚合引擎(基于用户复盘的根因,实时聚合,不做 AI 推断) ──

export type PatternAggregate = {
  rootCause: string
  label: string
  evidenceCount: number
  riskLevel: "high" | "medium" | "low"
  totalSearchMinutes: number
  totalMoneyLoss: number
  caseIds: number[]
  caseTitles: string[]
}

export async function getPatterns(): Promise<PatternAggregate[]> {
  const userId = await getUserId()
  const rows = await db
    .select({
      rootCause: eventReviews.rootCause,
      eventId: eventReviews.eventId,
      title: eventCases.title,
      searchMinutes: eventCases.searchMinutes,
      moneyLoss: eventCases.moneyLoss,
    })
    .from(eventReviews)
    .innerJoin(eventCases, eq(eventReviews.eventId, eventCases.id))
    .where(eq(eventReviews.userId, userId))

  const map = new Map<string, PatternAggregate>()
  for (const r of rows) {
    const existing = map.get(r.rootCause)
    if (existing) {
      if (!existing.caseIds.includes(r.eventId)) {
        existing.evidenceCount += 1
        existing.caseIds.push(r.eventId)
        existing.caseTitles.push(r.title)
        existing.totalSearchMinutes += r.searchMinutes
        existing.totalMoneyLoss += r.moneyLoss
      }
    } else {
      map.set(r.rootCause, {
        rootCause: r.rootCause,
        label: rootCauseLabel(r.rootCause),
        evidenceCount: 1,
        riskLevel: "low",
        totalSearchMinutes: r.searchMinutes,
        totalMoneyLoss: r.moneyLoss,
        caseIds: [r.eventId],
        caseTitles: [r.title],
      })
    }
  }
  const list = [...map.values()]
  for (const p of list) {
    p.riskLevel = p.evidenceCount >= 3 ? "high" : p.evidenceCount === 2 ? "medium" : "low"
  }
  return list.sort((a, b) => b.evidenceCount - a.evidenceCount)
}

// ── 高风险场景 / 物品统计 ──

export type SceneStat = {
  key: string
  label: string
  frequency: number
  totalSearchMinutes: number
  totalMoneyLoss: number
}

export async function getSceneStats(): Promise<SceneStat[]> {
  const userId = await getUserId()
  const rows = await db
    .select({
      scene: eventCases.scene,
      frequency: sql<number>`count(*)::int`,
      totalSearchMinutes: sql<number>`coalesce(sum(${eventCases.searchMinutes}), 0)::int`,
      totalMoneyLoss: sql<number>`coalesce(sum(${eventCases.moneyLoss}), 0)::int`,
    })
    .from(eventCases)
    .where(eq(eventCases.userId, userId))
    .groupBy(eventCases.scene)
    .orderBy(desc(sql`count(*)`))
  return rows.map((r) => ({
    key: r.scene,
    label: sceneLabel(r.scene),
    frequency: r.frequency,
    totalSearchMinutes: r.totalSearchMinutes,
    totalMoneyLoss: r.totalMoneyLoss,
  }))
}

export async function getItemStats(): Promise<SceneStat[]> {
  const userId = await getUserId()
  const rows = await db
    .select({
      item: eventCases.itemName,
      frequency: sql<number>`count(*)::int`,
      totalSearchMinutes: sql<number>`coalesce(sum(${eventCases.searchMinutes}), 0)::int`,
      totalMoneyLoss: sql<number>`coalesce(sum(${eventCases.moneyLoss}), 0)::int`,
    })
    .from(eventCases)
    .where(and(eq(eventCases.userId, userId), sql`${eventCases.itemName} is not null`))
    .groupBy(eventCases.itemName)
    .orderBy(desc(sql`count(*)`))
  return rows
    .filter((r) => r.item)
    .map((r) => ({
      key: r.item as string,
      label: r.item as string,
      frequency: r.frequency,
      totalSearchMinutes: r.totalSearchMinutes,
      totalMoneyLoss: r.totalMoneyLoss,
    }))
}

// ── 规则管理 ──

export async function getRulesList(): Promise<
  (EventCandidateRule & { sourceCaseTitle: string | null })[]
> {
  const userId = await getUserId()
  const rows = await db
    .select({
      rule: eventCandidateRules,
      sourceCaseTitle: eventCases.title,
    })
    .from(eventCandidateRules)
    .leftJoin(eventCases, eq(eventCandidateRules.sourceCaseId, eventCases.id))
    .where(eq(eventCandidateRules.userId, userId))
    .orderBy(desc(eventCandidateRules.createdAt))
  return rows.map((r) => ({ ...r.rule, sourceCaseTitle: r.sourceCaseTitle }))
}

export async function updateRuleStatus(id: number, status: string) {
  const userId = await getUserId()
  if (!ruleStatusValues.includes(status)) return { error: "状态无效" }
  await db
    .update(eventCandidateRules)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(eventCandidateRules.id, id), eq(eventCandidateRules.userId, userId)))
  revalidatePath("/event-library/rules")
  return { ok: true }
}

export async function markRuleEffective(id: number) {
  const userId = await getUserId()
  await db
    .update(eventCandidateRules)
    .set({ effectiveness: sql`${eventCandidateRules.effectiveness} + 1`, updatedAt: new Date() })
    .where(and(eq(eventCandidateRules.id, id), eq(eventCandidateRules.userId, userId)))
  revalidatePath("/event-library/rules")
  return { ok: true }
}

// ── 全局统计 ──

export type LibraryStats = {
  totalCases: number
  solvedCases: number
  lostCases: number
  totalSearchMinutes: number
  totalMoneyLoss: number
  reviewedCases: number
  topPattern: string | null
  topScene: string | null
  topItem: string | null
  activeRules: number
}

export async function getLibraryStats(): Promise<LibraryStats> {
  const userId = await getUserId()
  const [caseAgg] = await db
    .select({
      totalCases: sql<number>`count(*)::int`,
      solvedCases: sql<number>`count(*) filter (where ${eventCases.status} in ('solved','found','closed'))::int`,
      lostCases: sql<number>`count(*) filter (where ${eventCases.status} = 'lost')::int`,
      totalSearchMinutes: sql<number>`coalesce(sum(${eventCases.searchMinutes}), 0)::int`,
      totalMoneyLoss: sql<number>`coalesce(sum(${eventCases.moneyLoss}), 0)::int`,
      reviewedCases: sql<number>`count(*) filter (where ${eventCases.reviewed})::int`,
    })
    .from(eventCases)
    .where(eq(eventCases.userId, userId))

  const patterns = await getPatterns()
  const scenes = await getSceneStats()
  const items = await getItemStats()

  const [ruleAgg] = await db
    .select({ activeRules: sql<number>`count(*) filter (where ${eventCandidateRules.status} = 'active')::int` })
    .from(eventCandidateRules)
    .where(eq(eventCandidateRules.userId, userId))

  return {
    totalCases: caseAgg?.totalCases ?? 0,
    solvedCases: caseAgg?.solvedCases ?? 0,
    lostCases: caseAgg?.lostCases ?? 0,
    totalSearchMinutes: caseAgg?.totalSearchMinutes ?? 0,
    totalMoneyLoss: caseAgg?.totalMoneyLoss ?? 0,
    reviewedCases: caseAgg?.reviewedCases ?? 0,
    topPattern: patterns[0]?.label ?? null,
    topScene: scenes[0]?.label ?? null,
    topItem: items[0]?.label ?? null,
    activeRules: ruleAgg?.activeRules ?? 0,
  }
}

// ── 全文搜索 ──

export async function searchCases(query: string): Promise<EventCase[]> {
  const userId = await getUserId()
  const q = query.trim()
  if (!q) return []
  const like = `%${q}%`
  return db
    .select()
    .from(eventCases)
    .where(
      and(
        eq(eventCases.userId, userId),
        or(
          ilike(eventCases.title, like),
          ilike(eventCases.summary, like),
          ilike(eventCases.itemName, like),
          ilike(eventCases.tags, like)
        )
      )
    )
    .orderBy(desc(eventCases.createdAt))
    .limit(50)
}

// ── GPT Context 生成(生成结构化 Prompt,不调用 GPT) ──

export async function generateGptContext(id: number): Promise<string | null> {
  // getEventCase 内部已按当前用户过滤,无需重复获取 userId
  const data = await getEventCase(id)
  if (!data) return null
  const { eventCase: c, reviews, rules, related } = data
  const patterns = await getPatterns()
  const matched = patterns.filter((p) => reviews.some((r) => r.rootCause === p.rootCause))

  const lines: string[] = [
    "# 事件分析请求",
    "",
    "## 事件",
    `- 标题:${c.title}`,
    `- 类型:${eventTypeLabel(c.eventType)}`,
    `- 场景:${sceneLabel(c.scene)}`,
    `- 状态:${statusLabel(c.status)}`,
  ]
  if (c.itemName) lines.push(`- 物品:${c.itemName}`)
  if (c.searchMinutes > 0) lines.push(`- 寻找耗时:${c.searchMinutes} 分钟`)
  if (c.moneyLoss > 0) lines.push(`- 金钱损失:${c.moneyLoss} 元`)
  lines.push(`- 发生时间:${c.createdAt.toISOString().slice(0, 10)}`)

  if (reviews.length > 0) {
    const r = reviews[0]
    lines.push("", "## 用户复盘")
    lines.push(`- 发生了什么:${r.whatHappened}`)
    if (r.whyNotDiscovered) lines.push(`- 为什么没有立即发现:${r.whyNotDiscovered}`)
    lines.push(`- 用户判断的根因:${rootCauseLabel(r.rootCause)}`)
    if (r.prevention) lines.push(`- 用户的预防设想:${r.prevention}`)
  }

  if (matched.length > 0) {
    lines.push("", "## 历史模式(基于用户既往复盘)")
    for (const p of matched) {
      lines.push(`- ${p.label}:已出现 ${p.evidenceCount} 次,累计寻找 ${p.totalSearchMinutes} 分钟`)
    }
  }

  if (related.length > 0) {
    lines.push("", "## 同场景历史案例")
    for (const rc of related) {
      lines.push(`- ${rc.title}(${statusLabel(rc.status)})`)
    }
  }

  if (rules.length > 0) {
    lines.push("", "## 相关规则")
    for (const rl of rules) {
      lines.push(`- [${rl.status}] ${rl.ruleText}`)
    }
  }

  lines.push(
    "",
    "## 请求",
    "1. 基于以上事实分析这次事件的时间线与关键节点",
    "2. 结合历史模式判断这是否是重复模式",
    "3. 提出 2-3 个值得追问的问题",
    "4. 评估现有规则是否足够,如不足给出一条可执行的新规则"
  )
  return lines.join("\n")
}

// ── Daily Review 摘要生成 ──

export async function generateDailySummary(id: number): Promise<string | null> {
  const data = await getEventCase(id)
  if (!data) return null
  const { eventCase: c, reviews } = data
  const r = reviews[0]
  const parts = [
    `【事件】${c.title}(${sceneLabel(c.scene)} · ${statusLabel(c.status)})`,
  ]
  if (r) {
    parts.push(`【根因】${rootCauseLabel(r.rootCause)}`)
    if (r.prevention) parts.push(`【预防】${r.prevention}`)
    if (r.systemRule) parts.push(`【规则】${r.systemRule}`)
  } else {
    parts.push("【待复盘】尚未完成五问复盘")
  }
  return parts.join("\n")
}
