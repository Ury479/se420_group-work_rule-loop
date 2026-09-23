"use server"

import { db } from "@/lib/db"
import { lifespanLogs, userPreferences, rhythmLogs } from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { and, eq, desc, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

const BIRTH_DATE_KEY = "birth_date"
const MODEL_TREE_URL_KEY = "model_tree_url"
const LIFE_EXPECTANCY_YEARS = 80

function todayStr(clientDate?: string): string {
  if (clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate)) return clientDate
  return new Date().toISOString().slice(0, 10)
}

async function getPref(key: string): Promise<string | null> {
  try {
    const userId = await getUserId()
    const [row] = await db
      .select()
      .from(userPreferences)
      .where(and(eq(userPreferences.userId, userId), eq(userPreferences.prefKey, key)))
    return row ? (JSON.parse(row.prefValue) as string) : null
  } catch {
    return null
  }
}

async function setPref(key: string, value: string): Promise<void> {
  const userId = await getUserId()
  const prefValue = JSON.stringify(value)
  const [existing] = await db
    .select({ id: userPreferences.id })
    .from(userPreferences)
    .where(and(eq(userPreferences.userId, userId), eq(userPreferences.prefKey, key)))
  if (existing) {
    await db
      .update(userPreferences)
      .set({ prefValue, updatedAt: new Date() })
      .where(and(eq(userPreferences.id, existing.id), eq(userPreferences.userId, userId)))
  } else {
    await db.insert(userPreferences).values({ userId, prefKey: key, prefValue })
  }
}

// ── 配置 ──

export async function getEntropyConfig() {
  const [birthDate, modelTreeUrl] = await Promise.all([getPref(BIRTH_DATE_KEY), getPref(MODEL_TREE_URL_KEY)])
  return { birthDate, modelTreeUrl }
}

export async function saveBirthDate(birthDate: string): Promise<{ ok: boolean; error?: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return { ok: false, error: "日期格式无效" }
  const d = new Date(birthDate + "T00:00:00Z")
  if (Number.isNaN(d.getTime()) || d.getTime() > Date.now() || d.getFullYear() < 1900) {
    return { ok: false, error: "日期无效" }
  }
  await setPref(BIRTH_DATE_KEY, birthDate)
  revalidatePath("/lifespan")
  revalidatePath("/night-ritual")
  revalidatePath("/settings")
  return { ok: true }
}

export async function saveModelTreeUrl(url: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = url.trim()
  if (trimmed.length > 500) return { ok: false, error: "URL 过长" }
  if (trimmed && !/^https?:\/\//.test(trimmed)) return { ok: false, error: "请输入 http(s) 链接" }
  await setPref(MODEL_TREE_URL_KEY, trimmed)
  revalidatePath("/night-ritual")
  revalidatePath("/settings")
  return { ok: true }
}

// ── 寿命计算 ──

export type LifespanSummary = {
  configured: boolean
  birthDate: string | null
  daysUsed: number
  daysRemaining: number
  percentUsed: number
  effectiveDaysTotal: number // 累计有效寿命(天,保留 1 位小数)
  yesterdayGain: number // 昨日 +X.X 天
  todayScore: number | null
  streakDays: number // 连续打分天数
}

export async function getLifespanSummary(clientToday?: string): Promise<LifespanSummary> {
  const userId = await getUserId()
  const today = todayStr(clientToday)
  const birthDate = await getPref(BIRTH_DATE_KEY)

  const empty: LifespanSummary = {
    configured: false,
    birthDate: null,
    daysUsed: 0,
    daysRemaining: 0,
    percentUsed: 0,
    effectiveDaysTotal: 0,
    yesterdayGain: 0,
    todayScore: null,
    streakDays: 0,
  }
  if (!birthDate) return empty

  const birth = new Date(birthDate + "T00:00:00Z")
  const now = new Date(today + "T00:00:00Z")
  const daysUsed = Math.max(0, Math.floor((now.getTime() - birth.getTime()) / 86400000))
  const totalDays = LIFE_EXPECTANCY_YEARS * 365.25
  const daysRemaining = Math.max(0, Math.round(totalDays - daysUsed))
  const percentUsed = Math.min(100, Math.round((daysUsed / totalDays) * 1000) / 10)

  const [sumRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${lifespanLogs.effectiveDaysX100}), 0)` })
    .from(lifespanLogs)
    .where(eq(lifespanLogs.userId, userId))

  const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10)
  const [yRow] = await db
    .select()
    .from(lifespanLogs)
    .where(and(eq(lifespanLogs.userId, userId), eq(lifespanLogs.date, yesterday)))
  const [tRow] = await db
    .select()
    .from(lifespanLogs)
    .where(and(eq(lifespanLogs.userId, userId), eq(lifespanLogs.date, today)))

  // 连续打分天数:从今天(或昨天)往前数连续存在的记录
  const recent = await db
    .select({ date: lifespanLogs.date })
    .from(lifespanLogs)
    .where(eq(lifespanLogs.userId, userId))
    .orderBy(desc(lifespanLogs.date))
    .limit(60)
  let streak = 0
  let cursor = recent[0]?.date === today ? today : yesterday
  for (const row of recent) {
    if (row.date === cursor) {
      streak++
      cursor = new Date(new Date(cursor + "T12:00:00Z").getTime() - 86400000).toISOString().slice(0, 10)
    } else if (row.date < cursor) {
      break
    }
  }

  return {
    configured: true,
    birthDate,
    daysUsed,
    daysRemaining,
    percentUsed,
    effectiveDaysTotal: Math.round(Number(sumRow?.total ?? 0) / 10) / 10,
    yesterdayGain: yRow ? Math.round(yRow.effectiveDaysX100 / 10) / 10 : 0,
    todayScore: tRow?.qualityScore ?? null,
    streakDays: streak,
  }
}

// 今日质量分打分:0-100 → 有效寿命 = score/100 × 0.5 天
export async function recordTodayQuality(
  score: number,
  clientToday?: string,
): Promise<{ ok: boolean; gain?: number; error?: string }> {
  if (!Number.isFinite(score) || score < 0 || score > 100) return { ok: false, error: "分数需在 0-100 之间" }
  const userId = await getUserId()
  const date = todayStr(clientToday)
  const rounded = Math.round(score)
  const effectiveDaysX100 = Math.round((rounded / 100) * 0.5 * 100) // ×100 存整数

  const [existing] = await db
    .select({ id: lifespanLogs.id })
    .from(lifespanLogs)
    .where(and(eq(lifespanLogs.userId, userId), eq(lifespanLogs.date, date)))
  if (existing) {
    await db
      .update(lifespanLogs)
      .set({ qualityScore: rounded, effectiveDaysX100 })
      .where(and(eq(lifespanLogs.id, existing.id), eq(lifespanLogs.userId, userId)))
  } else {
    await db.insert(lifespanLogs).values({ userId, date, qualityScore: rounded, effectiveDaysX100 })
  }

  // 同步到节律日志质量分
  const [rhythmRow] = await db
    .select({ id: rhythmLogs.id })
    .from(rhythmLogs)
    .where(and(eq(rhythmLogs.userId, userId), eq(rhythmLogs.date, date)))
  if (rhythmRow) {
    await db
      .update(rhythmLogs)
      .set({ qualityScore: rounded, updatedAt: new Date() })
      .where(and(eq(rhythmLogs.id, rhythmRow.id), eq(rhythmLogs.userId, userId)))
  }

  revalidatePath("/lifespan")
  revalidatePath("/night-ritual")
  return { ok: true, gain: effectiveDaysX100 / 100 }
}
