import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RiskBadge, DomainBadge, StatusBadge } from "@/components/badges"
import type { CriticalConfirmation } from "@/lib/db/schema"
import { CalendarClock, TriangleAlert, ArrowRight, NotebookPen, Flame, FilePlus2 } from "lucide-react"

function formatTime(date: Date | null) {
  if (!date) return null
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function ConfirmationCard({ confirmation }: { confirmation: CriticalConfirmation }) {
  const time = formatTime(confirmation.deadline ?? confirmation.eventTime)
  const isDone = ["confirmed", "reviewed"].includes(confirmation.status)

  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-3 px-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <DomainBadge domain={confirmation.domain} />
          <RiskBadge risk={confirmation.riskLevel} />
          <StatusBadge status={confirmation.status} />
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold leading-snug text-pretty">
            {confirmation.title}
          </h3>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            {time && (
              <span className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
                {time}
              </span>
            )}
            {confirmation.likelyMistake && (
              <span className="flex items-center gap-1.5">
                <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
                最容易错:{confirmation.likelyMistake}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isDone && confirmation.status !== "failed" && (
            <Button
              size="sm"
              className="flex-1 md:flex-none"
              nativeButton={false}
              render={<Link href={`/critical-confirmations/${confirmation.id}/check`} />}
            >
              进入 90% 检查
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          )}
          {confirmation.status !== "reviewed" && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 md:flex-none"
              nativeButton={false}
              render={<Link href={`/reviews/new?confirmationId=${confirmation.id}`} />}
            >
              <NotebookPen className="size-4" aria-hidden="true" />
              记录复盘
            </Button>
          )}
          {isDone && (
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 text-muted-foreground md:flex-none"
              nativeButton={false}
              render={<Link href={`/critical-confirmations/${confirmation.id}/evidence`} />}
            >
              <FilePlus2 className="size-4" aria-hidden="true" />
              补充证据
            </Button>
          )}
          {confirmation.status === "failed" && (
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 md:flex-none"
              nativeButton={false}
              render={<Link href={`/ash-memos/new?confirmationId=${confirmation.id}`} />}
            >
              <Flame className="size-4" aria-hidden="true" />
              写灰烬备忘录
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
