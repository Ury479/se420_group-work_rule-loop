import type { Metadata } from "next"
import { Hourglass } from "lucide-react"
import { getLifespanSummary } from "@/app/actions/lifespan"
import { LifespanPanel } from "@/components/lifespan-panel"
import { LifeWeeksHeatmap } from "@/components/life-weeks-heatmap"
import { HudHeader, StatusPill } from "@/components/hud"

export const metadata: Metadata = { title: "寿命倒计时" }

export default async function LifespanPage() {
  const summary = await getLifespanSummary()

  return (
    <main className="w-full">
      <HudHeader
        icon={Hourglass}
        tone="gold"
        eyebrow="Entropy · Lifespan"
        title="寿命倒计时"
        description="以 80 岁为基准。时间只会流逝,但高质量的一天,会为未来增加有效寿命。"
        action={
          summary.configured ? (
            <StatusPill tone={summary.todayScore !== null ? "green" : "red"} dot>
              {summary.todayScore !== null ? "今日已打分" : "今日未打分"}
            </StatusPill>
          ) : null
        }
      />
      <div className="mt-6 flex flex-col gap-6">
        <LifespanPanel initial={summary} />
        {summary.configured ? <LifeWeeksHeatmap daysUsed={summary.daysUsed} /> : null}
      </div>
    </main>
  )
}
