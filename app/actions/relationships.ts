"use server"

import { db } from "@/lib/db"
import {
  relationships,
  relationshipInteractions,
  relationshipReviews,
  confirmationRules,
} from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import {
  quickScreenSchema,
  deepScreenSchema,
  updateRelationshipSchema,
  interactionSchema,
  relationshipReviewSchema,
  type QuickScreenInput,
  type DeepScreenInput,
  type UpdateRelationshipInput,
  type InteractionInput,
  type RelationshipReviewInput,
} from "@/lib/validation"
import {
  suggestRelationshipStatus,
  suggestNetImpact,
  suggestNextAction,
  KEY_RELATIONSHIP_TYPES,
  type RelationshipStatus,
} from "@/lib/relationships"
import { and, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// ── 查询 ──────────────────────────────

export async function getRelationships() {
  const userId = await getUserId()
  return db
    .select()
    .from(relationships)
    .where(eq(relationships.userId, userId))
    .orderBy(desc(relationships.updatedAt))
}

export async function getRelationship(id: number) {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(relationships)
    .where(and(eq(relationships.id, id), eq(relationships.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

export async function getInteractions(relationshipId: number) {
  const userId = await getUserId()
  return db
    .select()
    .from(relationshipInteractions)
    .where(
      and(
        eq(relationshipInteractions.relationshipId, relationshipId),
        eq(relationshipInteractions.userId, userId)
      )
    )
    .orderBy(desc(relationshipInteractions.interactionDate))
}

export async function getRelationshipReviews(relationshipId: number) {
  const userId = await getUserId()
  return db
    .select()
    .from(relationshipReviews)
    .where(
      and(
        eq(relationshipReviews.relationshipId, relationshipId),
        eq(relationshipReviews.userId, userId)
      )
    )
    .orderBy(desc(relationshipReviews.createdAt))
}

export async function getLatestRelationshipReview() {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(relationshipReviews)
    .where(eq(relationshipReviews.userId, userId))
    .orderBy(desc(relationshipReviews.createdAt))
    .limit(1)
  return rows[0] ?? null
}

// ── 30 秒快速筛查 ──────────────────────────────

export async function quickScreen(input: QuickScreenInput) {
  const userId = await getUserId()
  const parsed = quickScreenSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data

  // 基于事实的状态初判(不是给人贴标签)
  const status = suggestRelationshipStatus({ energyAfter: data.energyAfter })
  const netImpact = suggestNetImpact({ energyAfter: data.energyAfter })
  const nextAction = data.nextAction ?? suggestNextAction(status)

  const inserted = await db
    .insert(relationships)
    .values({
      userId,
      personName: data.personName,
      relationshipType: data.relationshipType,
      relationshipStatus: status,
      netImpact,
      nextAction,
      keySignals: data.signalNote ?? null,
      notes: data.impactNote ?? null,
      lastInteractionAt: new Date(),
    })
    .returning({ id: relationships.id })

  const relationshipId = inserted[0].id

  // 快速筛查同时落一条互动记录
  await db.insert(relationshipInteractions).values({
    userId,
    relationshipId,
    interactionFact: data.interactionFact,
    energyAfter: data.energyAfter,
    signalType: "unclear",
  })

  revalidatePath("/relationships")
  return { success: true, id: relationshipId, status, netImpact, nextAction }
}

// ── 深度筛查 ──────────────────────────────

export async function deepScreen(input: DeepScreenInput) {
  const userId = await getUserId()
  const parsed = deepScreenSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data

  const status = suggestRelationshipStatus({
    energyAfter: "calm",
    reciprocityLevel: data.reciprocityLevel,
    netImpact: data.netImpact,
  })

  const inserted = await db
    .insert(relationships)
    .values({
      userId,
      personName: data.personName,
      relationshipType: data.relationshipType,
      relationshipStatus: status,
      netImpact: data.netImpact,
      careerImpactScore: data.careerImpactScore ?? null,
      workImpactScore: data.workImpactScore ?? null,
      emotionImpactScore: data.emotionImpactScore ?? null,
      growthImpactScore: data.growthImpactScore ?? null,
      reciprocityLevel: data.reciprocityLevel,
      coreNeedHypothesis: data.coreNeedHypothesis ?? null,
      sensitivePoints: data.sensitivePoints ?? null,
      communicationLandmines: data.communicationLandmines ?? null,
      keySignals: data.keySignals ?? null,
      boundaryNotes: data.boundaryNotes ?? null,
      nextAction: data.nextAction,
      notes: data.notes ?? null,
      lastInteractionAt: new Date(),
    })
    .returning({ id: relationships.id })

  const relationshipId = inserted[0].id

  await db.insert(relationshipInteractions).values({
    userId,
    relationshipId,
    interactionFact: data.recentInteractionFact,
    energyAfter: "calm",
    signalType: "unclear",
  })

  revalidatePath("/relationships")
  return { success: true, id: relationshipId, status }
}

// ── 更新与删除 ──────────────────────────────

export async function updateRelationship(id: number, input: UpdateRelationshipInput) {
  const userId = await getUserId()
  const parsed = updateRelationshipSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const d = parsed.data
  await db
    .update(relationships)
    .set({
      ...(d.personName !== undefined && { personName: d.personName }),
      ...(d.relationshipType !== undefined && { relationshipType: d.relationshipType }),
      ...(d.relationshipStatus !== undefined && {
        relationshipStatus: d.relationshipStatus,
      }),
      ...(d.netImpact !== undefined && { netImpact: d.netImpact }),
      ...(d.careerImpactScore !== undefined && { careerImpactScore: d.careerImpactScore }),
      ...(d.workImpactScore !== undefined && { workImpactScore: d.workImpactScore }),
      ...(d.emotionImpactScore !== undefined && {
        emotionImpactScore: d.emotionImpactScore,
      }),
      ...(d.growthImpactScore !== undefined && { growthImpactScore: d.growthImpactScore }),
      ...(d.reciprocityLevel !== undefined && { reciprocityLevel: d.reciprocityLevel }),
      ...(d.coreNeedHypothesis !== undefined && {
        coreNeedHypothesis: d.coreNeedHypothesis,
      }),
      ...(d.sensitivePoints !== undefined && { sensitivePoints: d.sensitivePoints }),
      ...(d.communicationLandmines !== undefined && {
        communicationLandmines: d.communicationLandmines,
      }),
      ...(d.keySignals !== undefined && { keySignals: d.keySignals }),
      ...(d.boundaryNotes !== undefined && { boundaryNotes: d.boundaryNotes }),
      ...(d.nextAction !== undefined && { nextAction: d.nextAction }),
      ...(d.notes !== undefined && { notes: d.notes }),
      updatedAt: new Date(),
    })
    .where(and(eq(relationships.id, id), eq(relationships.userId, userId)))
  revalidatePath("/relationships")
  revalidatePath(`/relationships/${id}`)
  return { success: true }
}

export async function deleteRelationship(id: number) {
  const userId = await getUserId()
  await db
    .delete(relationshipInteractions)
    .where(
      and(
        eq(relationshipInteractions.relationshipId, id),
        eq(relationshipInteractions.userId, userId)
      )
    )
  await db
    .delete(relationshipReviews)
    .where(
      and(
        eq(relationshipReviews.relationshipId, id),
        eq(relationshipReviews.userId, userId)
      )
    )
  await db
    .delete(relationships)
    .where(and(eq(relationships.id, id), eq(relationships.userId, userId)))
  revalidatePath("/relationships")
  return { success: true }
}

// ── 互动记录 ──────────────────────────────

export async function addInteraction(input: InteractionInput) {
  const userId = await getUserId()
  const parsed = interactionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data

  await db.insert(relationshipInteractions).values({
    userId,
    relationshipId: data.relationshipId,
    interactionFact: data.interactionFact,
    energyAfter: data.energyAfter,
    signalType: data.signalType,
    didIPeoplePlease: data.didIPeoplePlease,
    didICrossBoundary: data.didICrossBoundary,
    userResponse: data.userResponse ?? null,
    nextStep: data.nextStep ?? null,
  })

  // 基于新事实重估关系状态(只调状态,不贴标签)
  const current = await getRelationship(data.relationshipId)
  if (current) {
    const status = suggestRelationshipStatus({
      energyAfter: data.energyAfter,
      didIPeoplePlease: data.didIPeoplePlease,
      didICrossBoundary: data.didICrossBoundary,
      signalType: data.signalType,
      reciprocityLevel: current.reciprocityLevel as never,
      netImpact: current.netImpact as never,
    })
    await db
      .update(relationships)
      .set({
        relationshipStatus: status,
        nextAction: suggestNextAction(status),
        lastInteractionAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(relationships.id, data.relationshipId),
          eq(relationships.userId, userId)
        )
      )
  }

  // 触发底线防护:讨好或越界信号
  const needBoundaryCheck = data.didIPeoplePlease || data.didICrossBoundary

  revalidatePath("/relationships")
  revalidatePath(`/relationships/${data.relationshipId}`)
  return { success: true, needBoundaryCheck }
}

// ── 人际灰烬备忘录 ──────────────────────────────

export async function createRelationshipReview(input: RelationshipReviewInput) {
  const userId = await getUserId()
  const parsed = relationshipReviewSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data

  let linkedRuleId: number | null = null

  // 拦截规则写入规则库(联动关键动作拦截台)
  if (data.writeToRules) {
    const ruleInserted = await db
      .insert(confirmationRules)
      .values({
        userId,
        domain: "relationship",
        ruleText: data.interceptionRule,
        principleText: data.principle,
        triggerCondition: "给关键关系发送消息或做出承诺前",
        finalActionType: "send",
        isActive: true,
        sourceType: "ash_memo",
      })
      .returning({ id: confirmationRules.id })
    linkedRuleId = ruleInserted[0].id
  }

  const inserted = await db
    .insert(relationshipReviews)
    .values({
      userId,
      relationshipId: data.relationshipId,
      whatHappened: data.whatHappened,
      ignoredSignal: data.ignoredSignal ?? null,
      rushedOrEmotionalPart: data.rushedOrEmotionalPart ?? null,
      peoplePleasingPart: data.peoplePleasingPart ?? null,
      boundaryCrossed: data.boundaryCrossed ?? null,
      possibleCoreNeed: data.possibleCoreNeed ?? null,
      lesson: data.lesson,
      principle: data.principle,
      interceptionRule: data.interceptionRule,
      linkedConfirmationRuleId: linkedRuleId,
    })
    .returning({ id: relationshipReviews.id })

  revalidatePath("/relationships")
  revalidatePath(`/relationships/${data.relationshipId}`)
  revalidatePath("/rules")
  return { success: true, id: inserted[0].id, linkedRuleId }
}

// ── 沟通前检查:关键对象自动高风险 ──────────────────────────────

export async function isHighRiskCommunication(relationshipId: number) {
  const rel = await getRelationship(relationshipId)
  if (!rel) return { highRisk: false }
  const status = rel.relationshipStatus as RelationshipStatus
  const highRisk =
    KEY_RELATIONSHIP_TYPES.includes(rel.relationshipType as never) ||
    status === "long_term_maintain" ||
    status === "observe_carefully" ||
    status === "boundary_needed"
  return { highRisk, status, personName: rel.personName }
}
