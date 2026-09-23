import Link from "next/link"
import { ArrowRight, Archive, BrainCircuit, CalendarDays, FileText, ScrollText, ShieldCheck, TriangleAlert } from "lucide-react"
import type { ArchiveEntry, ArchiveEntryKind } from "@/app/actions/archive"
import { cn } from "@/lib/utils"

// 证据战报时间线:左侧节点图标 + 中间事件卡 + 右侧来源卡。
// 四类证据的节点造型对齐参考稿:绿盾=验证、金卷轴=规则、紫菱形=复盘、灰圆=存档。

const KIND_META: Record<
  ArchiveEntryKind,
  { tone: string; nodeClass: string; icon: typeof ShieldCheck; sourceIcon: typeof FileText }
> = {
  verify: {
    tone: "text-success",
    nodeClass: "border-success/60 bg-success/10 rounded-xl",
    icon: ShieldCheck,
    sourceIcon: FileText,
  },
  rule: {
    tone: "text-primary",
    nodeClass: "border-primary/60 bg-primary/10 rounded-lg",
    icon: ScrollText,
    sourceIcon: TriangleAlert,
  },
  review: {
    tone: "text-spirit",
    nodeClass: "border-spirit/60 bg-spirit/10 rotate-45 rounded-lg",
    icon: BrainCircuit,
    sourceIcon: FileText,
  },
  archive: {
    tone: "text-muted-foreground",
    nodeClass: "border-border bg-muted/40 rounded-full",
    icon: Archive,
    sourceIcon: CalendarDays,
  },
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function ArchiveTimeline({ entries }: { entries: ArchiveEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        还没有证据记录。先去记录一个事件、完成一次复盘,档案会在这里实时生成。
      </div>
    )
  }

  return (
    <ol className="flex flex-col gap-0">
      {entries.map((entry, index) => {
        const meta = KIND_META[entry.kind]
        const NodeIcon = meta.icon
        const SourceIcon = meta.sourceIcon
        const isLast = index === entries.length - 1
        return (
          <li key={`${entry.kind}-${entry.href}-${entry.date}`} className="flex gap-3">
            {/* 左侧节点 + 竖向连接线 */}
            <div className="flex w-12 shrink-0 flex-col items-center">
              <span
                className={cn("flex size-11 items-center justify-center border", meta.nodeClass, meta.tone)}
                aria-hidden="true"
              >
                <NodeIcon className={cn("size-5", entry.kind === "review" && "-rotate-45")} />
              </span>
              {!isLast ? <span className="w-px flex-1 bg-border" aria-hidden="true" /> : null}
            </div>

            {/* 事件卡 + 来源卡 */}
            <div className="flex min-w-0 flex-1 flex-col gap-2 pb-5 sm:flex-row sm:items-stretch sm:gap-0">
              <Link
                href={entry.href}
                className="hud-tile flex min-w-0 flex-1 flex-col gap-1 rounded-xl p-3.5 transition-colors hover:bg-muted/40"
              >
                <span className={cn("text-sm font-semibold", meta.tone)}>{formatDate(entry.date)}</span>
                <span className="text-base font-semibold leading-snug text-pretty">{entry.title}</span>
                <span className={cn("text-xs", entry.kind === "archive" ? "text-muted-foreground" : meta.tone)}>
                  {entry.subtitle}
                </span>
              </Link>

              <span className="hidden items-center px-2 text-muted-foreground sm:flex" aria-hidden="true">
                <ArrowRight className="size-4" />
              </span>

              <div className="hud-tile flex w-full shrink-0 flex-col gap-1.5 rounded-xl p-3.5 sm:w-44">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <SourceIcon className={cn("size-4", meta.tone)} aria-hidden="true" />
                  来源
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">{entry.sourceLabel}</span>
                {entry.sourceBadge === "verified" ? (
                  <span className="inline-flex w-fit rounded-md border border-success/40 bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                    验证通过
                  </span>
                ) : null}
                {entry.sourceBadge === "high_impact" ? (
                  <span className="inline-flex w-fit rounded-md border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    高影响事件
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
