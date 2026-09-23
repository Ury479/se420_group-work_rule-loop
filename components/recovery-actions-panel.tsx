"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createRecoveryAction, completeRecoveryAction } from "@/app/actions/spending-review"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MAINLINE_TYPES, mainlineLabel } from "@/lib/spending-review-types"
import type { DecisionRecoveryAction } from "@/lib/db/schema"
import { cn } from "@/lib/utils"
import { CheckCircle2, Circle } from "lucide-react"

export function RecoveryActionsPanel({
  actions,
  spendingReviewId,
}: {
  actions: DecisionRecoveryAction[]
  spendingReviewId?: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [mainline, setMainline] = useState<string>("dashboard")
  const [error, setError] = useState<string | null>(null)

  const [evidenceFor, setEvidenceFor] = useState<number | null>(null)
  const [evidenceText, setEvidenceText] = useState("")

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createRecoveryAction({
        spendingReviewId: spendingReviewId ?? null,
        mainlineType: mainline,
        actionTitle: String(fd.get("actionTitle") || ""),
        actionDescription: (fd.get("actionDescription") as string) || null,
      })
      if (res?.error) {
        setError(res.error)
        return
      }
      setShowForm(false)
      router.refresh()
    })
  }

  function markDone(id: number) {
    startTransition(async () => {
      const res = await completeRecoveryAction(id, evidenceText)
      if (res?.error) {
        setError(res.error)
        return
      }
      setEvidenceFor(null)
      setEvidenceText("")
      router.refresh()
    })
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">主线回归最小动作</h2>
        <Button variant="outline" size="sm" onClick={() => setShowForm((v) => !v)} className="bg-card">
          {showForm ? "收起" : "添加动作"}
        </Button>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        取消或延迟一笔支出后,立刻回到主线做一个 10-30 分钟的最小动作,用行动替代消费带来的虚假掌控感。
      </p>

      {showForm && (
        <form onSubmit={onSubmit} className="shadow-card flex flex-col gap-4 rounded-xl border bg-card p-4">
          <div className="flex flex-col gap-2">
            <Label>主线类型</Label>
            <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto py-0.5">
              {MAINLINE_TYPES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMainline(m.value)}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    mainline === m.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="actionTitle">动作标题</Label>
            <Input id="actionTitle" name="actionTitle" required placeholder="例:为仪表盘写一个 API 骨架(25 分钟)" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="actionDescription">动作说明(可选)</Label>
            <Textarea id="actionDescription" name="actionDescription" rows={2} placeholder="具体做什么、产出什么证据" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="sm" disabled={isPending} className="w-fit">
            {isPending ? "保存中…" : "保存动作"}
          </Button>
        </form>
      )}

      {actions.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          还没有回归动作。取消一笔支出后,来这里立一个最小行动。
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {actions.map((a) => (
            <li
              key={a.id}
              className="shadow-card flex items-start gap-3 rounded-xl border bg-card px-4 py-3 text-sm"
            >
              <button
                type="button"
                disabled={isPending || a.status === "done"}
                onClick={() => {
                  setEvidenceFor(evidenceFor === a.id ? null : a.id)
                  setEvidenceText("")
                }}
                aria-label={a.status === "done" ? "已完成" : "标记完成"}
                className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default"
              >
                {a.status === "done" ? (
                  <CheckCircle2 className="size-5 text-foreground" aria-hidden="true" />
                ) : (
                  <Circle className="size-5" aria-hidden="true" />
                )}
              </button>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className={cn("font-medium leading-snug", a.status === "done" && "text-muted-foreground line-through")}>
                  {a.actionTitle}
                </p>
                {a.actionDescription && (
                  <p className="text-xs leading-relaxed text-muted-foreground">{a.actionDescription}</p>
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {mainlineLabel(a.mainlineType)}
                  </span>
                  {a.status === "done" && a.evidenceText && (
                    <span className="text-xs text-muted-foreground">证据:{a.evidenceText}</span>
                  )}
                </div>
                {evidenceFor === a.id && a.status !== "done" && (
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      value={evidenceText}
                      onChange={(e) => setEvidenceText(e.target.value)}
                      placeholder="完成证据:做了什么、产出了什么"
                      className="h-8 text-xs"
                    />
                    <Button
                      size="sm"
                      disabled={isPending || !evidenceText.trim()}
                      onClick={() => markDone(a.id)}
                      className="shrink-0"
                    >
                      确认完成
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
