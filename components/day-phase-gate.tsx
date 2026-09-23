"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Moon, Sunrise, ArrowRight } from "lucide-react"

type Phase = "night" | "morning" | "day"

function currentPhase(): Phase {
  const h = new Date().getHours()
  if (h >= 22 || h < 6) return "night"
  if (h >= 6 && h < 8) return "morning"
  return "day"
}

// 首页日夜分流卡:按本地时间显示夜间/晨间入口。?phase=night|morning 可强制预览。
export function DayPhaseGate() {
  const searchParams = useSearchParams()
  // 挂载后才计算时段,避免 SSR 与客户端时钟不一致导致水合错误
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  if (!mounted) return null

  const forced = searchParams.get("phase")
  const phase: Phase = forced === "night" || forced === "morning" ? forced : currentPhase()

  if (phase === "day") return null

  const isNight = phase === "night"
  const Icon = isNight ? Moon : Sunrise

  return (
    <section aria-labelledby="phase-gate-title" className="mb-5 mt-2">
      <Link
        href={isNight ? "/night-ritual" : "/morning-routine"}
        className="group flex min-h-14 items-center gap-4 rounded-xl border border-primary/40 bg-primary/5 px-5 py-4 transition-colors hover:border-primary hover:bg-primary/10"
      >
        <Icon className="size-8 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="phase-gate-title" className="font-serif text-xl leading-snug text-balance">
            {isNight ? "已是深夜,进入夜间仪式" : "早晨好,进入晨间启动"}
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            {isNight ? "选择一个供给渠道,记录入睡,给今天一个收尾。" : "今日第一任务与 25 分钟专注,从这里开始。"}
          </p>
        </div>
        <ArrowRight className="size-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </Link>
    </section>
  )
}
