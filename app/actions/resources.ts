"use server"

import { db } from "@/lib/db"
import { resources, resourceEvidence, resourceLinks, resourceReviews, resourcePlatforms } from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { and, eq, ne, count } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
  RESOURCE_TYPES,
  RESOURCE_DOMAINS,
  RESOURCE_STATUSES,
  MAINLINES,
  EVIDENCE_TYPES,
  LINKED_TYPES,
  DOMAIN_ACTIVE_LIMIT,
  activationMissing,
} from "@/lib/resource-types"

// ─────────────────────────────────────────────
// 资源配置台 Server Actions(每个查询 userId 隔离)
// ─────────────────────────────────────────────

const typeValues = RESOURCE_TYPES.map((t) => t.value)
const domainValues = RESOURCE_DOMAINS.map((d) => d.value)
const statusValues = RESOURCE_STATUSES.map((s) => s.value)
const mainlineValues = MAINLINES.map((m) => m.value)

const resourceSchema = z.object({
  name: z.string().min(1, "请填写资源名称").max(200),
  resourceType: z.enum(typeValues as [string, ...string[]]),
  domain: z.enum(domainValues as [string, ...string[]]),
  status: z.enum(statusValues as [string, ...string[]]).default("pending_review"),
  platformId: z.number().int().nullable().default(null),
  mainline: z
    .enum(mainlineValues as [string, ...string[]])
    .nullable()
    .default(null),
  responsibility: z.string().max(500).nullable().default(null),
  locationUrl: z.string().max(1000).nullable().default(null),
  localPath: z.string().max(1000).nullable().default(null),
  purchaseCost: z.number().int().min(0).nullable().default(null),
  currency: z.enum(["CNY", "USD"]).default("CNY"),
  storageSizeMb: z.number().int().min(0).nullable().default(null),
  isReplaceable: z.boolean().default(true),
  isDuplicate: z.boolean().default(false),
  nextAction: z.string().max(500).nullable().default(null),
  expectedOutput: z.string().max(500).nullable().default(null),
  reviewAt: z.string().nullable().default(null),
  notes: z.string().max(2000).nullable().default(null),
})

export type ResourceInput = z.infer<typeof resourceSchema>

/** 规则 1 检查:同一领域已激活的内容/工具资源数量 */
async function activeCountInDomain(userId: string, domain: string, excludeId?: number) {
  const conds = [
    eq(resources.userId, userId),
    eq(resources.domain, domain),
    eq(resources.status, "active"),
  ]
  if (excludeId) conds.push(ne(resources.id, excludeId))
  const rows = await db
    .select({ n: count() })
    .from(resources)
    .where(and(...conds))
  return rows[0]?.n ?? 0
}

/** 规则 1+2:激活校验。返回错误信息或 null */
async function validateActivation(
  userId: string,
  data: { domain: string; mainline: string | null; nextAction: string | null; expectedOutput: string | null; resourceType: string },
  excludeId?: number
): Promise<string | null> {
  // 规则 2:三要素缺失不得激活
  const missing = activationMissing(data)
  if (missing.length > 0) {
    return `不满足激活条件,缺少:${missing.join("、")}。请先补齐,或将状态设为「待验证」「冻结」。`
  }
  // 规则 1:仅内容/工具资源受领域上限约束
  if (data.resourceType === "content" || data.resourceType === "tool") {
    const n = await activeCountInDomain(userId, data.domain, excludeId)
    if (n >= DOMAIN_ACTIVE_LIMIT) {
      return `当前问题不是资源不足。「${data.domain}」领域已有 ${n} 项激活资源(上限 ${DOMAIN_ACTIVE_LIMIT})。请先完成、冻结或退出一项现有资源,再激活新资源。`
    }
  }
  return null
}

export async function createResource(input: ResourceInput) {
  const userId = await getUserId()
  const parsed = resourceSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data

  if (data.status === "active") {
    const err = await validateActivation(userId, data)
    if (err) return { error: err }
  }

  const [row] = await db
    .insert(resources)
    .values({
      userId,
      name: data.name,
      resourceType: data.resourceType,
      domain: data.domain,
      status: data.status,
      platformId: data.platformId,
      mainline: data.mainline,
      responsibility: data.responsibility,
      locationUrl: data.locationUrl,
      localPath: data.localPath,
      purchaseCost: data.purchaseCost,
      currency: data.currency,
      storageSizeMb: data.storageSizeMb,
      isReplaceable: data.isReplaceable,
      isDuplicate: data.isDuplicate,
      nextAction: data.nextAction,
      expectedOutput: data.expectedOutput,
      reviewAt: data.reviewAt ? new Date(data.reviewAt) : null,
      notes: data.notes,
    })
    .returning({ id: resources.id })

  revalidatePath("/resources")
  return { id: row.id }
}

const statusChangeSchema = z.object({
  id: z.number().int(),
  status: z.enum(statusValues as [string, ...string[]]),
  nextAction: z.string().max(500).nullable().optional(),
  expectedOutput: z.string().max(500).nullable().optional(),
  mainline: z
    .enum(mainlineValues as [string, ...string[]])
    .nullable()
    .optional(),
  reviewAt: z.string().nullable().optional(),
})

export async function updateResourceStatus(input: z.infer<typeof statusChangeSchema>) {
  const userId = await getUserId()
  const parsed = statusChangeSchema.safeParse(input)
  if (!parsed.success) return { error: "输入无效" }
  const data = parsed.data

  const [existing] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, data.id), eq(resources.userId, userId)))
  if (!existing) return { error: "资源不存在" }

  const merged = {
    domain: existing.domain,
    resourceType: existing.resourceType,
    mainline: data.mainline !== undefined ? data.mainline : existing.mainline,
    nextAction: data.nextAction !== undefined ? data.nextAction : existing.nextAction,
    expectedOutput: data.expectedOutput !== undefined ? data.expectedOutput : existing.expectedOutput,
  }

  if (data.status === "active" && existing.status !== "active") {
    const err = await validateActivation(userId, merged, data.id)
    if (err) return { error: err }
  }

  await db
    .update(resources)
    .set({
      status: data.status,
      mainline: merged.mainline,
      nextAction: merged.nextAction,
      expectedOutput: merged.expectedOutput,
      reviewAt: data.reviewAt !== undefined ? (data.reviewAt ? new Date(data.reviewAt) : null) : existing.reviewAt,
      updatedAt: new Date(),
    })
    .where(and(eq(resources.id, data.id), eq(resources.userId, userId)))

  revalidatePath("/resources")
  revalidatePath(`/resources/${data.id}`)
  return { ok: true }
}

// ── 成果证据(推进转化层级) ──

const evidenceSchema = z.object({
  resourceId: z.number().int(),
  evidenceType: z.enum(EVIDENCE_TYPES.map((e) => e.value) as [string, ...string[]]),
  title: z.string().max(200).nullable().default(null),
  content: z.string().max(5000).nullable().default(null),
  externalUrl: z.string().max(1000).nullable().default(null),
  conversionLevel: z.number().int().min(1).max(5),
})

export async function addResourceEvidence(input: z.infer<typeof evidenceSchema>) {
  const userId = await getUserId()
  const parsed = evidenceSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  const data = parsed.data

  const [res] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, data.resourceId), eq(resources.userId, userId)))
  if (!res) return { error: "资源不存在" }

  // 规则 5:仅笔记类证据(理解层)最多推进到 L2;练习/产出类才能到 L3+
  const understandingOnly = ["note", "article"].includes(data.evidenceType)
  const cappedLevel = understandingOnly ? Math.min(data.conversionLevel, 2) : data.conversionLevel

  await db.insert(resourceEvidence).values({
    userId,
    resourceId: data.resourceId,
    evidenceType: data.evidenceType,
    title: data.title,
    content: data.content,
    externalUrl: data.externalUrl,
    conversionLevel: cappedLevel,
  })

  await db
    .update(resources)
    .set({
      conversionLevel: Math.max(res.conversionLevel, cappedLevel),
      lastUsedAt: new Date(),
      usageCount: res.usageCount + 1,
      updatedAt: new Date(),
    })
    .where(and(eq(resources.id, data.resourceId), eq(resources.userId, userId)))

  revalidatePath(`/resources/${data.resourceId}`)
  revalidatePath("/resources")
  return { ok: true, cappedToL2: understandingOnly && data.conversionLevel > 2 }
}

// ── 外部笔记人工关联 ──

const linkSchema = z.object({
  resourceId: z.number().int(),
  linkedType: z.enum(LINKED_TYPES.map((l) => l.value) as [string, ...string[]]),
  externalTitle: z.string().max(200).nullable().default(null),
  externalPlatform: z.string().max(100).nullable().default(null),
  externalUrl: z.string().max(1000).nullable().default(null),
  keywords: z.string().max(300).nullable().default(null),
  linkReason: z.string().max(500).nullable().default(null),
})

export async function addResourceLink(input: z.infer<typeof linkSchema>) {
  const userId = await getUserId()
  const parsed = linkSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  const data = parsed.data

  const [res] = await db
    .select({ id: resources.id })
    .from(resources)
    .where(and(eq(resources.id, data.resourceId), eq(resources.userId, userId)))
  if (!res) return { error: "资源不存在" }

  await db.insert(resourceLinks).values({ userId, ...data })
  revalidatePath(`/resources/${data.resourceId}`)
  return { ok: true }
}

export async function deleteResourceLink(id: number, resourceId: number) {
  const userId = await getUserId()
  await db.delete(resourceLinks).where(and(eq(resourceLinks.id, id), eq(resourceLinks.userId, userId)))
  revalidatePath(`/resources/${resourceId}`)
  return { ok: true }
}

// ── 使用后三问 / 闲置复盘 ──

const reviewSchema = z.object({
  resourceId: z.number().int(),
  actualUsage: z.string().max(1000).nullable().default(null),
  outputCreated: z.string().max(1000).nullable().default(null),
  unusedReason: z.string().max(1000).nullable().default(null),
  managementCost: z.string().max(500).nullable().default(null),
  nextStatus: z.enum(["active", "frozen", "archived", "removal_pending"]),
  nextReviewAt: z.string().nullable().default(null),
  reflection: z.string().max(2000).nullable().default(null),
})

export async function addResourceReview(input: z.infer<typeof reviewSchema>) {
  const userId = await getUserId()
  const parsed = reviewSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  const data = parsed.data

  const [res] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, data.resourceId), eq(resources.userId, userId)))
  if (!res) return { error: "资源不存在" }

  // 复盘选择继续激活时同样受激活规则约束
  if (data.nextStatus === "active" && res.status !== "active") {
    const err = await validateActivation(
      userId,
      {
        domain: res.domain,
        resourceType: res.resourceType,
        mainline: res.mainline,
        nextAction: res.nextAction,
        expectedOutput: res.expectedOutput,
      },
      res.id
    )
    if (err) return { error: err }
  }

  await db.insert(resourceReviews).values({
    userId,
    resourceId: data.resourceId,
    actualUsage: data.actualUsage,
    outputCreated: data.outputCreated,
    unusedReason: data.unusedReason,
    managementCost: data.managementCost,
    nextStatus: data.nextStatus,
    nextReviewAt: data.nextReviewAt ? new Date(data.nextReviewAt) : null,
    reflection: data.reflection,
  })

  await db
    .update(resources)
    .set({
      status: data.nextStatus,
      reviewAt: data.nextReviewAt ? new Date(data.nextReviewAt) : res.reviewAt,
      updatedAt: new Date(),
    })
    .where(and(eq(resources.id, data.resourceId), eq(resources.userId, userId)))

  revalidatePath(`/resources/${data.resourceId}`)
  revalidatePath("/resources")
  return { ok: true }
}

export async function deleteResource(id: number) {
  const userId = await getUserId()
  await db.delete(resourceEvidence).where(and(eq(resourceEvidence.resourceId, id), eq(resourceEvidence.userId, userId)))
  await db.delete(resourceLinks).where(and(eq(resourceLinks.resourceId, id), eq(resourceLinks.userId, userId)))
  await db.delete(resourceReviews).where(and(eq(resourceReviews.resourceId, id), eq(resourceReviews.userId, userId)))
  await db.delete(resources).where(and(eq(resources.id, id), eq(resources.userId, userId)))
  revalidatePath("/resources")
  return { ok: true }
}

// ── 平台职责 ──

const platformSchema = z.object({
  name: z.string().min(1, "请填写平台名称").max(100),
  primaryRole: z.string().min(1, "请填写唯一主要职责").max(300),
  excludedRoles: z.string().max(300).nullable().default(null),
  resourceTypes: z.string().max(200).nullable().default(null),
  isPrimary: z.boolean().default(false),
  notes: z.string().max(500).nullable().default(null),
})

export async function createPlatform(input: z.infer<typeof platformSchema>) {
  const userId = await getUserId()
  const parsed = platformSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  await db.insert(resourcePlatforms).values({ userId, ...parsed.data })
  revalidatePath("/resources")
  return { ok: true }
}

// ── 查询 ──

export async function getResources() {
  const userId = await getUserId()
  return db
    .select()
    .from(resources)
    .where(eq(resources.userId, userId))
    .orderBy(resources.status, resources.domain)
    .limit(300)
}

export async function getResourceDetail(id: number) {
  const userId = await getUserId()
  const [resource] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, id), eq(resources.userId, userId)))
  if (!resource) return null
  const [evidence, links, reviews] = await Promise.all([
    db
      .select()
      .from(resourceEvidence)
      .where(and(eq(resourceEvidence.resourceId, id), eq(resourceEvidence.userId, userId)))
      .orderBy(resourceEvidence.createdAt)
      .limit(100),
    db
      .select()
      .from(resourceLinks)
      .where(and(eq(resourceLinks.resourceId, id), eq(resourceLinks.userId, userId)))
      .orderBy(resourceLinks.createdAt)
      .limit(100),
    db
      .select()
      .from(resourceReviews)
      .where(and(eq(resourceReviews.resourceId, id), eq(resourceReviews.userId, userId)))
      .orderBy(resourceReviews.createdAt)
      .limit(50),
  ])
  return { resource, evidence, links, reviews }
}

export async function getPlatforms() {
  const userId = await getUserId()
  return db
    .select()
    .from(resourcePlatforms)
    .where(eq(resourcePlatforms.userId, userId))
    .orderBy(resourcePlatforms.createdAt)
    .limit(50)
}

// ── 规则 3:30 天失活自动进入待复审 ──

export async function applyStalenessRule() {
  const userId = await getUserId()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const rows = await db
    .select()
    .from(resources)
    .where(and(eq(resources.userId, userId), eq(resources.status, "active")))
  let moved = 0
  for (const r of rows) {
    const lastTouch = r.lastUsedAt ?? r.createdAt
    if (lastTouch < thirtyDaysAgo && !r.nextAction && r.conversionLevel < 3) {
      await db
        .update(resources)
        .set({ status: "pending_review", updatedAt: new Date() })
        .where(and(eq(resources.id, r.id), eq(resources.userId, userId)))
      moved++
    }
  }
  if (moved > 0) revalidatePath("/resources")
  return { moved }
}
