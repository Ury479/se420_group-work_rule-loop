"use server"

import { db } from "@/lib/db"
import { rhythmLogs, eventReviews, mistakeReviews, eventCases } from "@/lib/db/schema"
import { getUserId } from "@/lib/user"
import { and, eq, desc, gte } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// 本地日期 YYYY-MM-DD(客户端传入优先;服务端仅作 fallback)
function todayStr(clientDate?: string): string {
  if (clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate)) return clientDate
  return new Date().toISOString().slice(0, 10)
}

export type RhythmUpsert = {
  date?: string
  sleepTime?: string
  wakeTime?: string
  fatigueLevel?: number
  qualityScore?: number
  note?: string
  nightModeUsed?: boolean
  morningModeUsed?: boolean
}

// 按 (userId, date) upsert 节律日志
export async function upsertRhythmLog(data: RhythmUpsert): Promise<{ ok: boolean; error?: string }> {
  const userId = await getUserId()
  const date = todayStr(data.date)

  if (data.fatigueLevel !== undefined && (data.fatigueLevel < 1 || data.fatigueLevel > 10)) {
    return { ok: false, error: "疲劳等级需在 1-10 之间" }
  }
  if (data.qualityScore !== undefined && (data.qualityScore < 0 || data.qualityScore > 100)) {
    return { ok: false, error: "质量分需在 0-100 之间" }
  }
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/
  if (data.sleepTime && !timePattern.test(data.sleepTime)) return { ok: false, error: "入睡时间格式无效" }
  if (data.wakeTime && !timePattern.test(data.wakeTime)) return { ok: false, error: "起床时间格式无效" }
  if (data.note && data.note.length > 2000) return { ok: false, error: "备注过长" }

  const [existing] = await db
    .select({ id: rhythmLogs.id })
    .from(rhythmLogs)
    .where(and(eq(rhythmLogs.userId, userId), eq(rhythmLogs.date, date)))

  const values = {
    ...(data.sleepTime !== undefined && { sleepTime: data.sleepTime }),
    ...(data.wakeTime !== undefined && { wakeTime: data.wakeTime }),
    ...(data.fatigueLevel !== undefined && { fatigueLevel: data.fatigueLevel }),
    ...(data.qualityScore !== undefined && { qualityScore: data.qualityScore }),
    ...(data.note !== undefined && { note: data.note }),
    ...(data.nightModeUsed !== undefined && { nightModeUsed: data.nightModeUsed }),
    ...(data.morningModeUsed !== undefined && { morningModeUsed: data.morningModeUsed }),
    updatedAt: new Date(),
  }

  if (existing) {
    await db
      .update(rhythmLogs)
      .set(values)
      .where(and(eq(rhythmLogs.id, existing.id), eq(rhythmLogs.userId, userId)))
  } else {
    await db.insert(rhythmLogs).values({ userId, date, ...values })
  }

  revalidatePath("/night-ritual")
  revalidatePath("/morning-routine")
  revalidatePath("/lifespan")
  return { ok: true }
}

// 近 N 天节律数组(升序,趋势图用)
export async function getRhythmTrend(days = 7) {
  const userId = await getUserId()
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
  const rows = await db
    .select()
    .from(rhythmLogs)
    .where(and(eq(rhythmLogs.userId, userId), gte(rhythmLogs.date, since)))
    .orderBy(rhythmLogs.date)
  return rows
}

// 昨日快照:入睡/起床/时长 + 最近复盘一句话
export async function getYesterdaySnapshot(clientToday?: string) {
  const userId = await getUserId()
  const today = todayStr(clientToday)
  const yesterday = new Date(new Date(today + "T12:00:00Z").getTime() - 86400000).toISOString().slice(0, 10)

  const [log] = await db
    .select()
    .from(rhythmLogs)
    .where(and(eq(rhythmLogs.userId, userId), eq(rhythmLogs.date, yesterday)))

  // 睡眠时长(入睡在昨晚,起床在今天记录里)
  const [todayLog] = await db
    .select()
    .from(rhythmLogs)
    .where(and(eq(rhythmLogs.userId, userId), eq(rhythmLogs.date, today)))

  let sleepHours: number | null = null
  const sleepAt = log?.sleepTime
  const wakeAt = todayLog?.wakeTime ?? log?.wakeTime
  if (sleepAt && wakeAt) {
    const [sh, sm] = sleepAt.split(":").map(Number)
    const [wh, wm] = wakeAt.split(":").map(Number)
    let minutes = wh * 60 + wm - (sh * 60 + sm)
    if (minutes <= 0) minutes += 24 * 60 // 跨天
    sleepHours = Math.round((minutes / 60) * 10) / 10
  }

  // 最近一条复盘句子:优先事件复盘的 system_rule / lesson
  const [recentEventReview] = await db
    .select({ text: eventReviews.systemRule, what: eventReviews.whatHappened, createdAt: eventReviews.createdAt })
    .from(eventReviews)
    .where(eq(eventReviews.userId, userId))
    .orderBy(desc(eventReviews.createdAt))
    .limit(1)
  const [recentMistake] = await db
    .select({ text: mistakeReviews.lessonStatement, createdAt: mistakeReviews.createdAt })
    .from(mistakeReviews)
    .where(eq(mistakeReviews.userId, userId))
    .orderBy(desc(mistakeReviews.createdAt))
    .limit(1)

  let reviewSentence: string | null = null
  const a = recentEventReview?.createdAt?.getTime() ?? 0
  const b = recentMistake?.createdAt?.getTime() ?? 0
  if (a >= b && recentEventReview) reviewSentence = recentEventReview.text || recentEventReview.what
  else if (recentMistake) reviewSentence = recentMistake.text

  // 昨日小胜利:昨天完成复盘的事件数
  const recentCases = await db
    .select({ id: eventCases.id, title: eventCases.title, updatedAt: eventCases.updatedAt })
    .from(eventCases)
    .where(and(eq(eventCases.userId, userId), eq(eventCases.reviewed, true)))
    .orderBy(desc(eventCases.updatedAt))
    .limit(1)

  return {
    yesterday,
    sleepTime: sleepAt ?? null,
    wakeTime: wakeAt ?? null,
    sleepHours,
    fatigueLevel: todayLog?.fatigueLevel ?? log?.fatigueLevel ?? null,
    reviewSentence,
    recentWin: recentCases[0]?.title ?? null,
    todayLog: todayLog ?? null,
  }
}
