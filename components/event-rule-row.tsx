"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { updateRuleStatus, markRuleEffective } from "@/app/actions/event-library"
import type { EventCandidateRule } from "@/lib/db/schema"
import { RULE_STATUSES, sceneLabel, rootCauseLabel } from "@/lib/event-library-types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const statusTone: Record<string, string> = {
  candidate: "bg-accent text-accent-foreground",
  active: "bg-foreground text-background",
  archived: "bg-muted text-muted-foreground",
  rejected: "bg-destructive/10 text-destructive",
}

export function EventRuleRow({
  rule,
}: {
  rule: EventCandidateRule & { sourceCaseTitle: string | null }
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function setStatus(status: string) {
    startTransition(async () => {
      await updateRuleStatus(rule.id, status)
      router.refresh()
    })
  }

  function verify() {
    startTransition(async () => {
      await markRuleEffective(rule.id)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className={cn("rounded px-1.5 py-0.5 font-medium", statusTone[rule.status] ?? "bg-muted")}>
          {RULE_STATUSES.find((s) => s.value === rule.status)?.label ?? rule.status}
        </span>
        {rule.scene && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
            {sceneLabel(rule.scene)}
          </span>
        )}
        {rule.rootCause && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
            {rootCauseLabel(rule.rootCause)}
          </span>
        )}
        {rule.effectiveness > 0 && (
          <span className="text-muted-foreground">已验证 {rule.effectiveness} 次</span>
        )}
      </div>
      <p className="text-sm leading-relaxed">{rule.ruleText}</p>
      {rule.sourceCaseId && rule.sourceCaseTitle && (
        <Link
          href={`/event-library/${rule.sourceCaseId}`}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          支撑案例:{rule.sourceCaseTitle}
        </Link>
      )}
      <div className="flex flex-wrap gap-1.5">
        {rule.status === "candidate" && (
          <>
            <Button size="sm" variant="outline" onClick={() => setStatus("active")} disabled={isPending}>
              启用
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStatus("rejected")} disabled={isPending}>
              拒绝
            </Button>
          </>
        )}
        {rule.status === "active" && (
          <>
            <Button size="sm" variant="outline" onClick={verify} disabled={isPending}>
              今天守住了
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStatus("archived")} disabled={isPending}>
              归档
            </Button>
          </>
        )}
        {(rule.status === "archived" || rule.status === "rejected") && (
          <Button size="sm" variant="ghost" onClick={() => setStatus("candidate")} disabled={isPending}>
            恢复为候选
          </Button>
        )}
      </div>
    </div>
  )
}
