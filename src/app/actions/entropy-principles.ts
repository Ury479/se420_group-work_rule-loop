"use server";

import { withAccount } from "@/lib/action";

import { db } from "@/db";
import { confirmationRules, treeTasks } from "@/db/schema";
import { appTimeZone, calendarToday } from "@/lib/calendar";
import { getUserId } from "@/lib/user";
import { and, asc, desc, eq, inArray, notExists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

// 按时段返回一条最相关的活跃规则(晨间第三屏 / 夜间提醒)
export async function getPrincipleReminder(context: "morning" | "night") {
  return withAccount(async () => {
    const userId = await getUserId();
    const keywords =
      context === "night"
        ? ["晚", "睡", "夜", "凌晨"]
        : ["早", "晨", "起床", "第一"];

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
      .where(
        and(
          eq(confirmationRules.userId, userId),
          eq(confirmationRules.status, "active"),
        ),
      )
      .orderBy(
        desc(confirmationRules.rulePriority),
        desc(confirmationRules.matchCount),
      )
      .limit(50);

    // 优先匹配触发条件/状态里含时段关键词的规则
    const matched = rules.find((r) => {
      const text = `${r.triggerCondition ?? ""} ${r.currentStateTrigger ?? ""} ${r.ruleText}`;
      return keywords.some((k) => text.includes(k));
    });
    return matched ?? rules[0] ?? null;
  });
}

// 规则执行率汇总(/rules 顶部统计条)
export async function getRuleExecutionStats() {
  return withAccount(async () => {
    const userId = await getUserId();
    const [row] = await db
      .select({
        totalRules: sql<number>`COUNT(*)`,
        activeRules: sql<number>`COUNT(*) FILTER (WHERE ${confirmationRules.status} = 'active')`,
        totalMatches: sql<number>`COALESCE(SUM(${confirmationRules.matchCount}), 0)`,
        totalActed: sql<number>`COALESCE(SUM(${confirmationRules.actedCount}), 0)`,
        totalHelpful: sql<number>`COALESCE(SUM(${confirmationRules.helpfulCount}), 0)`,
      })
      .from(confirmationRules)
      .where(eq(confirmationRules.userId, userId));

    const totalMatches = Number(row?.totalMatches ?? 0);
    const totalActed = Number(row?.totalActed ?? 0);
    return {
      totalRules: Number(row?.totalRules ?? 0),
      activeRules: Number(row?.activeRules ?? 0),
      totalMatches,
      totalActed,
      totalHelpful: Number(row?.totalHelpful ?? 0),
      executionRate:
        totalMatches > 0 ? Math.round((totalActed / totalMatches) * 100) : null,
    };
  });
}

function taskHasNoChildren(userId: string) {
  const child = alias(treeTasks, "child_task");
  return notExists(
    db
      .select({ id: child.id })
      .from(child)
      .where(and(eq(child.userId, userId), eq(child.parentId, treeTasks.id))),
  );
}

// 今日第一任务：P0 优先，同优先级先看截止时间。
export async function getTodayFirstTask({
  leafOnly = false,
}: { leafOnly?: boolean } = {}) {
  return withAccount(async () => {
    const userId = await getUserId();
    const [task] = await db
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
          inArray(treeTasks.priority, ["P0", "P1"]),
          leafOnly ? taskHasNoChildren(userId) : undefined,
        ),
      )
      .orderBy(
        asc(treeTasks.priority),
        sql`${treeTasks.deadline} ASC NULLS LAST`,
        desc(treeTasks.updatedAt),
        asc(treeTasks.id),
      )
      .limit(1);
    return task ?? null;
  });
}

export async function getUpcomingTaskDeadlines(): Promise<{
  today: string;
  lastDay: string;
  timeZone: string;
  tasks: { id: number; title: string; deadline: Date }[];
}> {
  return withAccount(async () => {
    const userId = await getUserId();
    const timeZone = appTimeZone();
    const today = calendarToday(new Date(), timeZone);
    const lastDate = new Date(`${today}T00:00:00Z`);
    lastDate.setUTCDate(lastDate.getUTCDate() + 6);
    const lastDay = lastDate.toISOString().slice(0, 10);
    const localDeadline = sql`(${treeTasks.deadline} AT TIME ZONE ${timeZone})::date`;

    const rows = await db
      .select({
        id: treeTasks.id,
        title: treeTasks.title,
        deadline: treeTasks.deadline,
      })
      .from(treeTasks)
      .where(
        and(
          eq(treeTasks.userId, userId),
          eq(treeTasks.status, "todo"),
          sql`${localDeadline} BETWEEN ${today}::date AND ${lastDay}::date`,
          taskHasNoChildren(userId),
        ),
      )
      .orderBy(asc(treeTasks.deadline), asc(treeTasks.id))
      .limit(3);
    const tasks = rows.filter(
      (task): task is typeof task & { deadline: Date } =>
        task.deadline !== null,
    );

    return { today, lastDay, timeZone, tasks };
  });
}
