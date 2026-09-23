"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { Sunrise, ArrowRight, Target, BedDouble, Activity, BatteryLow, Trophy, Compass } from "lucide-react"
import { upsertRhythmLog } from "@/app/actions/rhythm"
import { PomodoroTimer } from "@/components/pomodoro-timer"
import { RhythmTrendChart } from "@/components/rhythm-trend-chart"
import { HudPanel, MeterBar, StatTile, StatusPill } from "@/components/hud"

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function nowHHmm(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export type TrendPoint = {
  date: string
  sleepTime: string | null
  wakeTime: string | null
  fatigueLevel: number | null
}

export function MorningRoutinePanel({
  snapshot,
  trend,
  principle,
  firstTask,
}: {
  snapshot: {
    sleepTime: string | null
    wakeTime: string | null
    sleepHours: number | null
    recentWin: string | null
    reviewSentence: string | null
  }
  trend: TrendPoint[]
  principle: { ruleText: string; principleText: string | null } | null
  firstTask: { id: number; title: string; priority: string; progress: number } | null
}) {
  const [isPending, startTransition] = useTransition()
  const [wakeRecorded, setWakeRecorded] = useState<string | null>(null)
  const [fatigue, setFatigue] = useState(5)
  const [fatigueSaved, setFatigueSaved] = useState(false)

  // 打点:晨间模式已使用
  useEffect(() => {
    upsertRhythmLog({ date: localToday(), morningModeUsed: true })
  }, [])

  return (
    <div className="flex flex-col gap-5">
      {/* 今日第一任务 + 番茄钟:整页唯一的主线 */}
      <HudPanel aria-labelledby="first-task-title" className="border-primary/45 p-5">
        <h2 id="first-task-title" className="flex items-center gap-2 text-sm text-primary">
          <Target className="size-4" aria-hidden="true" />
          今日第一任务
        </h2>
        {firstTask ? (
          <div className="mt-2">
            <p className="hud-glow font-serif text-2xl font-semibold leading-tight text-balance text-primary">
              {firstTask.title}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusPill tone="red" dot>
                {firstTask.priority}
              </StatusPill>
              <StatusPill tone="muted">进度 {firstTask.progress}%</StatusPill>
              <Link
                href="/tasks"
                className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                查看任务树
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            没有待办的 P0/P1 任务。
            <Link href="/tasks" className="underline underline-offset-4 transition-colors hover:text-primary">
              去任务树添加一条
            </Link>
          </p>
        )}
        <div className="mt-6 border-t border-border pt-5">
          <PomodoroTimer taskTitle={firstTask?.title} />
        </div>
      </HudPanel>

      {/* 昨日快照 */}
      <HudPanel aria-labelledby="snapshot-title" accent="blue" className="p-5">
        <h2 id="snapshot-title" className="flex items-center gap-2 text-lg font-semibold">
          <BedDouble className="size-5 text-info" aria-hidden="true" />
          昨日快照
        </h2>
        <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-background/40 py-3">
          <StatTile icon={BedDouble} tone="purple" label="入睡" value={snapshot.sleepTime ?? "—"} />
          <StatTile icon={Sunrise} tone="gold" label="起床" value={wakeRecorded ?? snapshot.wakeTime ?? "—"} />
          <StatTile
            icon={Activity}
            tone="blue"
            label="时长"
            value={snapshot.sleepHours ?? "—"}
            suffix={snapshot.sleepHours !== null ? "小时" : undefined}
          />
        </div>
        {snapshot.recentWin ? (
          <p className="mt-4 flex gap-2 rounded-lg border border-border bg-background/40 p-3 text-sm leading-relaxed">
            <Trophy className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            <span>
              <span className="text-muted-foreground">昨日小胜利 · </span>
              {snapshot.recentWin}
            </span>
          </p>
        ) : null}
        <button
          type="button"
          disabled={isPending || !!wakeRecorded}
          onClick={() => {
            const time = nowHHmm()
            startTransition(async () => {
              const res = await upsertRhythmLog({ date: localToday(), wakeTime: time, morningModeUsed: true })
              if (res.ok) setWakeRecorded(time)
            })
          }}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-primary/60 px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
        >
          <Sunrise className="size-4" aria-hidden="true" />
          {wakeRecorded ? `已记录起床 ${wakeRecorded}` : isPending ? "记录中…" : "记录起床时间"}
        </button>
      </HudPanel>

      {/* 原则提醒 */}
      {principle ? (
        <HudPanel aria-labelledby="principle-title" accent="purple" className="p-5">
          <h2 id="principle-title" className="flex items-center gap-2 text-sm text-spirit">
            <Compass className="size-4" aria-hidden="true" />
            今日原则
          </h2>
          <p className="mt-2 font-serif text-lg leading-relaxed text-pretty">{principle.ruleText}</p>
          {principle.principleText ? (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{principle.principleText}</p>
          ) : null}
        </HudPanel>
      ) : null}

      {/* 节律趋势 + 疲劳打分 */}
      <HudPanel aria-labelledby="trend-title" className="p-5">
        <h2 id="trend-title" className="flex items-center gap-2 text-lg font-semibold">
          <Activity className="size-5 text-muted-foreground" aria-hidden="true" />
          近 7 天节律
        </h2>
        <div className="mt-3">
          <RhythmTrendChart data={trend} />
        </div>
        <div className="mt-5 border-t border-border pt-4">
          <label htmlFor="fatigue" className="text-sm font-medium">
            当前疲劳度(1 精力充沛 – 10 极度疲惫)
          </label>
          <div className="mt-3">
            <MeterBar
              icon={BatteryLow}
              label="疲劳"
              tone={fatigue >= 8 ? "red" : fatigue >= 5 ? "gold" : "green"}
              value={fatigue}
              max={10}
              valueLabel={`${fatigue}/10`}
            />
          </div>
          <div className="mt-3 flex items-center gap-4">
            <input
              id="fatigue"
              type="range"
              min={1}
              max={10}
              value={fatigue}
              onChange={(e) => {
                setFatigue(Number(e.target.value))
                setFatigueSaved(false)
              }}
              className="flex-1 accent-primary"
            />
            <button
              type="button"
              disabled={isPending || fatigueSaved}
              onClick={() =>
                startTransition(async () => {
                  const res = await upsertRhythmLog({ date: localToday(), fatigueLevel: fatigue })
                  if (res.ok) setFatigueSaved(true)
                })
              }
              className="min-h-11 shrink-0 rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:border-primary/60 hover:text-primary disabled:opacity-50"
            >
              {fatigueSaved ? "已保存" : "保存"}
            </button>
          </div>
        </div>
      </HudPanel>
    </div>
  )
}
