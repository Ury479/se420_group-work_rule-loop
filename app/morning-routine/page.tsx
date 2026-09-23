import type { Metadata } from "next"
import { Sunrise } from "lucide-react"
import { HudHeader } from "@/components/hud"
import { getYesterdaySnapshot, getRhythmTrend } from "@/app/actions/rhythm"
import { getPrincipleReminder, getTodayFirstTask } from "@/app/actions/entropy-principles"
import { MorningRoutinePanel } from "@/components/morning-routine-panel"

export const metadata: Metadata = { title: "晨间启动" }

export default async function MorningRoutinePage() {
  const [snapshot, trend, principle, firstTask] = await Promise.all([
    getYesterdaySnapshot(),
    getRhythmTrend(7),
    getPrincipleReminder("morning"),
    getTodayFirstTask(),
  ])

  return (
    <main className="w-full">
      <HudHeader
        icon={Sunrise}
        tone="gold"
        eyebrow="Entropy · Morning"
        title="晨间启动"
        description="不做选择,直接行动。今天的第一个 25 分钟,从这里开始。"
      />
      <div className="mt-6">
        <MorningRoutinePanel
          snapshot={{
            sleepTime: snapshot.sleepTime,
            wakeTime: snapshot.wakeTime,
            sleepHours: snapshot.sleepHours,
            recentWin: snapshot.recentWin,
            reviewSentence: snapshot.reviewSentence,
          }}
          trend={trend.map((t) => ({
            date: t.date,
            sleepTime: t.sleepTime,
            wakeTime: t.wakeTime,
            fatigueLevel: t.fatigueLevel,
          }))}
          principle={principle ? { ruleText: principle.ruleText, principleText: principle.principleText } : null}
          firstTask={firstTask}
        />
      </div>
    </main>
  )
}
