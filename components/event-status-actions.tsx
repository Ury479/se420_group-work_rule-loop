"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateEventStatus, deleteEventCase } from "@/app/actions/event-library"
import { Button } from "@/components/ui/button"
import { EVENT_STATUSES } from "@/lib/event-library-types"
import { cn } from "@/lib/utils"

export function EventStatusActions({ eventId, status }: { eventId: number; status: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function setStatus(next: string) {
    startTransition(async () => {
      await updateEventStatus(eventId, next)
      router.refresh()
    })
  }

  function remove() {
    if (!window.confirm("确定删除这个案例吗?复盘记录也会一起删除。")) return
    startTransition(async () => {
      await deleteEventCase(eventId)
      router.push("/event-library")
    })
  }

  return (
    <div className="flex items-center gap-2">
      <div
        role="group"
        aria-label="案例状态"
        className="scrollbar-none flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5"
      >
        {EVENT_STATUSES.map((s) => {
          const selected = status === s.value
          const danger = s.value === "lost"
          return (
            <button
              key={s.value}
              type="button"
              disabled={isPending}
              aria-pressed={selected}
              onClick={() => setStatus(s.value)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60",
                selected && danger
                  ? "border-warning/50 bg-warning/15 text-warning-foreground"
                  : selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          )
        })}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={remove}
        disabled={isPending}
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        删除
      </Button>
    </div>
  )
}
