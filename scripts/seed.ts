import { mkdir, writeFile } from "node:fs/promises";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, pool, withAccountDatabase } from "@/db";
import * as s from "@/db/schema";
import { buildSnapshot } from "@/lib/convert-domain";

async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !["/ruleloop_dev", "/ruleloop_test"].includes(url.pathname)
  ) {
    throw new Error(
      "Demo seeding is restricted to local ruleloop_dev or ruleloop_test",
    );
  }
  const email = "demo@ruleloop.test";
  const password = "RuleLoop-local-demo-2026!";
  try {
    let userId = (
      await pool.query('SELECT id FROM "user" WHERE email=$1', [email])
    ).rows[0]?.id;
    if (!userId)
      userId = (
        await auth.api.signUpEmail({
          body: { name: "本地演示账户", email, password },
        })
      ).user.id;
    const fixtures = await withAccountDatabase(userId, async () => {
      const key = "demo-fixtures-v1";
      const [existing] = await db
        .select()
        .from(s.userPreferences)
        .where(
          and(
            eq(s.userPreferences.userId, userId),
            eq(s.userPreferences.prefKey, key),
          ),
        );
      if (existing) return JSON.parse(existing.prefValue);
      const [event] = await db
        .insert(s.eventCases)
        .values({
          userId,
          title: "课程提交前核对版本",
          eventType: "study",
          scene: "classroom",
          status: "solved",
          impactLevel: "high",
        })
        .returning();
      const [confirmation] = await db
        .insert(s.criticalConfirmations)
        .values({
          userId,
          title: "提交课程报告",
          domain: "study",
          riskLevel: "high",
          evidenceRequired: true,
        })
        .returning();
      await db.insert(s.confirmationItems).values({
        userId,
        confirmationId: confirmation.id,
        itemText: "核对课程、最终文件与提交入口",
      });
      const [rule] = await db
        .insert(s.confirmationRules)
        .values({
          userId,
          domain: "study",
          sourceType: "manual",
          ruleText: "提交前核对最终版本",
          status: "active",
          isActive: true,
        })
        .returning();
      const [relationship] = await db
        .insert(s.relationships)
        .values({
          userId,
          personName: "演示同学",
          relationshipType: "classmate",
        })
        .returning();
      const [boundary] = await db
        .insert(s.executionBoundaries)
        .values({
          userId,
          sourceType: "custom",
          title: "完成一题并复盘",
          minimumDoneStandard: "通过题目并写一句理解",
          stopCondition: "30 分钟到时",
          opportunityCost: "休息时间",
        })
        .returning();
      const [resource] = await db
        .insert(s.resources)
        .values({
          userId,
          name: "课程学习材料",
          resourceType: "content",
          domain: "academic",
          status: "active",
        })
        .returning();
      const [person] = await db
        .insert(s.peopleResources)
        .values({
          userId,
          personName: "课程导师",
          relationshipStage: "initial_contact",
        })
        .returning();
      const [plan] = await db
        .insert(s.communicationPlans)
        .values({
          userId,
          personId: person.id,
          communicationGoal: "核实课程要求",
          communicationType: "request_help",
          status: "draft",
        })
        .returning();
      const [spending] = await db
        .insert(s.spendingReviews)
        .values({
          userId,
          title: "软件订阅决策",
          category: "software",
          amount: 100,
          fundingSource: "budget",
          riskLevel: "low",
          decisionStatus: "draft",
        })
        .returning();
      const [conversion] = await db
        .insert(s.spendConversions)
        .values({
          userId,
          decisionStage: "considering",
          plannedAmountMinor: 10000,
          snapshotJson: JSON.stringify(
            buildSnapshot({
              inputCurrency: "CNY",
              amountMinor: 10000,
              usdToCnyRate: "7.000000",
              items: [],
            }),
          ),
        })
        .returning();
      const [entertainment] = await db
        .insert(s.entertainmentSessions)
        .values({
          userId,
          title: "阅读休息",
          entertainmentType: "reading",
          plannedMinutes: 20,
          status: "active",
          preState: "平静",
          purpose: "休息",
          mainline: "课程学习",
          nextAction: "回到学习",
          latestEndAt: new Date(Date.now() + 1200000),
        })
        .returning();
      const result = {
        userId,
        email,
        event: event.id,
        confirmation: confirmation.id,
        rule: rule.id,
        relationship: relationship.id,
        boundary: boundary.id,
        resource: resource.id,
        person: person.id,
        plan: plan.id,
        spending: spending.id,
        conversion: conversion.id,
        entertainment: entertainment.id,
      };
      await db
        .insert(s.userPreferences)
        .values({ userId, prefKey: key, prefValue: JSON.stringify(result) });
      return result;
    });
    await mkdir(".local", { recursive: true });
    await writeFile(
      `.local/fixtures-${url.pathname.endsWith("_test") ? "test" : "dev"}.json`,
      JSON.stringify(fixtures, null, 2),
    );
    console.log(
      `Demo fixtures ready in ${url.pathname.slice(1)}; see README for the local-only demo login.`,
    );
  } finally {
    await pool.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
