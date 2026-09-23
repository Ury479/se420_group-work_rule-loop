"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { GPT_CONCLUSIONS } from "@/lib/spending-review-types"
import { saveGptResult } from "@/app/actions/spending-review"

export function GptResultForm({ reviewId }: { reviewId: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [conclusion, setConclusion] = useState<string>("")
  const [mainReason, setMainReason] = useState("")
  const [risks, setRisks] = useState("")
  const [alternatives, setAlternatives] = useState("")
  const [coolingPeriod, setCoolingPeriod] = useState("")
  const [rawResponse, setRawResponse] = useState("")

  function submit() {
    setError(null)
    if (!conclusion) {
      setError("请选择 GPT 审核结论")
      return
    }
    startTransition(async () => {
      const res = await saveGptResult({
        spendingReviewId: reviewId,
        conclusion: conclusion as "cancel" | "delay" | "reduce_or_replace" | "manual_confirmation",
        mainReason: mainReason || null,
        risks: risks || null,
        alternatives: alternatives || null,
        suggestedCoolingPeriod: coolingPeriod || null,
        rawResponse: rawResponse || null,
      })
      if ("error" in res && res.error) {
        setError(res.error)
        return
      }
      router.push(`/spending-review/${reviewId}`)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>GPT 审核结论 *</Label>
        <div className="flex flex-wrap gap-1.5">
          {GPT_CONCLUSIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={conclusion === c.value}
              onClick={() => setConclusion(c.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                conclusion === c.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        {conclusion === "manual_confirmation" && (
          <p className="text-xs text-warning-foreground">注意:「进入最终人工确认」不等于批准付款。</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gpt-reason">GPT 主要理由</Label>
        <Textarea id="gpt-reason" value={mainReason} onChange={(e) => setMainReason(e.target.value)} rows={3} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gpt-risks">GPT 指出的风险</Label>
        <Textarea id="gpt-risks" value={risks} onChange={(e) => setRisks(e.target.value)} rows={3} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gpt-alt">GPT 建议替代方案</Label>
        <Textarea id="gpt-alt" value={alternatives} onChange={(e) => setAlternatives(e.target.value)} rows={2} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gpt-cooling">GPT 建议冷静期</Label>
        <Input
          id="gpt-cooling"
          value={coolingPeriod}
          onChange={(e) => setCoolingPeriod(e.target.value)}
          placeholder="例如:24 小时"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gpt-raw">GPT 原始回复(可选,便于留档)</Label>
        <Textarea id="gpt-raw" value={rawResponse} onChange={(e) => setRawResponse(e.target.value)} rows={5} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={submit} disabled={isPending}>
        {isPending ? "保存中..." : "保存审核结果"}
      </Button>
    </div>
  )
}
