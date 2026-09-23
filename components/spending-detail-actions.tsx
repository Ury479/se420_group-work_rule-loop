"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { FINAL_DECISIONS } from "@/lib/spending-review-types"
import {
  deleteSpendingReview,
  recheckAfterCooling,
  saveFinalDecision,
} from "@/app/actions/spending-review"

// ── 冷静期重新检查 ──

export function CoolingRecheck({ reviewId, coolingUntil }: { reviewId: number; coolingUntil: string | null }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const coolingActive = coolingUntil ? new Date(coolingUntil) > new Date() : false

  function recheck(stillNeeded: boolean) {
    setError(null)
    startTransition(async () => {
      const res = await recheckAfterCooling(reviewId, stillNeeded)
      if (res.error) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {coolingActive ? (
        <p className="text-xs text-muted-foreground">
          冷静期至 {new Date(coolingUntil as string).toLocaleString("zh-CN")}。结束后重新回答:当前状态是否稳定?是否仍然需要?
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">冷静期已结束。请重新确认:</p>
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={isPending || coolingActive}
          onClick={() => recheck(true)}
          className="bg-card"
        >
          仍然需要,继续审核
        </Button>
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => recheck(false)}
        >
          不需要了,取消
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ── 最终人工决定 ──

export function FinalDecisionForm({ reviewId, nightWindow }: { reviewId: number; nightWindow: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [decision, setDecision] = useState<string>("")
  const [reason, setReason] = useState("")
  const [paid, setPaid] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function submit() {
    setError(null)
    if (!decision) {
      setError("请选择最终决定")
      return
    }
    if (nightWindow && decision === "confirm_pay") {
      setError("当前处于 20:00–04:00 高风险窗口,不完成最终付款确认。请保存草稿或延迟到第二天。")
      return
    }
    startTransition(async () => {
      const res = await saveFinalDecision({
        id: reviewId,
        finalDecision: decision as "cancel" | "delay" | "reduce_or_replace" | "confirm_pay",
        finalDecisionReason: reason || null,
        paymentCompleted: decision === "confirm_pay" ? paid : false,
      })
      if (res.error) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {FINAL_DECISIONS.map((d) => (
          <button
            key={d.value}
            type="button"
            aria-pressed={decision === d.value}
            onClick={() => setDecision(d.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              decision === d.value
                ? d.value === "confirm_pay"
                  ? "border-destructive/50 bg-destructive/10 text-destructive"
                  : "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground"
            )}
          >
            {d.label}
          </button>
        ))}
      </div>
      {decision === "confirm_pay" && (
        <div className="flex flex-col gap-2 rounded-lg bg-warning/10 p-3">
          <p className="text-xs text-warning-foreground">
            「进入最终人工确认」不等于批准付款。确认付款后,请在事后进行复盘。
          </p>
          <button
            type="button"
            aria-pressed={paid}
            onClick={() => setPaid(!paid)}
            className={cn(
              "w-fit rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              paid
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : "border-border bg-card text-muted-foreground"
            )}
          >
            {paid ? "已完成付款" : "尚未付款"}
          </button>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fd-reason">最终决定理由</Label>
        <Textarea id="fd-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button size="sm" onClick={submit} disabled={isPending} className="w-fit">
        保存最终决定
      </Button>
    </div>
  )
}

// ── 删除 ──

export function DeleteReviewButton({ reviewId }: { reviewId: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)

  function remove() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    startTransition(async () => {
      await deleteSpendingReview(reviewId)
      router.push("/spending-review")
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={remove}
      disabled={isPending}
      className="text-muted-foreground hover:text-destructive"
    >
      {confirming ? "再点一次确认删除" : "删除"}
    </Button>
  )
}
