"use server"

import { and, desc, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db"
import {
  ashMemos,
  confirmationRules,
  entertainmentAssessments,
  entertainmentReflections,
  entertainmentSessions,
} from "@/lib/db/schema"
import { evaluateEntertainment, canTransitionSession, type SessionStatus } from "@/lib/entertainment-rules"
import { buildEntertainmentMarkdown, buildGptPrompt, buildTickTick, calculateRisk, conversionResult } from "@/lib/entertainment-exports"
import { getUserId } from "@/lib/user"

const startSchema = z.object({
  title: z.string().trim().min(1, "请填写娱乐内容").max(120),
  entertainmentType: z.enum(["gaming", "video", "social", "dining", "reading", "other"]),
  plannedMinutes: z.coerce.number().int().min(5).max(1440),
  plannedBudgetCny: z.coerce.number().int().min(0).max(1_000_000),
  boundaryNote: z.string().trim().max(500).optional(),
  preState: z.string().trim().min(1).max(100),
  purpose: z.string().trim().min(1).max(300),
  mainline: z.string().trim().min(1).max(300),
  plannedQuantity: z.coerce.number().int().min(1).max(100).optional(),
  quantityUnit: z.string().trim().max(30).optional(),
  latestEndAt: z.coerce.date(),
  nextAction: z.string().trim().min(1).max(300),
})

const assessmentSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
  actualMinutes: z.coerce.number().int().min(0).max(2880),
  actualCostCny: z.coerce.number().int().min(0).max(1_000_000),
  recoveredEnergy: z.coerce.number().int().min(0).max(10),
  emotionAfter: z.coerce.number().int().min(0).max(10),
  didStopOnTime: z.boolean(),
  didStayInBudget: z.boolean(),
  delayedMainline: z.boolean(),
  regretLevel: z.coerce.number().int().min(0).max(10),
  actualGain: z.string().trim().max(1000).optional(),
  nextRecoveryAction: z.string().trim().max(500).optional(),
  actualQuantity: z.coerce.number().int().min(0).max(1000).optional(),
  autoplayOccurred: z.boolean(),
  learningScore: z.coerce.number().int().min(0).max(10),
  learningSummary: z.string().trim().max(1000).optional(),
  learningApplication: z.string().trim().max(1000).optional(),
  stateChange: z.string().trim().max(500).optional(),
  stopDifficulty: z.coerce.number().int().min(0).max(10),
  contentSatisfaction: z.coerce.number().int().min(0).max(10),
  timeSatisfaction: z.coerce.number().int().min(0).max(10),
  stopSatisfaction: z.coerce.number().int().min(0).max(10),
  stateSatisfaction: z.coerce.number().int().min(0).max(10),
  decisionSatisfaction: z.coerce.number().int().min(0).max(10),
  mainlineHelpScore: z.coerce.number().int().min(-5).max(5),
  nextActionStarted: z.boolean(),
  nextActionStartedAt: z.coerce.date().optional(),
  nextActionType: z.string().trim().max(100).optional(),
  nextActionEvidence: z.string().trim().max(500).optional(),
  stopDifficultyReason: z.string().trim().max(500).optional(),
  rationalization: z.string().trim().max(500).optional(),
  sleepImpact: z.string().trim().max(300).optional(),
  nextDayImpact: z.string().trim().max(500).optional(),
  satisfiedPart: z.string().trim().max(500).optional(),
  unsatisfiedPart: z.string().trim().max(500).optional(),
  mainlineResult: z.string().trim().max(500).optional(),
})

const reflectionSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
  factSummary: z.string().trim().min(1).max(1500),
  trigger: z.string().trim().max(1000).optional(),
  lesson: z.string().trim().min(1).max(1000),
  principle: z.string().trim().max(1000).optional(),
  candidateRule: z.string().trim().max(1000).optional(),
  saveToAsh: z.boolean(),
  saveToRuleLibrary: z.boolean(),
  gptReviewResult: z.string().trim().min(1).max(12000),
  gptResultStatus: z.enum(["agreed", "partially_agreed", "disagreed"]),
  gptConversationUrl: z.union([z.literal(""), z.string().url()]).optional(),
  gptSummary: z.string().trim().max(1500).optional(),
  gptClassification: z.string().trim().max(100).optional(),
  lossOfControlPoint: z.string().trim().max(1000).optional(),
  identifiedRealNeed: z.string().trim().max(1000).optional(),
  userConfirmedInsight: z.string().trim().max(1000).optional(),
  nextMinimalAdjustment: z.string().trim().max(1000).optional(),
})

function err(error: unknown) {
  return { error: error instanceof Error ? error.message : "操作失败，请重试" }
}

async function ownedSession(id: number, userId: string) {
  const [row] = await db
    .select()
    .from(entertainmentSessions)
    .where(and(eq(entertainmentSessions.id, id), eq(entertainmentSessions.userId, userId)))
    .limit(1)
  return row ?? null
}

export async function startEntertainmentSession(input: z.input<typeof startSchema>) {
  try {
    const data = startSchema.parse(input)
    const userId = await getUserId()
    const [active] = await db
      .select({ id: entertainmentSessions.id })
      .from(entertainmentSessions)
      .where(and(eq(entertainmentSessions.userId, userId), eq(entertainmentSessions.status, "active")))
      .limit(1)
    if (active) return { error: "已有进行中的娱乐会话，请先结束或放弃它。" }

    const [previous] = await db.select({ stopDifficulty: entertainmentAssessments.stopDifficulty }).from(entertainmentAssessments).where(eq(entertainmentAssessments.userId, userId)).orderBy(desc(entertainmentAssessments.createdAt)).limit(1)
    const risk = calculateRisk({ entertainmentType: data.entertainmentType, latestEndAt: data.latestEndAt, plannedMinutes: data.plannedMinutes, previousStopDifficulty: previous?.stopDifficulty })
    const ticktick = buildTickTick({ ...data, ...risk })
    const [created] = await db
      .insert(entertainmentSessions)
      .values({ userId, ...data, boundaryNote: data.boundaryNote || null, plannedQuantity: data.plannedQuantity || null, quantityUnit: data.quantityUnit || null, ...risk, ticktickTitle: ticktick.title, ticktickBody: ticktick.body, ticktickChecklist: ticktick.checklist })
      .returning({ id: entertainmentSessions.id })
    revalidatePath("/entertainment")
    return { id: created.id }
  } catch (error) {
    return err(error)
  }
}

export async function markTickTickCopied(sessionId: number) {
  try {
    const userId = await getUserId()
    const session = await ownedSession(sessionId, userId)
    if (!session) return { error: "会话不存在" }
    await db.update(entertainmentSessions).set({ ticktickCopiedAt: new Date(), updatedAt: new Date() }).where(and(eq(entertainmentSessions.id, sessionId), eq(entertainmentSessions.userId, userId)))
    revalidatePath(`/entertainment/${sessionId}`)
    return { ok: true }
  } catch (error) { return err(error) }
}

export async function endEntertainmentSession(sessionId: number) {
  try {
    const userId = await getUserId()
    const session = await ownedSession(sessionId, userId)
    if (!session) return { error: "会话不存在" }
    if (!canTransitionSession(session.status as SessionStatus, "ended")) return { error: "当前状态不能结束" }
    await db
      .update(entertainmentSessions)
      .set({ status: "ended", endedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(entertainmentSessions.id, sessionId), eq(entertainmentSessions.userId, userId)))
    revalidatePath("/entertainment")
    return { ok: true }
  } catch (error) {
    return err(error)
  }
}

export async function abandonEntertainmentSession(sessionId: number) {
  try {
    const userId = await getUserId()
    const session = await ownedSession(sessionId, userId)
    if (!session) return { error: "会话不存在" }
    if (!canTransitionSession(session.status as SessionStatus, "abandoned")) return { error: "当前状态不能放弃" }
    await db
      .update(entertainmentSessions)
      .set({ status: "abandoned", endedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(entertainmentSessions.id, sessionId), eq(entertainmentSessions.userId, userId)))
    revalidatePath("/entertainment")
    return { ok: true }
  } catch (error) {
    return err(error)
  }
}

export async function assessEntertainmentSession(input: z.input<typeof assessmentSchema>) {
  try {
    const data = assessmentSchema.parse(input)
    const userId = await getUserId()
    const session = await ownedSession(data.sessionId, userId)
    if (!session) return { error: "会话不存在" }
    if (session.status !== "ended") return { error: "只有已结束的会话可以评估" }

    const [existing] = await db
      .select({ id: entertainmentAssessments.id })
      .from(entertainmentAssessments)
      .where(and(eq(entertainmentAssessments.sessionId, data.sessionId), eq(entertainmentAssessments.userId, userId)))
      .limit(1)
    if (existing) return { error: "该会话已经评估，请勿重复提交" }

    const result = evaluateEntertainment({
      plannedMinutes: session.plannedMinutes,
      plannedBudgetCny: session.plannedBudgetCny,
      ...data,
    })

    const actualEndedAt = session.endedAt || new Date()
    const satisfactionAverage = Math.round((data.contentSatisfaction + data.timeSatisfaction + data.stopSatisfaction + data.stateSatisfaction + data.decisionSatisfaction) / 5)
    const converted = conversionResult({ nextActionStarted: data.nextActionStarted, nextActionStartedAt: data.nextActionStartedAt, actualEndedAt, sleepImpact: data.sleepImpact })
    await db.transaction(async (tx) => {
      await tx.insert(entertainmentAssessments).values({
        userId,
        ...data,
        actualStartedAt: session.startedAt,
        actualEndedAt,
        overtimeMinutes: Math.max(0, data.actualMinutes - session.plannedMinutes),
        satisfactionAverage,
        conversionResult: converted,
        actualGain: data.actualGain || null,
        nextRecoveryAction: data.nextRecoveryAction || result.nextStep,
        score: result.score,
        resultLevel: result.resultLevel,
      })
      await tx
        .update(entertainmentSessions)
        .set({ status: "assessed", updatedAt: new Date() })
        .where(and(eq(entertainmentSessions.id, data.sessionId), eq(entertainmentSessions.userId, userId)))
    })
    revalidatePath("/entertainment")
    revalidatePath(`/entertainment/${data.sessionId}`)
    return { ok: true, ...result }
  } catch (error) {
    return err(error)
  }
}

export async function saveEntertainmentReflection(input: z.input<typeof reflectionSchema>) {
  try {
    const data = reflectionSchema.parse(input)
    const userId = await getUserId()
    const session = await ownedSession(data.sessionId, userId)
    if (!session) return { error: "会话不存在" }
    if (session.status !== "assessed") return { error: "只有已评估的会话可以沉淀复盘" }

    const [assessment] = await db
      .select()
      .from(entertainmentAssessments)
      .where(and(eq(entertainmentAssessments.sessionId, data.sessionId), eq(entertainmentAssessments.userId, userId)))
      .limit(1)
    if (!assessment) return { error: "评估记录不存在" }
    if (data.gptResultStatus === "disagreed" && (data.saveToAsh || data.saveToRuleLibrary)) return { error: "不同意 GPT 分析时不能写入长期沉淀，请先保留为本次记录。" }

    const [existing] = await db
      .select({ id: entertainmentReflections.id })
      .from(entertainmentReflections)
      .where(and(eq(entertainmentReflections.sessionId, data.sessionId), eq(entertainmentReflections.userId, userId)))
      .limit(1)
    if (existing) return { error: "该会话已经复盘，请勿重复提交" }

    const gptReviewPrompt = buildGptPrompt(session, assessment)
    const markdownSnapshot = buildEntertainmentMarkdown(session, assessment, data)
    await db.transaction(async (tx) => {
      let ashMemoId: number | null = null
      let confirmationRuleId: number | null = null

      if (data.saveToAsh) {
        const [memo] = await tx
          .insert(ashMemos)
          .values({
            userId,
            title: `娱乐复盘：${session.title}`,
            whatHappened: data.factSummary,
            cost: `${assessment.actualMinutes} 分钟 / ${assessment.actualCostCny} 元 / 结果分 ${assessment.score}`,
            ignoredFact: data.trigger || null,
            lesson: data.lesson,
            principle: data.principle || null,
            interceptionRule: data.candidateRule || null,
            exposedWeakness: "scattered_focus",
            whySystemFailed: assessment.resultLevel === "harmful" ? "skipped_confirm" : "other",
            nextInterceptionPoint: "arm_80",
            weaknessTag: "entertainment_boundary",
          })
          .returning({ id: ashMemos.id })
        ashMemoId = memo.id
      }

      if (data.saveToRuleLibrary && data.candidateRule) {
        const [rule] = await tx
          .insert(confirmationRules)
          .values({
            userId,
            domain: "entertainment",
            scenario: session.entertainmentType,
            ruleText: data.candidateRule,
            principleText: data.principle || null,
            triggerCondition: data.trigger || null,
            isActive: false,
            sourceType: "manual",
            weaknessKey: "scattered_focus",
            rulePriority: 0,
          })
          .returning({ id: confirmationRules.id })
        confirmationRuleId = rule.id
      }

      await tx.insert(entertainmentReflections).values({
        userId,
        ...data,
        trigger: data.trigger || null,
        principle: data.principle || null,
        candidateRule: data.candidateRule || null,
        gptConversationUrl: data.gptConversationUrl || null,
        gptReviewPrompt,
        markdownSnapshot,
        markdownGeneratedAt: new Date(),
        ashMemoId,
        confirmationRuleId,
      })
      await tx
        .update(entertainmentSessions)
        .set({ status: "reviewed", updatedAt: new Date() })
        .where(and(eq(entertainmentSessions.id, data.sessionId), eq(entertainmentSessions.userId, userId)))
    })
    revalidatePath("/entertainment")
    revalidatePath("/ash-memos")
    revalidatePath("/rules")
    return { ok: true }
  } catch (error) {
    return err(error)
  }
}

export async function getEntertainmentDashboard() {
  const userId = await getUserId()
  const sessions = await db
    .select()
    .from(entertainmentSessions)
    .where(eq(entertainmentSessions.userId, userId))
    .orderBy(desc(entertainmentSessions.startedAt))
    .limit(100)

  const ids = sessions.map((item) => item.id)
  const assessments = ids.length
    ? await db
        .select()
        .from(entertainmentAssessments)
        .where(and(eq(entertainmentAssessments.userId, userId), inArray(entertainmentAssessments.sessionId, ids)))
    : []
  const bySession = new Map(assessments.map((item) => [item.sessionId, item]))
  return { sessions, assessments: bySession }
}

export async function getEntertainmentSessionDetail(id: number) {
  const userId = await getUserId()
  const session = await ownedSession(id, userId)
  if (!session) return null
  const [assessment] = await db
    .select()
    .from(entertainmentAssessments)
    .where(and(eq(entertainmentAssessments.sessionId, id), eq(entertainmentAssessments.userId, userId)))
    .limit(1)
  const [reflection] = await db
    .select()
    .from(entertainmentReflections)
    .where(and(eq(entertainmentReflections.sessionId, id), eq(entertainmentReflections.userId, userId)))
    .limit(1)
  return { session, assessment: assessment ?? null, reflection: reflection ?? null }
}
