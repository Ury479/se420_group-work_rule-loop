import Link from "next/link"
import { getEventCases, getLibraryStats } from "@/app/actions/event-library"
import { Button } from "@/components/ui/button"
import { EventCaseCard } from "@/components/event-case-card"
import { Plus, Search, Network, ScrollText, BarChart3, Archive } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function EventLibraryPage() {
  const [cases, stats] = await Promise.all([getEventCases(), getLibraryStats()])
  const pendingReview = cases.filter((c) => !c.reviewed)

  const statItems = [
    { label: "案例总数", value: String(stats.totalCases) },
    { label: "已解决", value: String(stats.solvedCases) },
    { label: "累计寻找", value: `${stats.totalSearchMinutes} 分钟` },
    { label: "累计损失", value: `${stats.totalMoneyLoss} 元` },
  ]

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">事件案例库</h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          把每一次事件沉淀为可复用的经验资产。事件 → 复盘 → 模式 → 规则 → 资产。
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href="/event-library/new" />}>
            <Plus className="size-4" aria-hidden="true" />
            我刚经历了一个事件
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/event-library/search" />}>
            <Search className="size-4" aria-hidden="true" />
            搜索
          </Button>
        </div>
      </section>

      {/* 统计摘要 */}
      <section aria-label="统计摘要" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {statItems.map((s) => (
          <div key={s.label} className="flex flex-col gap-0.5 rounded-lg border bg-card px-4 py-3">
            <span className="text-xs text-muted-foreground">{s.label}</span>
            <span className="text-lg font-semibold tabular-nums">{s.value}</span>
          </div>
        ))}
      </section>

      {/* 子页面入口 */}
      <nav aria-label="案例库导航" className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/event-library/patterns" />}>
          <Network className="size-4" aria-hidden="true" />
          模式
        </Button>
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/event-library/rules" />}>
          <ScrollText className="size-4" aria-hidden="true" />
          规则
        </Button>
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/event-library/statistics" />}>
          <BarChart3 className="size-4" aria-hidden="true" />
          统计
        </Button>
      </nav>

      {/* 待复盘提醒 */}
      {pendingReview.length > 0 && (
        <section className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          {/* 用模板串输出单个文本节点,整句才能被翻译规则命中 */}
          <p className="text-sm font-medium">
            {`有 ${pendingReview.length} 个事件还没有复盘。不复盘的事件不会变成资产。`}
          </p>
        </section>
      )}

      {/* 案例流 */}
      <section aria-label="案例列表" className="flex flex-col gap-3">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          全部案例 · {cases.length}
        </h2>
        {cases.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
            <Archive className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
              还没有案例。下次发生任何值得记住的事件,用 30 秒记录下来——所有损失都能转化为未来的决策能力。
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {cases.map((c) => (
              <EventCaseCard key={c.id} eventCase={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
