"use server";

import { calendarToday, isCalendarDate } from "@/lib/calendar";
import { withAccount } from "@/lib/action";
import { getLifespanProgress } from "@/lib/lifespan-progress";

import { db } from "@/db";
import { lifespanLogs, userPreferences, rhythmLogs } from "@/db/schema";
import { getUserId } from "@/lib/user";
import { and, eq, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const BIRTH_DATE_KEY = "birth_date";
const MODEL_TREE_URL_KEY = "model_tree_url";

function todayStr(clientDate?: string): string {
  if (clientDate && isCalendarDate(clientDate)) return clientDate;
  return calendarToday();
}

function isBirthDateInRange(date: string, today: string): boolean {
  return date >= "1900-01-01" && date <= today;
}

async function getPrefValue(key: string): Promise<string | undefined> {
  const userId = await getUserId();
  const [row] = await db
    .select({ prefValue: userPreferences.prefValue })
    .from(userPreferences)
    .where(
      and(eq(userPreferences.userId, userId), eq(userPreferences.prefKey, key)),
    )
    .limit(1);
  return row?.prefValue;
}

function decodeStringPref(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

export type BirthDateState = {
  birthDate: string | null;
  hasStoredBirthDate: boolean;
};

async function getBirthDateState(): Promise<BirthDateState> {
  const raw = await getPrefValue(BIRTH_DATE_KEY);
  const value = decodeStringPref(raw);
  return {
    birthDate: value !== null && isCalendarDate(value) ? value : null,
    hasStoredBirthDate: raw !== undefined,
  };
}

async function setPref(key: string, value: string): Promise<void> {
  const userId = await getUserId();
  const prefValue = JSON.stringify(value);
  const [existing] = await db
    .select({ id: userPreferences.id })
    .from(userPreferences)
    .where(
      and(eq(userPreferences.userId, userId), eq(userPreferences.prefKey, key)),
    );
  if (existing) {
    await db
      .update(userPreferences)
      .set({ prefValue, updatedAt: new Date() })
      .where(
        and(
          eq(userPreferences.id, existing.id),
          eq(userPreferences.userId, userId),
        ),
      );
  } else {
    await db
      .insert(userPreferences)
      .values({ userId, prefKey: key, prefValue });
  }
}

// ── 配置 ──

export async function getEntropyConfig() {
  return withAccount(async () => {
    const birthDateState = await getBirthDateState();
    const modelTreeUrl = decodeStringPref(
      await getPrefValue(MODEL_TREE_URL_KEY),
    );
    return { ...birthDateState, modelTreeUrl };
  });
}

type BirthDateMutationResult =
  | { ok: true }
  | { ok: false; error: string; current?: BirthDateState };

function staleBirthDate(current: BirthDateState): BirthDateMutationResult {
  return { ok: false, error: "出生日期已在别处更新，请重新核对。", current };
}

function revalidateBirthDatePages() {
  revalidatePath("/");
  revalidatePath("/lifespan");
  revalidatePath("/dashboard");
  revalidatePath("/night-ritual");
  revalidatePath("/settings");
}

export async function saveBirthDate(
  birthDate: string,
  expectedBirthDate?: string | null,
): Promise<BirthDateMutationResult> {
  return withAccount(async () => {
    if (typeof birthDate !== "string" || !isCalendarDate(birthDate))
      return { ok: false, error: "日期格式无效" };
    if (!isBirthDateInRange(birthDate, calendarToday())) {
      return { ok: false, error: "日期无效" };
    }

    const current = await getBirthDateState();
    if (birthDate !== current.birthDate) {
      if (
        expectedBirthDate !== undefined &&
        expectedBirthDate !== current.birthDate
      )
        return staleBirthDate(current);
      await setPref(BIRTH_DATE_KEY, birthDate);
    }
    revalidateBirthDatePages();
    return { ok: true };
  });
}

export async function removeBirthDate(
  expectedBirthDate: string | null,
): Promise<BirthDateMutationResult> {
  return withAccount(async () => {
    const current = await getBirthDateState();
    if (current.hasStoredBirthDate) {
      if (current.birthDate !== expectedBirthDate)
        return staleBirthDate(current);
      const userId = await getUserId();
      await db
        .delete(userPreferences)
        .where(
          and(
            eq(userPreferences.userId, userId),
            eq(userPreferences.prefKey, BIRTH_DATE_KEY),
          ),
        );
    }
    revalidateBirthDatePages();
    return { ok: true };
  });
}

export async function saveModelTreeUrl(
  url: string,
): Promise<{ ok: boolean; error?: string }> {
  return withAccount(async () => {
    const trimmed = url.trim();
    if (trimmed.length > 500) return { ok: false, error: "URL 过长" };
    if (trimmed && !/^https?:\/\//.test(trimmed))
      return { ok: false, error: "请输入 http(s) 链接" };
    await setPref(MODEL_TREE_URL_KEY, trimmed);
    revalidatePath("/night-ritual");
    revalidatePath("/settings");
    return { ok: true };
  });
}

// ── 寿命计算 ──

async function getAccountLifespanProgress(today: string) {
  const { birthDate } = await getBirthDateState();
  if (!birthDate || !isBirthDateInRange(birthDate, today)) return null;

  return { birthDate, progress: getLifespanProgress(birthDate, today) };
}

export async function getLifespanOverview(): Promise<{
  weeksRemaining: number;
  daysRemaining: number;
} | null> {
  return withAccount(async () => {
    const lifespan = await getAccountLifespanProgress(todayStr());
    if (!lifespan) return null;

    const { weeksRemaining, daysRemaining } = lifespan.progress;
    return { weeksRemaining, daysRemaining };
  });
}

export type LifespanSummary = ReturnType<typeof getLifespanProgress> & {
  configured: boolean;
  today: string;
  birthDate: string | null;
  effectiveDaysTotal: number; // 累计有效寿命(天,保留 1 位小数)
  yesterdayGain: number; // 昨日 +X.X 天
  todayScore: number | null;
  streakDays: number; // 连续打分天数
};

export async function getLifespanSummary(
  clientToday?: string,
): Promise<LifespanSummary> {
  return withAccount(async () => {
    const userId = await getUserId();
    const today = todayStr(clientToday);
    const lifespan = await getAccountLifespanProgress(today);

    const progress = lifespan?.progress ?? {
      daysUsed: 0,
      daysRemaining: 0,
      weeksRemaining: 0,
      percentUsed: 0,
      completedSlots: 0,
      currentYear: null,
    };

    const now = new Date(today + "T00:00:00Z");
    const [sumRow] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${lifespanLogs.effectiveDaysX100}), 0)`,
      })
      .from(lifespanLogs)
      .where(eq(lifespanLogs.userId, userId));

    const yesterday = new Date(now.getTime() - 86400000)
      .toISOString()
      .slice(0, 10);
    const [yRow] = await db
      .select()
      .from(lifespanLogs)
      .where(
        and(eq(lifespanLogs.userId, userId), eq(lifespanLogs.date, yesterday)),
      );
    const [tRow] = await db
      .select()
      .from(lifespanLogs)
      .where(
        and(eq(lifespanLogs.userId, userId), eq(lifespanLogs.date, today)),
      );

    // 连续打分天数:从今天(或昨天)往前数连续存在的记录
    const recent = await db
      .select({ date: lifespanLogs.date })
      .from(lifespanLogs)
      .where(eq(lifespanLogs.userId, userId))
      .orderBy(desc(lifespanLogs.date))
      .limit(60);
    let streak = 0;
    let cursor = recent[0]?.date === today ? today : yesterday;
    for (const row of recent) {
      if (row.date === cursor) {
        streak++;
        cursor = new Date(new Date(cursor + "T12:00:00Z").getTime() - 86400000)
          .toISOString()
          .slice(0, 10);
      } else if (row.date < cursor) {
        break;
      }
    }

    return {
      configured: lifespan !== null,
      today,
      birthDate: lifespan?.birthDate ?? null,
      ...progress,
      effectiveDaysTotal: Math.round(Number(sumRow?.total ?? 0) / 10) / 10,
      yesterdayGain: yRow ? Math.round(yRow.effectiveDaysX100 / 10) / 10 : 0,
      todayScore: tRow?.qualityScore ?? null,
      streakDays: streak,
    };
  });
}

// 今日质量分打分:0-100 → 有效寿命 = score/100 × 0.5 天
export async function recordTodayQuality(
  score: number,
  expectedDate: string,
): Promise<{ ok: boolean; gain?: number; error?: string }> {
  return withAccount(async () => {
    if (!Number.isFinite(score) || score < 0 || score > 100)
      return { ok: false, error: "分数需在 0-100 之间" };
    const date = calendarToday();
    if (expectedDate !== date)
      return { ok: false, error: "日期已切换，请刷新页面后为今天打分。" };

    const userId = await getUserId();
    const rounded = Math.round(score);
    const effectiveDaysX100 = Math.round((rounded / 100) * 0.5 * 100); // ×100 存整数

    const [existing] = await db
      .select({ id: lifespanLogs.id })
      .from(lifespanLogs)
      .where(and(eq(lifespanLogs.userId, userId), eq(lifespanLogs.date, date)));
    if (existing) {
      await db
        .update(lifespanLogs)
        .set({ qualityScore: rounded, effectiveDaysX100 })
        .where(
          and(
            eq(lifespanLogs.id, existing.id),
            eq(lifespanLogs.userId, userId),
          ),
        );
    } else {
      await db
        .insert(lifespanLogs)
        .values({ userId, date, qualityScore: rounded, effectiveDaysX100 });
    }

    // 同步到节律日志质量分
    const [rhythmRow] = await db
      .select({ id: rhythmLogs.id })
      .from(rhythmLogs)
      .where(and(eq(rhythmLogs.userId, userId), eq(rhythmLogs.date, date)));
    if (rhythmRow) {
      await db
        .update(rhythmLogs)
        .set({ qualityScore: rounded, updatedAt: new Date() })
        .where(
          and(eq(rhythmLogs.id, rhythmRow.id), eq(rhythmLogs.userId, userId)),
        );
    }

    revalidatePath("/");
    revalidatePath("/lifespan");
    revalidatePath("/night-ritual");
    return { ok: true, gain: effectiveDaysX100 / 100 };
  });
}
