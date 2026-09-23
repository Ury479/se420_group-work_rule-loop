import Link from "next/link"
import { getLibraryStats, getSceneStats, getItemStats, getPatterns } from "@/app/actions/event-library"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function StatisticsPage() {
  const [stats, scenes, items, patterns] = await Promise.all([
    getLibraryStats(),
    getSceneStats(),
    getItemStats(),
    getPatterns(),
  ])

  const overview = [
    { label: "案例总数", value: String(stats.totalCases) },
    { label: "已解决", value: String(stats.solvedCases) },
    { label: "确认丢失", value: String(stats.lostCases) },
    { label: "已复盘", value: String(stats.reviewedCases) },
    { label: "累计寻找", value: `${stats.totalSearchMinutes} 分钟` },
    { label: "累计损失", value: `${stats.totalMoneyLoss} 元` },
    { label: "生效规则", value: String(stats.activeRules) },
    { label: "头号模式", value: stats.topPattern ?? "—" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/event-library"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回案例库
      </Link>

      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">统计</h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          所有数据自动聚合,不需要手动维护。
        </p>
      </section>

      <section aria-label="总览" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {overview.map((s) => (
          <div key={s.label} className="flex flex-col gap-0.5 rounded-lg border bg-card px-4 py-3">
            <span className="text-xs text-muted-foreground">{s.label}</span>
            <span className="truncate text-lg font-semibold tabular-nums">{s.value}</span>
          </div>
        ))}
      </section>

      {scenes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">高风险场景</h2>
          <div className="flex flex-col gap-1.5">
            {scenes.map((s) => (
              <div key={s.key} className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-sm">
                <span className="font-medium">{s.label}</span>
                <span className="text-xs text-muted-foreground">
                  {`${s.frequency} 次 · 寻找 ${s.totalSearchMinutes} 分钟 · 损失 ${s.totalMoneyLoss} 元`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {items.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">高风险物品</h2>
          <div className="flex flex-col gap-1.5">
            {items.map((s) => (
              <div key={s.key} className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-sm">
                <span className="font-medium">{s.label}</span>
                <span className="text-xs text-muted-foreground">
                  {`${s.frequency} 次 · 寻找 ${s.totalSearchMinutes} 分钟 · 损失 ${s.totalMoneyLoss} 元`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {patterns.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">模式排行</h2>
          <div className="flex flex-col gap-1.5">
            {patterns.map((p) => (
              <div key={p.rootCause} className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-sm">
                <span className="font-medium">{p.label}</span>
                <span className="text-xs text-muted-foreground">证据 {p.evidenceCount} 次</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
