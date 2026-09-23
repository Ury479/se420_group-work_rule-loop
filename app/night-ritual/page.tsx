import type { Metadata } from "next"
import { Moon } from "lucide-react"
import { HudHeader } from "@/components/hud"
import { getLifespanSummary, getEntropyConfig } from "@/app/actions/lifespan"
import { getYesterdaySnapshot } from "@/app/actions/rhythm"
import { getPrincipleReminder } from "@/app/actions/entropy-principles"
import { NightRitualPanel } from "@/components/night-ritual-panel"

export const metadata: Metadata = { title: "夜间仪式" }

export default async function NightRitualPage() {
  const [summary, config, snapshot, principle] = await Promise.all([
    getLifespanSummary(),
    getEntropyConfig(),
    getYesterdaySnapshot(),
    getPrincipleReminder("night"),
  ])

  return (
    <main className="w-full">
      <HudHeader
        icon={Moon}
        tone="purple"
        eyebrow="Entropy · Night"
        title="夜间仪式"
        description="一天的最后一小时,决定明天的第一小时。选择一个供给渠道,然后安心睡去。"
      />
      <div className="mt-6">
        <NightRitualPanel
          summary={summary}
          modelTreeUrl={config.modelTreeUrl}
          reviewSentence={snapshot.reviewSentence}
          principle={principle ? { ruleText: principle.ruleText, principleText: principle.principleText } : null}
        />
      </div>
    </main>
  )
}
