"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { updateWeaknessEvent } from "@/app/actions/weakness"
import { WEAKNESS_LABELS, SEVERITY_LABELS, type WeaknessKey, type Severity } from "@/lib/weakness"
import type { WeaknessEvent } from "@/lib/db/schema"
import { Check, Eye } from "lucide-react"

export function WeaknessEventList({ events }: { events: WeaknessEvent[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function setStatus(eventId: number, status: "acknowledged" | "resolved") {
    startTransition(async () => {
      await updateWeaknessEvent({ eventId, status })
      router.refresh()
    })
  }

  return (
    <ul className="flex flex-col gap-2">
      {events.map((event) => (
        <li
          key={event.id}
          className="flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {WEAKNESS_LABELS[event.weaknessKey as WeaknessKey] ?? event.weaknessKey}
            </span>
            <span className="text-xs text-muted-foreground">
              风险 {SEVERITY_LABELS[event.severity as Severity] ?? event.severity}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            {event.triggerReason}
          </p>
          {event.recommendedIntervention && (
            <p className="text-sm leading-relaxed text-pretty">
              建议:{event.recommendedIntervention}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-transparent"
              disabled={isPending}
              onClick={() => setStatus(event.id, "acknowledged")}
            >
              <Eye className="size-4" aria-hidden="true" />
              已知晓
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => setStatus(event.id, "resolved")}
            >
              <Check className="size-4" aria-hidden="true" />
              已处理
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
