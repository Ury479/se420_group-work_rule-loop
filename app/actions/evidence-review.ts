"use server"

import { db } from "@/lib/db"
import {
  criticalConfirmations,
  confirmationEvidence,
  mistakeReviews,
  confirmationRules,
} from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { evidenceSchema, reviewSchema, type EvidenceInput, type ReviewInput } from "@/lib/validation"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

/**
 * 保存最小证据,并将任务标记为 confirmed。
 */
export async function saveEvidence(input: EvidenceInput) {
  const userId = await getUserId()
  const parsed = evidenceSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data

  await db.insert(confirmationEvidence).values({
    userId,
    confirmationId: data.confirmationId,
    evidenceType: data.evidenceType,
    evidenceText: data.evidenceText ?? null,
    screenshotUrl: data.screenshotUrl ?? null,
    note: data.note ?? null,
  })

  await db
    .update(criticalConfirmations)
    .set({ status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(criticalConfirmations.id, data.confirmationId),
        eq(criticalConfirmations.userId, userId)
      )
    )

  revalidatePath("/")
  return { success: true }
}

/**
 * 先完成、以后再补:不填证据直接把任务标记为 confirmed。
 * 完成率优先于信息完整度。
 */
export async function completeWithoutEvidence(confirmationId: number) {
  const userId = await getUserId()
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
  return { success: true }
}

/**
 * 事后补充证据:只追加证据记录,不改变任务状态。
 */
export async function appendEvidence(input: EvidenceInput) {
  const userId = await getUserId()
  const parsed = evidenceSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data
  await db.insert(confirmationEvidence).values({
    userId,
    confirmationId: data.confirmationId,
    evidenceType: data.evidenceType,
    evidenceText: data.evidenceText ?? null,
    screenshotUrl: data.screenshotUrl ?? null,
    note: data.note ?? null,
  })
  revalidatePath("/")
  return { success: true }
}

export async function getEvidence(confirmationId: number) {
  const userId = await getUserId()
  return db
    .select()
    .from(confirmationEvidence)
    .where(
      and(
        eq(confirmationEvidence.confirmationId, confirmationId),
        eq(confirmationEvidence.userId, userId)
      )
    )
    .orderBy(desc(confirmationEvidence.createdAt))
}

/**
 * 提交错误复盘:
 * 1. 保存复盘 2. 生成规则草稿(is_active=false) 3. 状态 reviewed
 * 返回规则 id 用于跳转规则确认页。
 */
export async function submitReview(input: ReviewInput) {
  const userId = await getUserId()
  const parsed = reviewSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data

  const insertedReview = await db
    .insert(mistakeReviews)
    .values({
      userId,
      confirmationId: data.confirmationId ?? null,
      mistakeType: data.mistakeType,
      loss: data.loss ?? null,
      skippedStep: data.skippedStep ?? null,
      stateWhenError: data.stateWhenError,
      principleText: data.principleText ?? null,
      newRule: data.newRule ?? null,
      costLevel: data.costLevel,
      writeToReviewSystem: data.writeToReviewSystem,
    })
    .returning({ id: mistakeReviews.id })

  const reviewId = insertedReview[0].id
  let ruleId: number | null = null

  // 生成拦截规则草稿
  if (data.generateRule && data.newRule) {
    let domain = "custom"
    let scenario: string | null = null
    if (data.confirmationId) {
      const rows = await db
        .select()
        .from(criticalConfirmations)
        .where(
          and(
            eq(criticalConfirmations.id, data.confirmationId),
            eq(criticalConfirmations.userId, userId)
          )
        )
      if (rows[0]) {
        domain = rows[0].domain
        scenario = rows[0].scenario
      }
    }
    const insertedRule = await db
      .insert(confirmationRules)
      .values({
        userId,
        domain,
        scenario,
        ruleText: data.newRule,
        principleText: data.principleText ?? null,
        triggerCondition: scenario ? `场景包含:${scenario}` : null,
        sourceReviewId: reviewId,
        isActive: false,
      })
      .returning({ id: confirmationRules.id })
    ruleId = insertedRule[0].id
  }

  // 状态变为 reviewed
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
  return { reviewId, ruleId }
}

export async function getReviews() {
  const userId = await getUserId()
  return db
    .select()
    .from(mistakeReviews)
    .where(eq(mistakeReviews.userId, userId))
    .orderBy(desc(mistakeReviews.createdAt))
}

export async function getReviewByConfirmation(confirmationId: number) {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(mistakeReviews)
    .where(
      and(
        eq(mistakeReviews.confirmationId, confirmationId),
        eq(mistakeReviews.userId, userId)
      )
    )
    .orderBy(desc(mistakeReviews.createdAt))
  return rows[0] ?? null
}
