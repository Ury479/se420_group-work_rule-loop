"use server"

import { db } from "@/lib/db"
import {
  criticalConfirmations,
  confirmationItems,
  confirmationRules,
} from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { createConfirmationSchema, type CreateConfirmationInput } from "@/lib/validation"
import { suggestRiskLevel } from "@/lib/risk"
import { buildDefaultItems } from "@/lib/templates"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function getConfirmations() {
  const userId = await getUserId()
  return db
    .select()
    .from(criticalConfirmations)
    .where(eq(criticalConfirmations.userId, userId))
    .orderBy(desc(criticalConfirmations.createdAt))
}

export async function getConfirmation(id: number) {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(criticalConfirmations)
    .where(
      and(
        eq(criticalConfirmations.id, id),
        eq(criticalConfirmations.userId, userId)
      )
    )
  return rows[0] ?? null
}

export async function getConfirmationItems(confirmationId: number) {
  const userId = await getUserId()
  return db
    .select()
    .from(confirmationItems)
    .where(
      and(
        eq(confirmationItems.confirmationId, confirmationId),
        eq(confirmationItems.userId, userId)
      )
    )
    .orderBy(confirmationItems.confirmationRound, confirmationItems.orderIndex)
}

/**
 * 创建关键确认(提前布防):
 * 1. 高风险判断 2. 创建记录 3. 生成默认确认项(含启用的拦截规则) 4. 状态 armed
 */
export async function createConfirmation(input: CreateConfirmationInput) {
  const userId = await getUserId()
  const parsed = createConfirmationSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data
  const riskLevel = suggestRiskLevel(data)
  const isHighRisk = riskLevel === "high"

  const inserted = await db
    .insert(criticalConfirmations)
    .values({
      userId,
      title: data.title,
      domain: data.domain,
      scenario: data.scenario ?? null,
      eventTime: data.eventTime ? new Date(data.eventTime) : null,
      deadline: data.deadline ? new Date(data.deadline) : null,
      locationOrPlatform: data.locationOrPlatform ?? null,
      targetPerson: data.targetPerson ?? null,
      riskLevel,
      costIfFailed: data.costIfFailed ?? null,
      likelyMistake: data.likelyMistake ?? null,
      finalCheckFocus: data.finalCheckFocus ?? null,
      evidenceRequired: data.evidenceRequired || isHighRisk,
      mistakeHistory: data.mistakeHistory,
      status: "armed",
      notes: data.notes ?? null,
    })
    .returning({ id: criticalConfirmations.id })

  const confirmationId = inserted[0].id

  // 默认确认清单
  const items = buildDefaultItems(data.domain, isHighRisk)

  // 附加同领域已启用的拦截规则作为默认确认项
  const activeRules = await db
    .select()
    .from(confirmationRules)
    .where(
      and(
        eq(confirmationRules.userId, userId),
        eq(confirmationRules.domain, data.domain),
        eq(confirmationRules.isActive, true)
      )
    )

  const values = [
    ...items.map((item, i) => ({
      userId,
      confirmationId,
      itemText: item.text,
      isRequired: item.required,
      confirmationRound: item.round,
      orderIndex: i,
    })),
    ...activeRules.map((rule, i) => ({
      userId,
      confirmationId,
      itemText: `[规则] ${rule.ruleText}`,
      isRequired: true,
      confirmationRound: 1,
      orderIndex: items.length + i,
    })),
  ]

  if (values.length > 0) {
    await db.insert(confirmationItems).values(values)
  }

  revalidatePath("/")
  return { id: confirmationId, riskLevel }
}

export async function toggleItem(itemId: number, isChecked: boolean) {
  const userId = await getUserId()
  await db
    .update(confirmationItems)
    .set({ isChecked, updatedAt: new Date() })
    .where(
      and(eq(confirmationItems.id, itemId), eq(confirmationItems.userId, userId))
    )
}

/**
 * 确认完成逻辑:
 * 1. 校验所有必填项已勾选 2. 高风险且无证据 → 跳证据页 3. 否则标记 confirmed
 */
export async function completeCheck(confirmationId: number) {
  const userId = await getUserId()
  const confirmation = await getConfirmation(confirmationId)
  if (!confirmation) return { error: "任务不存在" }

  const items = await getConfirmationItems(confirmationId)
  const unchecked = items.filter((i) => i.isRequired && !i.isChecked)
  if (unchecked.length > 0) {
    return { error: "必填确认项未完成" }
  }

  if (confirmation.riskLevel === "high") {
    await db
      .update(criticalConfirmations)
      .set({ status: "checking", updatedAt: new Date() })
      .where(
        and(
          eq(criticalConfirmations.id, confirmationId),
          eq(criticalConfirmations.userId, userId)
        )
      )
    revalidatePath("/")
    return { next: "evidence" as const }
  }

  await db
    .update(criticalConfirmations)
    .set({ status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(criticalConfirmations.id, confirmationId),
        eq(criticalConfirmations.userId, userId)
      )
    )
  revalidatePath("/")
  return { next: "confirmed" as const }
}

export async function markStatus(
  confirmationId: number,
  status: "pending" | "armed" | "checking" | "confirmed" | "failed" | "reviewed"
) {
  const userId = await getUserId()
  await db
    .update(criticalConfirmations)
    .set({ status, updatedAt: new Date() })
    .where(
      and(
        eq(criticalConfirmations.id, confirmationId),
        eq(criticalConfirmations.userId, userId)
      )
    )
  revalidatePath("/")
}

export async function deleteConfirmation(confirmationId: number) {
  const userId = await getUserId()
  await db
    .delete(confirmationItems)
    .where(
      and(
        eq(confirmationItems.confirmationId, confirmationId),
        eq(confirmationItems.userId, userId)
      )
    )
  await db
    .delete(criticalConfirmations)
    .where(
      and(
        eq(criticalConfirmations.id, confirmationId),
        eq(criticalConfirmations.userId, userId)
      )
    )
  revalidatePath("/")
}
