import Link from "next/link"
import type { ExecutionBoundary } from "@/lib/db/schema"
import { cn } from "@/lib/utils"

export const DECISION_LABELS: Record<string, string> = {
  continue: "继续推进",
  validate_small: "小步验证",
  pause: "暂停",
  backlog: "Backlog",
  stop: "停止",
}

export const CONFIDENCE_LABELS: Record<string, string> = {
  high: "信息充分",
  medium: "信息部分充分",
  low: "信息不足",
  unknown: "信息不明",
}

export const SOURCE_LABELS: Record<string, string> = {
  task: "任务",
  demand: "需求",
  relationship: "人际",
  purchase: "消费",
  project: "项目",
  study: "学业",
  custom: "其他",
}

const decisionTone: Record<string, string> = {
  continue: "bg-secondary text-secondary-foreground",
  validate_small: "bg-accent text-accent-foreground",
  pause: "bg-accent text-accent-foreground",
  backlog: "bg-muted text-muted-foreground",
  stop: "bg-destructive/10 text-destructive",
}

export function BoundaryCard({ boundary }: { boundary: ExecutionBoundary }) {
  return (
    <Link
      href={`/boundaries/${boundary.id}`}
      className="flex flex-col gap-2 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent/50"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
          {SOURCE_LABELS[boundary.sourceType] ?? boundary.sourceType}
        </span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-xs font-medium",
            decisionTone[boundary.decision] ?? "bg-muted text-muted-foreground"
          )}
        >
          {DECISION_LABELS[boundary.decision] ?? boundary.decision}
        </span>
        <span className="text-xs text-muted-foreground">
          {CONFIDENCE_LABELS[boundary.informationConfidence]} · 时间盒 {boundary.timeboxMinutes} 分钟
        </span>
      </div>
      <p className="text-sm font-medium leading-snug text-pretty">{boundary.title}</p>
      <p className="line-clamp-1 text-xs text-muted-foreground">够用标准:{boundary.minimumDoneStandard}</p>
    </Link>
  )
}
