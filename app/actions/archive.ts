"use server"

// 成长档案:只读聚合,不建新表。
// 档案由事件、复盘、规则和验证实时生成。
import { db } from "@/lib/db"
import { confirmationRules, eventCases, eventReviews, spendConversions } from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { and, desc, eq, gte, sql } from "drizzle-orm"

export type ArchiveStats = {
  repeatEvents: number
  effectiveRules: number
  improvements: number
  days: number
}

export type ArchiveEntryKind = "verify" | "rule" | "review" | "archive"

export type ArchiveEntry = {
  kind: ArchiveEntryKind
  date: string // ISO
  title: string
  subtitle: string // 时间线卡内的副行(如「验证 · 结果改善」)
  sourceLabel: string // 右侧来源卡文本
  sourceBadge: "verified" | "high_impact" | null
  href: string
}

/** 最近 N 天统计:重复事件 / 有效规则 / 改善次数 */
export async function getArchiveStats(days = 30): Promise<ArchiveStats> {
  const userId = await getUserId()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [eventAgg] = await db
    .select({
      repeatEvents: sql<number>`count(*) filter (where ${eventCases.isRepeat})::int`,
    })
    .from(eventCases)
    .where(and(eq(eventCases.userId, userId), gte(eventCases.createdAt, since)))

  // 有效规则:active 且有过帮助记录(不限时间窗,规则是长期资产)
  const [ruleAgg] = await db
    .select({
      effectiveRules: sql<number>`count(*) filter (where ${confirmationRules.status} = 'active' and ${confirmationRules.helpfulCount} > 0)::int`,
    })
    .from(confirmationRules)
    .where(eq(confirmationRules.userId, userId))

  // 改善次数:窗口内标记 helpful 的换算验证(resolution 非 unknown 且关联了规则)
  const [improveAgg] = await db
    .select({
      improvements: sql<number>`count(*) filter (where ${spendConversions.resolution} in ('avoided','partial') and ${spendConversions.resolvedAt} >= ${since})::int`,
    })
    .from(spendConversions)
    .where(eq(spendConversions.userId, userId))

  return {
    repeatEvents: eventAgg?.repeatEvents ?? 0,
    effectiveRules: ruleAgg?.effectiveRules ?? 0,
    improvements: improveAgg?.improvements ?? 0,
    days,
  }
}

/** 证据战报时间线:验证 / 规则形成 / 复盘完成 / 事件存档,统一按时间倒序 */
export async function getArchiveTimeline(filter: ArchiveEntryKind | "all" = "all"): Promise<ArchiveEntry[]> {
  const userId = await getUserId()
  const entries: ArchiveEntry[] = []

  // 1. 验证:已了结且守住金额的换算记录
  if (filter === "all" || filter === "verify") {
    const rows = await db
      .select({
        id: spendConversions.id,
        resolution: spendConversions.resolution,
        resolvedAt: spendConversions.resolvedAt,
        privacyLabel: spendConversions.privacyLabel,
        protectedAmountMinor: spendConversions.protectedAmountMinor,
        ruleId: spendConversions.ruleId,
      })
      .from(spendConversions)
      .where(and(eq(spendConversions.userId, userId), sql`${spendConversions.resolvedAt} is not null`))
      .orderBy(desc(spendConversions.resolvedAt))
      .limit(30)
    for (const r of rows) {
      if (!r.resolvedAt) continue
      const improved = r.resolution === "avoided" || r.resolution === "partial"
      entries.push({
        kind: "verify",
        date: r.resolvedAt.toISOString(),
        title: improved
          ? `冷静期后守住 ¥${Math.round(r.protectedAmountMinor / 100).toLocaleString()}`
          : `${r.privacyLabel}换算已了结`,
        subtitle: improved ? "验证 · 结果改善" : "验证 · 已记录",
        sourceLabel: `${r.privacyLabel}换算记录`,
        sourceBadge: improved ? "verified" : null,
        href: `/convert/${r.id}`,
      })
    }
  }

  // 2. 规则形成
  if (filter === "all" || filter === "rule") {
    const rows = await db
      .select()
      .from(confirmationRules)
      .where(and(eq(confirmationRules.userId, userId), sql`${confirmationRules.status} != 'archived'`))
      .orderBy(desc(confirmationRules.createdAt))
      .limit(30)
    for (const r of rows) {
      entries.push({
        kind: "rule",
        date: r.createdAt.toISOString(),
        title: `形成规则:${r.ruleText.slice(0, 40)}`,
        subtitle: r.severity === "high" ? "来源于高影响事件" : "规则入库",
        sourceLabel: r.scenario ? `场景:${r.scenario.slice(0, 30)}` : r.triggerCondition ? r.triggerCondition.slice(0, 40) : "手动创建",
        sourceBadge: r.severity === "high" ? "high_impact" : null,
        href: `/rules/${r.id}`,
      })
    }
  }

  // 3. 复盘完成
  if (filter === "all" || filter === "review") {
    const rows = await db
      .select({
        id: eventReviews.id,
        eventId: eventReviews.eventId,
        whatHappened: eventReviews.whatHappened,
        rootCause: eventReviews.rootCause,
        createdAt: eventReviews.createdAt,
        eventTitle: eventCases.title,
      })
      .from(eventReviews)
      .innerJoin(eventCases, eq(eventReviews.eventId, eventCases.id))
      .where(eq(eventReviews.userId, userId))
      .orderBy(desc(eventReviews.createdAt))
      .limit(30)
    for (const r of rows) {
      entries.push({
        kind: "review",
        date: r.createdAt.toISOString(),
        title: `完成复盘:${r.eventTitle.slice(0, 30)}`,
        subtitle: "复盘 · 原因分析",
        sourceLabel: `复盘记录:${r.whatHappened.slice(0, 30)}`,
        sourceBadge: null,
        href: `/event-library/${r.eventId}`,
      })
    }
  }

  // 4. 事件存档(已关闭且未走复盘的事件)
  if (filter === "all" || filter === "archive") {
    const rows = await db
      .select()
      .from(eventCases)
      .where(and(eq(eventCases.userId, userId), sql`${eventCases.status} in ('closed','solved','found')`))
      .orderBy(desc(eventCases.updatedAt))
      .limit(30)
    for (const r of rows) {
      entries.push({
        kind: "archive",
        date: r.updatedAt.toISOString(),
        title: r.title.slice(0, 40),
        subtitle: "已存档",
        sourceLabel: r.summary ? r.summary.slice(0, 40) : `事件记录 · ${r.scene}`,
        sourceBadge: r.impactLevel === "high" ? "high_impact" : null,
        href: `/event-library/${r.id}`,
      })
    }
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40)
}
