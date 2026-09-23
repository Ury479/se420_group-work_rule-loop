"use server"

import { db } from "@/lib/db"
import { spendingAnchors } from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { and, eq, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ─────────────────────────────────────────────
// 消费参照物(等价换算锚点 + 历史消费记录)
// 每个查询都必须 eq(userId) 隔离
// ─────────────────────────────────────────────

// 用户提供的默认参照物;首次读取时自动播种
const PRESET_ANCHORS = [
  { name: "Cursor 会员", priceCny: 140, unitLabel: "1 个月", category: "ai_tool" },
  { name: "v0 账号", priceCny: 150, unitLabel: "1 个月", category: "ai_tool" },
  { name: "GPT 顶配大模型", priceCny: 1440, unitLabel: "1 个月", category: "ai_tool" },
  { name: "zcode 额度", priceCny: 300, unitLabel: "半个月用量", category: "ai_tool" },
  { name: "一顿大餐", priceCny: 400, unitLabel: "1 顿", category: "dining" },
  { name: "微信读书会员", priceCny: 20, unitLabel: "1 个月", category: "subscription" },
  { name: "面膜", priceCny: 170, unitLabel: "15 张", category: "shopping" },
] as const

async function seedPresetsIfEmpty(userId: string) {
  const [existing] = await db
    .select({ id: spendingAnchors.id })
    .from(spendingAnchors)
    .where(eq(spendingAnchors.userId, userId))
    .limit(1)
  if (existing) return
  await db.insert(spendingAnchors).values(
    PRESET_ANCHORS.map((p) => ({
      userId,
      name: p.name,
      priceCny: p.priceCny,
      unitLabel: p.unitLabel,
      category: p.category,
      sourceType: "preset",
    }))
  )
}

export async function getAnchors() {
  const userId = await getUserId()
  await seedPresetsIfEmpty(userId)
  return db
    .select()
    .from(spendingAnchors)
    .where(eq(spendingAnchors.userId, userId))
    .orderBy(desc(spendingAnchors.sourceType), spendingAnchors.priceCny)
    .limit(100)
}

export async function getActiveAnchors() {
  const userId = await getUserId()
  await seedPresetsIfEmpty(userId)
  return db
    .select()
    .from(spendingAnchors)
    .where(and(eq(spendingAnchors.userId, userId), eq(spendingAnchors.isActive, true)))
    .orderBy(spendingAnchors.priceCny)
    .limit(100)
}

const anchorSchema = z.object({
  name: z.string().min(1, "请填写名称").max(100),
  priceCny: z.number().int().min(1, "金额需大于 0"),
  unitLabel: z.string().max(50).default("1 份"),
  category: z.string().max(30).nullable().default(null),
  sourceType: z.enum(["preset", "history"]).default("history"),
  purchasedAt: z.string().nullable().default(null), // YYYY-MM-DD
  productNote: z.string().max(500).nullable().default(null),
})

export async function createAnchor(input: z.infer<typeof anchorSchema>) {
  const userId = await getUserId()
  const parsed = anchorSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "输入无效" }
  const d = parsed.data
  const [row] = await db
    .insert(spendingAnchors)
    .values({
      userId,
      name: d.name,
      priceCny: d.priceCny,
      unitLabel: d.unitLabel || "1 份",
      category: d.category,
      sourceType: d.sourceType,
      purchasedAt: d.purchasedAt ? new Date(d.purchasedAt) : null,
      productNote: d.productNote,
    })
    .returning()
  revalidatePath("/spending-review/anchors")
  revalidatePath("/spending-review/new")
  return { anchor: row }
}

export async function toggleAnchor(id: number, isActive: boolean) {
  const userId = await getUserId()
  await db
    .update(spendingAnchors)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(spendingAnchors.id, id), eq(spendingAnchors.userId, userId)))
  revalidatePath("/spending-review/anchors")
  return { ok: true }
}

export async function deleteAnchor(id: number) {
  const userId = await getUserId()
  await db
    .delete(spendingAnchors)
    .where(and(eq(spendingAnchors.id, id), eq(spendingAnchors.userId, userId)))
  revalidatePath("/spending-review/anchors")
  return { ok: true }
}
