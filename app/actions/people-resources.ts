"use server"

// 人脉资源与沟通计划 Server Actions
// 约定:所有查询必须以 userId 过滤;写操作 Zod 校验;人工判断,不接入 AI

import { db } from "@/lib/db"
import {
  peopleResources,
  personNeedHypotheses,
  communicationPlans,
  communicationResults,
} from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { and, eq, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ── 人脉资源 ──

const personSchema = z.object({
  personName: z.string().min(1, "姓名不能为空").max(80),
  relationshipType: z.string().max(40).nullable().optional(),
  domain: z.string().max(40).nullable().optional(),
  relationshipStage: z.string().max(40).default("initial_contact"),
  availableHelp: z.string().max(2000).nullable().optional(),
  valueICanOffer: z.string().max(2000).nullable().optional(),
  suitableTopics: z.string().max(2000).nullable().optional(),
  unsuitableTopics: z.string().max(2000).nullable().optional(),
  suggestedFrequency: z.string().max(200).nullable().optional(),
  boundaryNotes: z.string().max(2000).nullable().optional(),
})

export async function createPerson(input: z.infer<typeof personSchema>) {
  const userId = await getUserId()
  const parsed = personSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入不合法" }
  }
  const d = parsed.data
  const [row] = await db
    .insert(peopleResources)
    .values({
      userId,
      personName: d.personName,
      relationshipType: d.relationshipType ?? null,
      domain: d.domain ?? null,
      relationshipStage: d.relationshipStage,
      availableHelp: d.availableHelp ?? null,
      valueICanOffer: d.valueICanOffer ?? null,
      suitableTopics: d.suitableTopics ?? null,
      unsuitableTopics: d.unsuitableTopics ?? null,
      suggestedFrequency: d.suggestedFrequency ?? null,
      boundaryNotes: d.boundaryNotes ?? null,
    })
    .returning()
  revalidatePath("/resources/people")
  return { person: row }
}

export async function getPeople() {
  const userId = await getUserId()
  return db
    .select()
    .from(peopleResources)
    .where(eq(peopleResources.userId, userId))
    .orderBy(desc(peopleResources.updatedAt))
    .limit(200)
}

export async function getPersonDetail(id: number) {
  const userId = await getUserId()
  const [person] = await db
    .select()
    .from(peopleResources)
    .where(and(eq(peopleResources.id, id), eq(peopleResources.userId, userId)))
  if (!person) return null
  const [hypotheses, plans] = await Promise.all([
    db
      .select()
      .from(personNeedHypotheses)
      .where(and(eq(personNeedHypotheses.personId, id), eq(personNeedHypotheses.userId, userId)))
      .orderBy(desc(personNeedHypotheses.updatedAt))
      .limit(50),
    db
      .select()
      .from(communicationPlans)
      .where(and(eq(communicationPlans.personId, id), eq(communicationPlans.userId, userId)))
      .orderBy(desc(communicationPlans.createdAt))
      .limit(50),
  ])
  return { person, hypotheses, plans }
}

const personUpdateSchema = personSchema.partial().extend({
  id: z.number().int().positive(),
  interactionStatus: z.string().max(40).optional(),
})

export async function updatePerson(input: z.infer<typeof personUpdateSchema>) {
  const userId = await getUserId()
  const parsed = personUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入不合法" }
  }
  const { id, ...rest } = parsed.data
  // 字段白名单更新
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  for (const key of [
    "personName",
    "relationshipType",
    "domain",
    "relationshipStage",
    "availableHelp",
    "valueICanOffer",
    "suitableTopics",
    "unsuitableTopics",
    "suggestedFrequency",
    "boundaryNotes",
    "interactionStatus",
  ] as const) {
    if (rest[key] !== undefined) updates[key] = rest[key]
  }
  await db
    .update(peopleResources)
    .set(updates)
    .where(and(eq(peopleResources.id, id), eq(peopleResources.userId, userId)))
  revalidatePath("/resources/people")
  revalidatePath(`/resources/people/${id}`)
  return { ok: true }
}

export async function deletePerson(id: number) {
  const userId = await getUserId()
  await db
    .delete(personNeedHypotheses)
    .where(and(eq(personNeedHypotheses.personId, id), eq(personNeedHypotheses.userId, userId)))
  await db
    .delete(peopleResources)
    .where(and(eq(peopleResources.id, id), eq(peopleResources.userId, userId)))
  revalidatePath("/resources/people")
  return { ok: true }
}

// ── 核心诉求假设(必须为假设,不能写成事实) ──

const hypothesisSchema = z.object({
  personId: z.number().int().positive(),
  needType: z.string().max(40).nullable().optional(),
  hypothesis: z.string().min(1, "假设内容不能为空").max(2000),
  evidence: z.string().max(2000).nullable().optional(),
  confidence: z.enum(["low", "medium", "high"]).default("low"),
  validationQuestion: z.string().max(1000).nullable().optional(),
})

export async function createHypothesis(input: z.infer<typeof hypothesisSchema>) {
  const userId = await getUserId()
  const parsed = hypothesisSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入不合法" }
  }
  const d = parsed.data
  const [row] = await db
    .insert(personNeedHypotheses)
    .values({
      userId,
      personId: d.personId,
      needType: d.needType ?? null,
      hypothesis: d.hypothesis,
      evidence: d.evidence ?? null,
      confidence: d.confidence,
      validationQuestion: d.validationQuestion ?? null,
    })
    .returning()
  revalidatePath(`/resources/people/${d.personId}`)
  return { hypothesis: row }
}

export async function updateHypothesisStatus(
  id: number,
  status: "active" | "revised" | "removed",
  confidence?: "low" | "medium" | "high"
) {
  const userId = await getUserId()
  const updates: Record<string, unknown> = { status, updatedAt: new Date(), lastValidatedAt: new Date() }
  if (confidence) updates.confidence = confidence
  const [row] = await db
    .update(personNeedHypotheses)
    .set(updates)
    .where(and(eq(personNeedHypotheses.id, id), eq(personNeedHypotheses.userId, userId)))
    .returning()
  if (row) revalidatePath(`/resources/people/${row.personId}`)
  return { ok: true }
}

// ── 沟通计划 ──

const planSchema = z.object({
  personId: z.number().int().positive(),
  communicationGoal: z.string().min(1, "沟通目标不能为空").max(1000),
  maxProgressGoal: z.string().max(1000).nullable().optional(),
  communicationType: z.string().max(40).nullable().optional(),
  communicationChannel: z.string().max(40).nullable().optional(),
  coreMessage: z.string().max(2000).nullable().optional(),
  firstMessage: z.string().max(2000).nullable().optional(),
  laterMessage: z.string().max(2000).nullable().optional(),
  topicsToAvoid: z.string().max(2000).nullable().optional(),
  expectedNextAction: z.string().max(1000).nullable().optional(),
  backupPlan: z.string().max(2000).nullable().optional(),
  triedAlready: z.string().max(2000).nullable().optional(),
  whyMustAsk: z.string().max(2000).nullable().optional(),
  resourcesToInvest: z.string().max(2000).nullable().optional(),
  estimatedMinutes: z.number().int().min(0).max(100000).nullable().optional(),
  investmentLimit: z.string().max(1000).nullable().optional(),
  valueToOffer: z.string().max(2000).nullable().optional(),
  unavailableResources: z.string().max(2000).nullable().optional(),
  investmentNature: z.string().max(40).nullable().optional(),
  mainlineImpact: z.string().max(2000).nullable().optional(),
  followUpLimit: z.number().int().min(0).max(10).default(1),
})

export async function createCommunicationPlan(input: z.infer<typeof planSchema>) {
  const userId = await getUserId()
  const parsed = planSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入不合法" }
  }
  const d = parsed.data
  const [row] = await db
    .insert(communicationPlans)
    .values({
      userId,
      personId: d.personId,
      communicationGoal: d.communicationGoal,
      maxProgressGoal: d.maxProgressGoal ?? null,
      communicationType: d.communicationType ?? null,
      communicationChannel: d.communicationChannel ?? null,
      coreMessage: d.coreMessage ?? null,
      firstMessage: d.firstMessage ?? null,
      laterMessage: d.laterMessage ?? null,
      topicsToAvoid: d.topicsToAvoid ?? null,
      expectedNextAction: d.expectedNextAction ?? null,
      backupPlan: d.backupPlan ?? null,
      triedAlready: d.triedAlready ?? null,
      whyMustAsk: d.whyMustAsk ?? null,
      resourcesToInvest: d.resourcesToInvest ?? null,
      estimatedMinutes: d.estimatedMinutes ?? null,
      investmentLimit: d.investmentLimit ?? null,
      valueToOffer: d.valueToOffer ?? null,
      unavailableResources: d.unavailableResources ?? null,
      investmentNature: d.investmentNature ?? null,
      mainlineImpact: d.mainlineImpact ?? null,
      followUpLimit: d.followUpLimit,
    })
    .returning()
  revalidatePath(`/resources/people/${d.personId}`)
  return { plan: row }
}

export async function getPlanDetail(id: number) {
  const userId = await getUserId()
  const [plan] = await db
    .select()
    .from(communicationPlans)
    .where(and(eq(communicationPlans.id, id), eq(communicationPlans.userId, userId)))
  if (!plan) return null
  const [person] = await db
    .select()
    .from(peopleResources)
    .where(and(eq(peopleResources.id, plan.personId), eq(peopleResources.userId, userId)))
  const results = await db
    .select()
    .from(communicationResults)
    .where(and(eq(communicationResults.communicationPlanId, id), eq(communicationResults.userId, userId)))
    .orderBy(desc(communicationResults.createdAt))
  const hypotheses = person
    ? await db
        .select()
        .from(personNeedHypotheses)
        .where(and(eq(personNeedHypotheses.personId, person.id), eq(personNeedHypotheses.userId, userId)))
        .orderBy(desc(personNeedHypotheses.updatedAt))
        .limit(20)
    : []
  return { plan, person: person ?? null, results, hypotheses }
}

export async function updatePlanStatus(id: number, status: "draft" | "ready" | "executed" | "closed") {
  const userId = await getUserId()
  const [row] = await db
    .update(communicationPlans)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(communicationPlans.id, id), eq(communicationPlans.userId, userId)))
    .returning()
  if (row) {
    revalidatePath(`/resources/people/${row.personId}`)
    revalidatePath(`/resources/plans/${id}`)
  }
  return { ok: true }
}

// ── 沟通结果验收 ──

const resultSchema = z.object({
  communicationPlanId: z.number().int().positive(),
  actualResourcesInvested: z.string().max(2000).nullable().optional(),
  confirmedCoreNeed: z.string().max(2000).nullable().optional(),
  hypothesisResult: z.enum(["kept", "revised", "removed"]).nullable().optional(),
  keyInformation: z.string().max(4000).nullable().optional(),
  outcomeStatus: z.string().max(40).nullable().optional(),
  nextAction: z.string().max(1000).nullable().optional(),
  feedbackRequired: z.boolean().default(false),
  worthContinuing: z.boolean().nullable().optional(),
  mainlineImpact: z.string().max(2000).nullable().optional(),
  reflection: z.string().max(4000).nullable().optional(),
})

export async function createCommunicationResult(input: z.infer<typeof resultSchema>) {
  const userId = await getUserId()
  const parsed = resultSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入不合法" }
  }
  const d = parsed.data
  // 校验计划归属
  const [plan] = await db
    .select()
    .from(communicationPlans)
    .where(and(eq(communicationPlans.id, d.communicationPlanId), eq(communicationPlans.userId, userId)))
  if (!plan) return { error: "沟通计划不存在" }

  const [row] = await db
    .insert(communicationResults)
    .values({
      userId,
      communicationPlanId: d.communicationPlanId,
      actualContactAt: new Date(),
      actualResourcesInvested: d.actualResourcesInvested ?? null,
      confirmedCoreNeed: d.confirmedCoreNeed ?? null,
      hypothesisResult: d.hypothesisResult ?? null,
      keyInformation: d.keyInformation ?? null,
      outcomeStatus: d.outcomeStatus ?? null,
      nextAction: d.nextAction ?? null,
      feedbackRequired: d.feedbackRequired,
      worthContinuing: d.worthContinuing ?? null,
      mainlineImpact: d.mainlineImpact ?? null,
      reflection: d.reflection ?? null,
    })
    .returning()

  // 计划标记为已执行;更新人脉最近联系时间与本月联系次数
  await db
    .update(communicationPlans)
    .set({ status: "executed", updatedAt: new Date() })
    .where(and(eq(communicationPlans.id, d.communicationPlanId), eq(communicationPlans.userId, userId)))
  await db
    .update(peopleResources)
    .set({
      lastContactAt: new Date(),
      updatedAt: new Date(),
      interactionStatus: d.feedbackRequired ? "owe_feedback" : "normal",
    })
    .where(and(eq(peopleResources.id, plan.personId), eq(peopleResources.userId, userId)))

  revalidatePath(`/resources/plans/${d.communicationPlanId}`)
  revalidatePath(`/resources/people/${plan.personId}`)
  return { result: row }
}
