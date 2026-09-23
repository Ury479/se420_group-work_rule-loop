"use server"

import { db } from "@/lib/db"
import { confirmationRules, treeTasks } from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { and, eq, desc, sql, isNotNull, asc } from "drizzle-orm"

// 按时段返回一条最相关的活跃规则(晨间第三屏 / 夜间提醒)
export async function getPrincipleReminder(context: "morning" | "night") {
  const userId = await getUserId()
  const keywords = context === "night" ? ["晚", "睡", "夜", "凌晨"] : ["早", "晨", "起床", "第一"]

  const rules = await db
    .select({
      id: confirmationRules.id,
      ruleText: confirmationRules.ruleText,
      principleText: confirmationRules.principleText,
      triggerCondition: confirmationRules.triggerCondition,
      currentStateTrigger: confirmationRules.currentStateTrigger,
      severity: confirmationRules.severity,
    })
    .from(confirmationRules)
    .where(and(eq(confirmationRules.userId, userId), eq(confirmationRules.status, "active")))
    .orderBy(desc(confirmationRules.rulePriority), desc(confirmationRules.matchCount))
    .limit(50)

  // 优先匹配触发条件/状态里含时段关键词的规则
  const matched = rules.find((r) => {
    const text = `${r.triggerCondition ?? ""} ${r.currentStateTrigger ?? ""} ${r.ruleText}`
    return keywords.some((k) => text.includes(k))
  })
  return matched ?? rules[0] ?? null
}

// 规则执行率汇总(/rules 顶部统计条)
export async function getRuleExecutionStats() {
  const userId = await getUserId()
  const [row] = await db
    .select({
      totalRules: sql<number>`COUNT(*)`,
      activeRules: sql<number>`COUNT(*) FILTER (WHERE ${confirmationRules.status} = 'active')`,
      totalMatches: sql<number>`COALESCE(SUM(${confirmationRules.matchCount}), 0)`,
      totalActed: sql<number>`COALESCE(SUM(${confirmationRules.actedCount}), 0)`,
      totalHelpful: sql<number>`COALESCE(SUM(${confirmationRules.helpfulCount}), 0)`,
    })
    .from(confirmationRules)
    .where(eq(confirmationRules.userId, userId))

  const totalMatches = Number(row?.totalMatches ?? 0)
  const totalActed = Number(row?.totalActed ?? 0)
  return {
    totalRules: Number(row?.totalRules ?? 0),
    activeRules: Number(row?.activeRules ?? 0),
    totalMatches,
    totalActed,
    totalHelpful: Number(row?.totalHelpful ?? 0),
    executionRate: totalMatches > 0 ? Math.round((totalActed / totalMatches) * 100) : null,
  }
}

// 今日第一任务:P0 优先,其次 P1;deadline 最近优先
export async function getTodayFirstTask() {
  const userId = await getUserId()
  for (const priority of ["P0", "P1"]) {
    const withDeadline = await db
      .select({
        id: treeTasks.id,
        title: treeTasks.title,
        priority: treeTasks.priority,
        deadline: treeTasks.deadline,
        progress: treeTasks.progress,
      })
      .from(treeTasks)
      .where(
        and(
          eq(treeTasks.userId, userId),
          eq(treeTasks.status, "todo"),
          eq(treeTasks.priority, priority),
          isNotNull(treeTasks.deadline),
        ),
      )
      .orderBy(asc(treeTasks.deadline))
      .limit(1)
    if (withDeadline[0]) return withDeadline[0]

    const noDeadline = await db
      .select({
        id: treeTasks.id,
        title: treeTasks.title,
        priority: treeTasks.priority,
        deadline: treeTasks.deadline,
        progress: treeTasks.progress,
      })
      .from(treeTasks)
      .where(and(eq(treeTasks.userId, userId), eq(treeTasks.status, "todo"), eq(treeTasks.priority, priority)))
      .orderBy(desc(treeTasks.updatedAt))
      .limit(1)
    if (noDeadline[0]) return noDeadline[0]
  }
  return null
}
