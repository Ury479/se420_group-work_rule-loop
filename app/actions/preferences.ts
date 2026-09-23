"use server"

import { db } from "@/lib/db"
import { userPreferences } from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { and, eq } from "drizzle-orm"

const NAV_ORDER_KEY = "nav_order"

// 读取导航排序(href 数组);未设置返回 null,使用默认顺序
export async function getNavOrder(): Promise<string[] | null> {
  try {
    const userId = await getUserId()
    const [row] = await db
      .select()
      .from(userPreferences)
      .where(and(eq(userPreferences.userId, userId), eq(userPreferences.prefKey, NAV_ORDER_KEY)))
    if (!row) return null
    const parsed = JSON.parse(row.prefValue)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : null
  } catch {
    // 数据库不可用时静默回退到默认顺序,不阻塞页面渲染
    return null
  }
}

// 保存导航排序
export async function saveNavOrder(order: string[]): Promise<{ ok: boolean; error?: string }> {
  if (!Array.isArray(order) || order.length === 0 || order.length > 30) {
    return { ok: false, error: "排序数据无效" }
  }
  if (!order.every((v) => typeof v === "string" && v.startsWith("/") && v.length < 100)) {
    return { ok: false, error: "排序数据无效" }
  }
  const userId = await getUserId()
  const value = JSON.stringify(order)
  const [existing] = await db
    .select({ id: userPreferences.id })
    .from(userPreferences)
    .where(and(eq(userPreferences.userId, userId), eq(userPreferences.prefKey, NAV_ORDER_KEY)))
  if (existing) {
    await db
      .update(userPreferences)
      .set({ prefValue: value, updatedAt: new Date() })
      .where(and(eq(userPreferences.id, existing.id), eq(userPreferences.userId, userId)))
  } else {
    await db.insert(userPreferences).values({ userId, prefKey: NAV_ORDER_KEY, prefValue: value })
  }
  return { ok: true }
}

// 重置为默认顺序
export async function resetNavOrder(): Promise<{ ok: boolean }> {
  const userId = await getUserId()
  await db
    .delete(userPreferences)
    .where(and(eq(userPreferences.userId, userId), eq(userPreferences.prefKey, NAV_ORDER_KEY)))
  return { ok: true }
}
