"use server"

import { db } from "@/lib/db"
import { unifiedCards, type UnifiedCard } from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { and, eq, asc, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ─────────────────────────────────────────────
// 统一卡片系统(Card Container + Card Item)
// 所有卡片是同一数据对象,仅以 cardType 区分。
// 新增类型 = 在 CARD_TYPES 中加一项,不改表、不改页面结构。
// ─────────────────────────────────────────────

const CARD_TYPES = [
  "boundary", // 边界卡
  "decision", // 决策卡
  "risk", // 风险卡
  "execution", // 执行卡
  "review", // 复盘卡
  "action", // 行动卡
  "backlog", // Backlog 卡
  "note", // 笔记卡
] as const

const cardSchema = z.object({
  cardType: z.enum(CARD_TYPES),
  title: z.string().min(1, "卡片标题不能为空").max(300),
  content: z.string().max(4000).optional().nullable(),
  priority: z.enum(["high", "normal", "low"]).default("normal"),
  contextType: z.string().max(50).optional().nullable(),
  contextId: z.number().int().positive().optional().nullable(),
  linkedCardId: z.number().int().positive().optional().nullable(),
})

export type CardInput = z.infer<typeof cardSchema>

function revalidateCardPaths(contextType?: string | null, contextId?: number | null) {
  if (contextType === "boundary" && contextId) {
    revalidatePath(`/boundaries/${contextId}`)
  }
  if (contextType === "event" && contextId) {
    revalidatePath(`/event-library/${contextId}`)
  }
  revalidatePath("/boundaries")
  revalidatePath("/")
}

// 获取某个上下文下的卡片流(按 sortOrder 升序)
export async function getCards(contextType: string, contextId: number): Promise<UnifiedCard[]> {
  const userId = await getUserId()
  return db
    .select()
    .from(unifiedCards)
    .where(
      and(
        eq(unifiedCards.userId, userId),
        eq(unifiedCards.contextType, contextType),
        eq(unifiedCards.contextId, contextId),
      ),
    )
    .orderBy(asc(unifiedCards.sortOrder), asc(unifiedCards.id))
}

// 新增卡片:仅向容器追加一个 Card Item,不影响已有内容
export async function createCard(input: CardInput): Promise<UnifiedCard | { error: string }> {
  const userId = await getUserId()
  const parsed = cardSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  }
  const data = parsed.data

  // 追加到末尾
  const [{ max }] = await db
    .select({ max: sql<number>`COALESCE(MAX(${unifiedCards.sortOrder}), 0)` })
    .from(unifiedCards)
    .where(
      and(
        eq(unifiedCards.userId, userId),
        eq(unifiedCards.contextType, data.contextType ?? ""),
        eq(unifiedCards.contextId, data.contextId ?? 0),
      ),
    )

  const [card] = await db
    .insert(unifiedCards)
    .values({
      userId,
      cardType: data.cardType,
      title: data.title,
      content: data.content ?? null,
      priority: data.priority,
      sortOrder: Number(max) + 1,
      contextType: data.contextType ?? null,
      contextId: data.contextId ?? null,
      linkedCardId: data.linkedCardId ?? null,
    })
    .returning()

  revalidateCardPaths(data.contextType, data.contextId)
  return card
}

// 独立编辑:单独修改一张卡片
export async function updateCard(
  id: number,
  patch: Partial<Pick<CardInput, "title" | "content" | "priority" | "cardType" | "linkedCardId">> & {
    status?: "active" | "done" | "archived"
  },
): Promise<UnifiedCard | { error: string }> {
  const userId = await getUserId()
  const [existing] = await db
    .select()
    .from(unifiedCards)
    .where(and(eq(unifiedCards.id, id), eq(unifiedCards.userId, userId)))
  if (!existing) return { error: "卡片不存在" }

  if (patch.title !== undefined && patch.title.trim().length === 0) {
    return { error: "卡片标题不能为空" }
  }

  const [card] = await db
    .update(unifiedCards)
    .set({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      ...(patch.cardType !== undefined ? { cardType: patch.cardType } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.linkedCardId !== undefined ? { linkedCardId: patch.linkedCardId } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(unifiedCards.id, id), eq(unifiedCards.userId, userId)))
    .returning()

  revalidateCardPaths(existing.contextType, existing.contextId)
  return card
}

// 复制卡片:副本紧跟原卡之后
export async function duplicateCard(id: number): Promise<UnifiedCard | { error: string }> {
  const userId = await getUserId()
  const [existing] = await db
    .select()
    .from(unifiedCards)
    .where(and(eq(unifiedCards.id, id), eq(unifiedCards.userId, userId)))
  if (!existing) return { error: "卡片不存在" }

  const [card] = await db
    .insert(unifiedCards)
    .values({
      userId,
      cardType: existing.cardType,
      title: `${existing.title}(副本)`,
      content: existing.content,
      priority: existing.priority,
      sortOrder: existing.sortOrder + 1,
      contextType: existing.contextType,
      contextId: existing.contextId,
      linkedCardId: existing.linkedCardId,
    })
    .returning()

  revalidateCardPaths(existing.contextType, existing.contextId)
  return card
}

// 删除卡片(下游卡片的关联指针自动解除)
export async function deleteCard(id: number): Promise<{ ok: true } | { error: string }> {
  const userId = await getUserId()
  const [existing] = await db
    .select()
    .from(unifiedCards)
    .where(and(eq(unifiedCards.id, id), eq(unifiedCards.userId, userId)))
  if (!existing) return { error: "卡片不存在" }

  await db
    .update(unifiedCards)
    .set({ linkedCardId: null })
    .where(and(eq(unifiedCards.linkedCardId, id), eq(unifiedCards.userId, userId)))
  await db.delete(unifiedCards).where(and(eq(unifiedCards.id, id), eq(unifiedCards.userId, userId)))

  revalidateCardPaths(existing.contextType, existing.contextId)
  return { ok: true }
}

// 排序:接收整个上下文内的卡片 ID 顺序(拖拽/上下移共用)
export async function reorderCards(
  contextType: string,
  contextId: number,
  orderedIds: number[],
): Promise<{ ok: true } | { error: string }> {
  const userId = await getUserId()
  if (!Array.isArray(orderedIds) || orderedIds.some((n) => !Number.isInteger(n))) {
    return { error: "排序数据无效" }
  }

  await Promise.all(
    orderedIds.map((cardId, index) =>
      db
        .update(unifiedCards)
        .set({ sortOrder: index + 1, updatedAt: new Date() })
        .where(
          and(
            eq(unifiedCards.id, cardId),
            eq(unifiedCards.userId, userId),
            eq(unifiedCards.contextType, contextType),
            eq(unifiedCards.contextId, contextId),
          ),
        ),
    ),
  )

  revalidateCardPaths(contextType, contextId)
  return { ok: true }
}
