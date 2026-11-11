"use server";

import { withAccount } from "@/lib/action";

// 成长档案:只读聚合,不建新表。
// 档案由事件、复盘、规则和验证实时生成。
import { db } from "@/db";
import {
  choiceValidations,
  confirmationRules,
  eventCases,
  eventReviews,
  spendConversions,
  triggerSessions,
} from "@/db/schema";
import { getUserId } from "@/lib/user";
import {
  formatCny,
  getConversionCnyAmounts,
  RESOLUTION_LABEL,
} from "@/lib/convert-domain";
import { parseIdSnapshot } from "@/lib/domain/experience-trigger";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";

export type ArchiveStats = {
  repeatEvents: number;
  effectiveRules: number;
  spendBelowPlanCount: number;
  days: number;
};

export type ArchiveEntryKind = "verify" | "rule" | "review" | "archive";

export type ArchiveEntry = {
  kind: ArchiveEntryKind;
  date: string; // ISO
  title: string;
  subtitle: string;
  sourceLabel: string; // 右侧来源卡文本
  sourceBadge: "high_impact" | null;
  href: string;
};

const conversionAmountColumns = {
  resolution: spendConversions.resolution,
  decisionStage: spendConversions.decisionStage,
  inputCurrency: spendConversions.inputCurrency,
  inputToCnyRate: spendConversions.inputToCnyRate,
  plannedAmountMinor: spendConversions.plannedAmountMinor,
  actualAmountMinor: spendConversions.actualAmountMinor,
  outcomeAmountsInCny: spendConversions.outcomeAmountsInCny,
};

/** 最近 N 天统计:重复事件、规则记录、低于计划的支出 */
export async function getArchiveStats(days = 30): Promise<ArchiveStats> {
  return withAccount(async () => {
    const userId = await getUserId();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [eventAgg] = await db
      .select({
        repeatEvents: sql<number>`count(*) filter (where ${eventCases.isRepeat})::int`,
      })
      .from(eventCases)
      .where(
        and(eq(eventCases.userId, userId), gte(eventCases.createdAt, since)),
      );

    const activeRules = await db
      .select({ id: confirmationRules.id })
      .from(confirmationRules)
      .where(
        and(
          eq(confirmationRules.userId, userId),
          eq(confirmationRules.status, "active"),
        ),
      );
    const helpfulFeedback = await db
      .select({ ruleIds: triggerSessions.matchedRuleIds })
      .from(choiceValidations)
      .innerJoin(
        triggerSessions,
        and(
          eq(choiceValidations.triggerSessionId, triggerSessions.id),
          eq(choiceValidations.userId, triggerSessions.userId),
        ),
      )
      .where(
        and(
          eq(choiceValidations.userId, userId),
          eq(choiceValidations.ruleHelpfulness, "helpful"),
          gte(choiceValidations.validatedAt, since),
        ),
      );
    const helpfulRuleIds = new Set(
      helpfulFeedback.flatMap((row) => parseIdSnapshot(row.ruleIds)),
    );

    const outcomes = await db
      .select(conversionAmountColumns)
      .from(spendConversions)
      .where(
        and(
          eq(spendConversions.userId, userId),
          eq(spendConversions.decisionStage, "considering"),
          inArray(spendConversions.resolution, ["avoided", "partial"]),
          gte(spendConversions.resolvedAt, since),
        ),
      );

    return {
      repeatEvents: eventAgg?.repeatEvents ?? 0,
      effectiveRules: activeRules.filter((rule) => helpfulRuleIds.has(rule.id))
        .length,
      spendBelowPlanCount: outcomes.filter(
        (row) => (getConversionCnyAmounts(row).protectedCnyMinor ?? 0) > 0,
      ).length,
      days,
    };
  });
}

/** 证据战报时间线，统一按时间倒序。 */
export async function getArchiveTimeline(
  filter: ArchiveEntryKind | "all" = "all",
): Promise<ArchiveEntry[]> {
  return withAccount(async () => {
    const userId = await getUserId();
    const entries: ArchiveEntry[] = [];

    // 旧链接使用 filter=verify。这里展示明确的消费结果。
    if (filter === "all" || filter === "verify") {
      const rows = await db
        .select({
          id: spendConversions.id,
          resolvedAt: spendConversions.resolvedAt,
          privacyLabel: spendConversions.privacyLabel,
          ...conversionAmountColumns,
        })
        .from(spendConversions)
        .where(
          and(
            eq(spendConversions.userId, userId),
            inArray(spendConversions.resolution, [
              "avoided",
              "partial",
              "spent",
            ]),
            sql`${spendConversions.resolvedAt} is not null`,
          ),
        )
        .orderBy(desc(spendConversions.resolvedAt))
        .limit(30);
      for (const r of rows) {
        if (
          !r.resolvedAt ||
          (r.resolution !== "avoided" &&
            r.resolution !== "partial" &&
            r.resolution !== "spent")
        )
          continue;
        const { protectedCnyMinor } = getConversionCnyAmounts(r);
        entries.push({
          kind: "verify",
          date: r.resolvedAt.toISOString(),
          title:
            protectedCnyMinor !== null && protectedCnyMinor > 0
              ? `守住 ${formatCny(protectedCnyMinor)}`
              : `${r.privacyLabel}换算已了结`,
          subtitle: `消费决定 · ${RESOLUTION_LABEL[r.resolution]}`,
          sourceLabel: `${r.privacyLabel}换算记录`,
          sourceBadge: null,
          href: `/convert/${r.id}`,
        });
      }
    }

    // 2. 规则形成
    if (filter === "all" || filter === "rule") {
      const rows = await db
        .select()
        .from(confirmationRules)
        .where(
          and(
            eq(confirmationRules.userId, userId),
            sql`${confirmationRules.status} != 'archived'`,
          ),
        )
        .orderBy(desc(confirmationRules.createdAt))
        .limit(30);
      for (const r of rows) {
        entries.push({
          kind: "rule",
          date: r.createdAt.toISOString(),
          title: `形成规则:${r.ruleText.slice(0, 40)}`,
          subtitle: r.severity === "high" ? "来源于高影响事件" : "规则入库",
          sourceLabel: r.scenario
            ? `场景:${r.scenario.slice(0, 30)}`
            : r.triggerCondition
              ? r.triggerCondition.slice(0, 40)
              : "手动创建",
          sourceBadge: r.severity === "high" ? "high_impact" : null,
          href: `/rules/${r.id}`,
        });
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
        .limit(30);
      for (const r of rows) {
        entries.push({
          kind: "review",
          date: r.createdAt.toISOString(),
          title: `完成复盘:${r.eventTitle.slice(0, 30)}`,
          subtitle: "复盘 · 原因分析",
          sourceLabel: `复盘记录:${r.whatHappened.slice(0, 30)}`,
          sourceBadge: null,
          href: `/event-library/${r.eventId}`,
        });
      }
    }

    // 4. 事件存档(已关闭且未走复盘的事件)
    if (filter === "all" || filter === "archive") {
      const rows = await db
        .select()
        .from(eventCases)
        .where(
          and(
            eq(eventCases.userId, userId),
            sql`${eventCases.status} in ('closed','solved','found')`,
          ),
        )
        .orderBy(desc(eventCases.updatedAt))
        .limit(30);
      for (const r of rows) {
        entries.push({
          kind: "archive",
          date: r.updatedAt.toISOString(),
          title: r.title.slice(0, 40),
          subtitle: "已存档",
          sourceLabel: r.summary
            ? r.summary.slice(0, 40)
            : `事件记录 · ${r.scene}`,
          sourceBadge: r.impactLevel === "high" ? "high_impact" : null,
          href: `/event-library/${r.id}`,
        });
      }
    }

    return entries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40);
  });
}
