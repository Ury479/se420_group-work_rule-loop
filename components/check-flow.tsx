"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toggleItem, completeCheck, markStatus } from "@/app/actions/confirmations"
import { Button } from "@/components/ui/button"
import { Loader2, CircleCheckBig, Undo2, Check, ChevronLeft } from "lucide-react"

interface CheckItem {
  id: number
  itemText: string
  isRequired: boolean
  isChecked: boolean
  confirmationRound: number
}

export function CheckFlow({
  confirmationId,
  riskLevel,
  items,
}: {
  confirmationId: number
  riskLevel: string
  items: CheckItem[]
}) {
  const router = useRouter()

  // 按轮次排序,一次只显示一个确认项
  const ordered = useMemo(
    () =>
      [...items].sort(
        (a, b) => a.confirmationRound - b.confirmationRound || a.id - b.id
      ),
    [items]
  )

  const [checked, setChecked] = useState<Record<number, boolean>>(
    Object.fromEntries(items.map((i) => [i.id, i.isChecked]))
  )
  // 从第一个未勾选的项开始
  const firstUnchecked = ordered.findIndex((i) => !(i.isChecked))
  const [index, setIndex] = useState(
    firstUnchecked === -1 ? ordered.length : firstUnchecked
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = ordered.length
  const doneCount = ordered.filter((i) => checked[i.id]).length
  const current = index < total ? ordered[index] : null
  const requiredDone = ordered
    .filter((i) => i.isRequired)
    .every((i) => checked[i.id])
  const allStepsDone = index >= total

  function advance() {
    // 跳到下一个未勾选的项;没有则进入完成态
    let next = index + 1
    while (next < total && checked[ordered[next].id]) next++
    setIndex(next)
  }

  async function handleConfirm() {
    if (!current) return
    setChecked((prev) => ({ ...prev, [current.id]: true }))
    advance()
    await toggleItem(current.id, true)
  }

  async function handleSkip() {
    if (!current) return
    advance()
  }

  function handlePrev() {
    if (index > 0) setIndex(index - 1)
  }

  async function handleComplete() {
    setError(null)
    setSubmitting(true)
    const result = await completeCheck(confirmationId)
    setSubmitting(false)
    if ("error" in result && result.error) {
      setError(result.error)
      return
    }
    if ("next" in result) {
      if (result.next === "evidence") {
        router.push(`/critical-confirmations/${confirmationId}/evidence`)
      } else {
        router.push("/")
      }
    }
  }

  async function handleBack() {
    await markStatus(confirmationId, "armed")
    router.push("/")
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 进度:极简的点状指示 + 数字 */}
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-1.5"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={doneCount}
          aria-label="检查进度"
        >
          {ordered.map((item, i) => (
            <span
              key={item.id}
              className={`size-2 rounded-full transition-colors ${
                checked[item.id]
                  ? "bg-primary"
                  : i === index
                    ? "bg-primary/40"
                    : "bg-border"
              }`}
            />
          ))}
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {doneCount}/{total}
        </span>
      </div>

      {current && !allStepsDone ? (
        /* 一次只问一个问题 */
        <div className="flex min-h-48 flex-col justify-between gap-8 rounded-xl border bg-card px-5 py-6">
          <p className="text-lg font-medium leading-relaxed text-pretty">
            {current.itemText}
          </p>
          <div className="flex flex-col gap-2">
            <Button size="lg" className="h-12 text-base" onClick={handleConfirm}>
              <Check className="size-5" aria-hidden="true" />
              确认,下一个
            </Button>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={handlePrev}
                disabled={index === 0}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                上一个
              </Button>
              {!current.isRequired && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={handleSkip}
                >
                  跳过(选填)
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 全部走完:只剩一个完成按钮 */
        <div className="flex flex-col gap-3 rounded-xl border bg-card px-5 py-6">
          {requiredDone ? (
            <p className="text-center text-sm leading-relaxed text-muted-foreground">
              确认完毕。深呼吸,现在可以执行了。
            </p>
          ) : (
            <p className="text-center text-sm leading-relaxed text-muted-foreground">
              还有必确认项未完成,点「上一个」回去看看。
            </p>
          )}
          <Button
            size="lg"
            className="h-12 text-base"
            disabled={!requiredDone || submitting}
            onClick={handleComplete}
          >
            {submitting ? (
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            ) : (
              <CircleCheckBig className="size-5" aria-hidden="true" />
            )}
            {riskLevel === "high" ? "确认完成,填写最小证据" : "确认完成"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={handlePrev}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            上一个
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button
        variant="outline"
        onClick={handleBack}
        disabled={submitting}
        className="text-muted-foreground"
      >
        <Undo2 className="size-4" aria-hidden="true" />
        发现问题,返回修改
      </Button>
    </div>
  )
}
