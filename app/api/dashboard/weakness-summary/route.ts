import { NextResponse } from "next/server"
import { detectTodayWeaknesses, getWeaknessStats } from "@/app/actions/weakness"
import { SYSTEM_MOTTO, WEAKNESS_LABELS, WEAKNESS_INTERVENTIONS, type WeaknessKey } from "@/lib/weakness"

export async function GET() {
  const [{ detected, lock, fallbackRule }, stats] = await Promise.all([
    detectTodayWeaknesses(),
    getWeaknessStats(),
  ])
  return NextResponse.json({
    motto: SYSTEM_MOTTO,
    todayRiskPattern: detected.map((d) => ({
      key: d.weaknessKey,
      label: WEAKNESS_LABELS[d.weaknessKey],
      severity: d.severity,
      triggerReason: d.triggerReason,
      recommendedIntervention: WEAKNESS_INTERVENTIONS[d.weaknessKey as WeaknessKey],
    })),
    p0Lock: lock,
    fallbackRule,
    last30DayStats: stats,
  })
}
