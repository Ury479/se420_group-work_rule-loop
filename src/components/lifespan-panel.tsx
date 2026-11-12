"use client";
import { reportActionError } from "@/components/action-feedback";

import { useState, useTransition, type ReactNode } from "react";
import {
  CalendarClock,
  Flame,
  Gauge,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  saveBirthDate,
  recordTodayQuality,
  type LifespanSummary,
} from "@/app/actions/lifespan";
import { useRouter } from "next/navigation";
import { HudPanel, MeterBar, StatTile } from "@/components/hud";
import { LIFESPAN_REFERENCE_YEARS } from "@/lib/lifespan-progress";

export function LifespanPanel({
  initial,
  children,
}: {
  initial: LifespanSummary;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [birthInput, setBirthInput] = useState("");
  const [score, setScore] = useState(initial.todayScore ?? 60);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── 未配置生日:内联引导 ──
  if (!initial.configured) {
    return (
      <>
        <HudPanel aria-labelledby="setup-title" accent="gold" className="p-5">
          <h2 id="setup-title" className="font-serif text-xl">
            先设置你的出生日期
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {`设置后按出生日期的 ${LIFESPAN_REFERENCE_YEARS} 周年显示剩余天数与整周。`}
          </p>
          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              startTransition(async () => {
                try {
                  const res = await saveBirthDate(birthInput);
                  if (!res.ok) setError(res.error ?? "保存失败");
                  else router.refresh();
                } catch {
                  reportActionError();
                }
              });
            }}
          >
            <label className="sr-only" htmlFor="birth-date">
              出生日期
            </label>
            <input
              id="birth-date"
              type="date"
              required
              value={birthInput}
              onChange={(e) => setBirthInput(e.target.value)}
              className="min-h-11 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
            />
            <button
              type="submit"
              disabled={isPending || !birthInput}
              className="hud-cta min-h-11 rounded-lg px-5 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "保存中…" : "开始倒计时"}
            </button>
          </form>
          {error ? (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </HudPanel>
        {children}
      </>
    );
  }

  const percent = initial.percentUsed;
  const gain = ((score / 100) * 0.5).toFixed(2);

  return (
    <div className="flex flex-col gap-5">
      {/* 大字数据:整页的情感锚点 */}
      <HudPanel
        aria-labelledby="countdown-title"
        className="border-primary/45 p-5"
      >
        <h2
          id="countdown-title"
          className="flex items-center gap-2 text-sm text-primary"
        >
          <CalendarClock className="size-4" aria-hidden="true" />
          剩余天数
        </h2>
        <p className="hud-glow mt-1 font-serif text-6xl font-medium leading-none tracking-tight tabular-nums text-primary">
          {initial.daysRemaining.toLocaleString()}
        </p>
        <div className="mt-5">
          <MeterBar
            icon={Gauge}
            label="人生进度"
            tone="gold"
            value={percent}
            max={100}
            valueLabel={`${percent}%`}
          />
        </div>
        <dl className="mt-5 grid grid-cols-2 divide-x divide-border border-t border-border pt-4">
          <div className="px-2">
            <dt className="text-xs text-muted-foreground">已用天数</dt>
            <dd className="mt-1 font-serif text-2xl leading-none tabular-nums">
              {initial.daysUsed.toLocaleString()}
            </dd>
          </div>
          <div className="px-2">
            <dt className="text-xs text-muted-foreground">剩余整周</dt>
            <dd className="mt-1 font-serif text-2xl leading-none tabular-nums">
              {initial.weeksRemaining.toLocaleString()}
            </dd>
          </div>
        </dl>
      </HudPanel>

      {children}

      <HudPanel
        aria-labelledby="effective-title"
        accent="green"
        className="p-5"
      >
        <h2
          id="effective-title"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <TrendingUp className="size-5 text-success" aria-hidden="true" />
          质量积分
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          记录每日自评的变化，积分与倒计时分别计算。
        </p>
        <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-background/40 py-3">
          <StatTile
            icon={Sparkles}
            tone="green"
            label="昨日"
            value={`+${initial.yesterdayGain}`}
            suffix="分"
          />
          <StatTile
            icon={Flame}
            tone="gold"
            label="连续天数"
            value={initial.streakDays}
            suffix="天"
          />
          <StatTile
            icon={TrendingUp}
            tone="blue"
            label="累计"
            value={initial.effectiveDaysTotal}
            suffix="分"
          />
        </div>
      </HudPanel>

      {/* 今日打分:金色主行动 */}
      <HudPanel aria-labelledby="score-title" className="p-5">
        <h2
          id="score-title"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <Gauge className="size-5 text-primary" aria-hidden="true" />
          今日质量分
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          按 0–100 为今天的专注与产出打分。满分记 0.5 积分。
        </p>
        <div className="mt-4 flex items-center gap-4">
          <label className="sr-only" htmlFor="quality-score">
            今日质量分
          </label>
          <input
            id="quality-score"
            type="range"
            min={0}
            max={100}
            step={5}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="flex w-20 flex-col items-end">
            <span className="font-serif text-2xl leading-none tabular-nums text-primary">
              {score}
            </span>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              +{gain} 积分
            </span>
          </span>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setFeedback(null);
            setError(null);
            startTransition(async () => {
              try {
                const res = await recordTodayQuality(score, initial.today);
                if (!res.ok) setError(res.error ?? "保存失败");
                else {
                  setFeedback(
                    `已记录。你今天的质量积分为 ${res.gain?.toFixed(2)}。`,
                  );
                  router.refresh();
                }
              } catch {
                reportActionError();
              }
            });
          }}
          className="hud-cta mt-5 flex min-h-14 w-full items-center justify-center rounded-lg px-5 text-base font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending
            ? "记录中…"
            : initial.todayScore !== null
              ? "更新今日打分"
              : "记录今日打分"}
        </button>
        {feedback ? (
          <p role="status" className="mt-3 text-sm text-success">
            {feedback}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </HudPanel>
    </div>
  );
}
