import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Relationship } from "@/lib/db/schema"
import {
  RELATIONSHIP_TYPE_LABELS,
  RELATIONSHIP_STATUS_LABELS,
  NET_IMPACT_LABELS,
  NEXT_ACTION_LABELS,
  type RelationshipType,
  type RelationshipStatus,
  type NetImpact,
  type NextAction,
} from "@/lib/relationships"
import { cn } from "@/lib/utils"
import { MessageSquareWarning, NotebookPen, Flame, Clock } from "lucide-react"

const STATUS_STYLES: Record<string, string> = {
  long_term_maintain: "bg-success text-success-foreground",
  normal_contact: "bg-secondary text-secondary-foreground",
  observe_carefully: "bg-warning text-warning-foreground",
  boundary_needed: "bg-destructive text-destructive-foreground",
}

function formatDate(date: Date | null) {
  if (!date) return null
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(
    date
  )
}

export function RelationshipCard({ relationship }: { relationship: Relationship }) {
  const lastAt = formatDate(relationship.lastInteractionAt)
  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-3 px-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="font-mono text-xs">
            {RELATIONSHIP_TYPE_LABELS[
              relationship.relationshipType as RelationshipType
            ] ?? relationship.relationshipType}
          </Badge>
          <Badge
            className={cn(
              STATUS_STYLES[relationship.relationshipStatus] ?? "bg-secondary"
            )}
          >
            {RELATIONSHIP_STATUS_LABELS[
              relationship.relationshipStatus as RelationshipStatus
            ] ?? relationship.relationshipStatus}
          </Badge>
          <Badge variant="secondary">
            {NET_IMPACT_LABELS[relationship.netImpact as NetImpact] ??
              relationship.netImpact}
          </Badge>
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold leading-snug">
            <Link
              href={`/relationships/${relationship.id}`}
              className="hover:underline"
            >
              {relationship.personName}
            </Link>
          </h3>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span>
              下一步:
              {NEXT_ACTION_LABELS[relationship.nextAction as NextAction] ??
                relationship.nextAction}
            </span>
            {lastAt && (
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                最近互动 {lastAt}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="flex-1 md:flex-none"
            nativeButton={false}
            render={<Link href={`/relationships/${relationship.id}/check`} />}
          >
            <MessageSquareWarning className="size-4" aria-hidden="true" />
            沟通前检查
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 md:flex-none"
            nativeButton={false}
            render={<Link href={`/relationships/${relationship.id}/interactions`} />}
          >
            <NotebookPen className="size-4" aria-hidden="true" />
            记录互动
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 text-muted-foreground md:flex-none"
            nativeButton={false}
            render={<Link href={`/relationships/${relationship.id}/review`} />}
          >
            <Flame className="size-4" aria-hidden="true" />
            灰烬备忘录
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
