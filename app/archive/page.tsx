import type { Metadata } from "next"
import Link from "next/link"
import { Landmark, Repeat2, ShieldCheck, TrendingUp, BookmarkCheck } from "lucide-react"
import { getArchiveStats, getArchiveTimeline, type ArchiveEntryKind } from "@/app/actions/archive"
import { HudHeader, HudPanel, StatusPill } from "@/components/hud"
import { ArchiveTimeline } from "@/components/archive-timeline"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "成长档案 | 关键动作拦截台",
  description: "用真实证据确认改变:事件、复盘、规则和验证实时生成的成长档案。",
}

const FILTERS: Array<{ value: ArchiveEntryKind | "all"; label: string }> = [
  { value: "all", label: "全部" },
  { value: "verify", label: "验证" },
  { value: "rule", label: "规则" },
  { value: "review", label: "复盘" },
  { value: "archive", label: "存档" },
]

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter: rawFilter } = await searchParams
  const filter = (FILTERS.some((f) => f.value === rawFilter) ? rawFilter : "all") as ArchiveEntryKind | "all"

  const [stats, timeline] = await Promise.all([getArchiveStats(30), getArchiveTimeline(filter)])

  return (
    <main className="flex w-full flex-col gap-6">
      <HudHeader
        icon={Landmark}
        tone="gold"
        eyebrow="RuleLoop · Archive"
        title="成长档案"
        description="用真实证据确认改变"
      />

      {/* 最近 30 天统计 */}
      <HudPanel>
        <div className="flex items-center justify-end">
          <StatusPill tone="muted">最近30天</StatusPill>
        </div>
        <div className="mt-2 grid grid-cols-3 divide-x divide-border">
          <div className="flex flex-col items-center gap-1.5 px-2 py-3 text-center">
            <Repeat2 className="size-6 text-destructive" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">重复事件</span>
            <span className="font-serif text-4xl leading-none tabular-nums text-destructive">{stats.repeatEvents}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 px-2 py-3 text-center">
            <ShieldCheck className="size-6 text-primary" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">有效规则</span>
            <span className="font-serif text-4xl leading-none tabular-nums text-primary">{stats.effectiveRules}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 px-2 py-3 text-center">
            <TrendingUp className="size-6 text-spirit" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">改善</span>
            <span className="font-serif text-4xl leading-none tabular-nums text-spirit">
              {stats.improvements}
              <span className="ml-1 font-sans text-sm text-muted-foreground">次</span>
            </span>
          </div>
        </div>
      </HudPanel>

      {/* 证据战报 */}
      <section aria-labelledby="archive-timeline-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="archive-timeline-title" className="flex items-center gap-2 font-serif text-xl font-semibold">
            <BookmarkCheck className="size-5 text-primary" aria-hidden="true" />
            证据战报
          </h2>
          {/* 筛选:URL searchParam,可分享、可返回 */}
          <nav aria-label="证据筛选" className="scrollbar-none flex items-center gap-1.5 overflow-x-auto">
            {FILTERS.map((f) => (
              <Link
                key={f.value}
                href={f.value === "all" ? "/archive" : `/archive?filter=${f.value}`}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  filter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "hud-tile text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-4">
          <ArchiveTimeline entries={timeline} />
        </div>
      </section>

      {/* 底部说明 */}
      <HudPanel className="flex items-center justify-center gap-2.5 py-3.5">
        <Landmark className="size-4 text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">档案由事件、复盘、规则和验证实时生成</p>
      </HudPanel>
    </main>
  )
}
