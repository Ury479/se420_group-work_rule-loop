import Link from "next/link"
import type { EventCase } from "@/lib/db/schema"
import { eventTypeLabel, sceneLabel, statusLabel } from "@/lib/event-library-types"
import { cn } from "@/lib/utils"

const statusTone: Record<string, string> = {
  searching: "bg-destructive/10 text-destructive",
  solved: "bg-accent text-accent-foreground",
  found: "bg-accent text-accent-foreground",
  lost: "bg-destructive/10 text-destructive",
  closed: "bg-muted text-muted-foreground",
}

export function EventCaseCard({ eventCase: c }: { eventCase: EventCase }) {
  const highRisk = c.status === "searching" || c.status === "lost"
  return (
    <Link
      href={`/event-library/${c.id}`}
      className={cn(
        "group/case shadow-card flex flex-col gap-2 rounded-xl border bg-card px-4 py-3.5 transition-colors hover:border-foreground/25",
        highRisk && "border-l-2 border-l-destructive/50"
      )}
    >
      <p className="line-clamp-2 text-sm font-medium leading-snug group-hover/case:underline">{c.title}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusTone[c.status] ?? "bg-muted text-muted-foreground")}>
          {statusLabel(c.status)}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {eventTypeLabel(c.eventType)}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {sceneLabel(c.scene)}
        </span>
        {!c.reviewed && (
          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground">
            待复盘
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        {c.itemName && <span>物品:{c.itemName}</span>}
        {c.searchMinutes > 0 && <span>{`寻找 ${c.searchMinutes} 分钟`}</span>}
        {c.moneyLoss > 0 && <span>{`损失 ${c.moneyLoss} 元`}</span>}
        <span>{c.createdAt.toISOString().slice(0, 10)}</span>
      </div>
    </Link>
  )
}
