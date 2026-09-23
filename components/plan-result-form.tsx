"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createCommunicationResult, updatePlanStatus } from "@/app/actions/people-resources"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { OUTCOME_STATUSES } from "@/lib/resource-types"

export function PlanResultForm({ planId }: { planId: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [outcomeStatus, setOutcomeStatus] = useState<string | null>(null)
  const [keyInformation, setKeyInformation] = useState("")
  const [confirmedCoreNeed, setConfirmedCoreNeed] = useState("")
  const [hypothesisResult, setHypothesisResult] = useState<"kept" | "revised" | "removed" | null>(null)
  const [nextAction, setNextAction] = useState("")
  const [feedbackRequired, setFeedbackRequired] = useState(false)
  const [reflection, setReflection] = useState("")

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await createCommunicationResult({
        communicationPlanId: planId,
        outcomeStatus,
        keyInformation: keyInformation.trim() || null,
        confirmedCoreNeed: confirmedCoreNeed.trim() || null,
        hypothesisResult,
        nextAction: nextAction.trim() || null,
        feedbackRequired,
        worthContinuing: null,
        mainlineImpact: null,
        actualResourcesInvested: null,
        reflection: reflection.trim() || null,
      })
      if (res && "error" in res && res.error) {
        setError(res.error)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)} className="w-fit">
        记录沟通结果
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-1.5">
        <Label>结果状态</Label>
        <div role="group" aria-label="结果状态" className="scrollbar-none flex gap-1.5 overflow-x-auto py-0.5">
          {OUTCOME_STATUSES.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={outcomeStatus === o.value}
              onClick={() => setOutcomeStatus(o.value)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                outcomeStatus === o.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cr-info">获得的结论 / 重要信息</Label>
        <Textarea
          id="cr-info"
          value={keyInformation}
          onChange={(e) => setKeyInformation(e.target.value)}
          placeholder="本次沟通获得了什么"
          className="min-h-16"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cr-need">确认的对方真正关注点</Label>
        <Input
          id="cr-need"
          value={confirmedCoreNeed}
          onChange={(e) => setConfirmedCoreNeed(e.target.value)}
          placeholder="沟通中验证到的对方核心诉求"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>诉求假设验证结果</Label>
        <div role="group" aria-label="假设验证结果" className="flex gap-1.5">
          {(
            [
              { value: "kept", label: "假设成立" },
              { value: "revised", label: "需要修正" },
              { value: "removed", label: "假设推翻" },
            ] as const
          ).map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={hypothesisResult === o.value}
              onClick={() => setHypothesisResult(o.value)}
              className={cn(
                "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                hypothesisResult === o.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cr-next">我的下一步动作</Label>
        <Input id="cr-next" value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="例:本周五前反馈结果" />
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={feedbackRequired}
        onClick={() => setFeedbackRequired((v) => !v)}
        className={cn(
          "flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors",
          feedbackRequired ? "border-warning/50 bg-warning/10 text-warning-foreground" : "border-border bg-background text-muted-foreground"
        )}
      >
        <span>对方提供了帮助,需要后续回馈</span>
        <span className="text-xs font-medium">{feedbackRequired ? "是" : "否"}</span>
      </button>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cr-reflection">复盘(可选)</Label>
        <Textarea
          id="cr-reflection"
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="这次沟通做对了什么,下次改进什么"
          className="min-h-16"
        />
      </div>

      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={isPending}>
          {isPending ? "保存中…" : "保存结果"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
          取消
        </Button>
      </div>
    </div>
  )
}

export function ClosePlanButton({ planId }: { planId: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function close() {
    startTransition(async () => {
      await updatePlanStatus(planId, "closed")
      router.refresh()
    })
  }

  return (
    <Button variant="ghost" size="sm" onClick={close} disabled={isPending} className="text-muted-foreground">
      关闭计划
    </Button>
  )
}
