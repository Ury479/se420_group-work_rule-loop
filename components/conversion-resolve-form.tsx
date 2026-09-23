"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Save, ShieldCheck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { resolveSpendConversion } from "@/app/actions/spend-conversion"
import {
  RESOLUTION_LABEL,
  computeOverspendMinor,
  computeProtectedMinor,
  formatCny,
  parseAmountToMinor,
  type Resolution,
} from "@/lib/convert-domain"

const OPTIONS: Resolution[] = ["avoided", "partial", "spent", "unknown"]

// 最终结果:保护金额由服务端派生,这里只做即时预览
export function ConversionResolveForm({ conversionId, plannedAmountMinor }: { conversionId: number; plannedAmountMinor: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [resolution, setResolution] = useState<Resolution>("avoided")
  const [actual, setActual] = useState("")
  const [redirected, setRedirected] = useState("")
  const [redirectTarget, setRedirectTarget] = useState("")
  const [confirmOverspend, setConfirmOverspend] = useState(false)

  const actualMinor = useMemo(() => {
    const parsed = parseAmountToMinor(actual)
    return parsed.ok ? parsed.minor : null
  }, [actual])

  const protectedPreview = computeProtectedMinor(resolution, plannedAmountMinor, actualMinor)
  const overspendPreview = computeOverspendMinor(plannedAmountMinor, actualMinor)

  // 实际转向金额的即时预览(解析失败按 0 处理)
  const redirectedMinorPreview = useMemo(() => {
    const parsed = parseAmountToMinor(redirected)
    return parsed.ok ? parsed.minor : 0
  }, [redirected])

  function submit() {
    setError(null)
    if (resolution === "partial" && actualMinor === null) {
      setError("部分消费必须填写实际消费金额")
      return
    }
    if ((resolution === "partial" || resolution === "spent") && overspendPreview > 0 && !confirmOverspend) {
      setError(`实际金额超过计划金额 ${formatCny(overspendPreview)},请勾选二次确认后再提交`)
      return
    }
    let redirectedMinor = 0
    if (redirected.trim()) {
      const parsed = parseAmountToMinor(redirected)
      if (!parsed.ok) {
        setError(parsed.message)
        return
      }
      redirectedMinor = parsed.minor
    }
    if (redirectedMinor > protectedPreview) {
      setError(`实际转向金额不能超过保护金额 ${formatCny(protectedPreview)}`)
      return
    }

    startTransition(async () => {
      const res = await resolveSpendConversion({
        conversionId,
        resolution,
        actualAmountMinor: resolution === "avoided" || resolution === "unknown" ? null : actualMinor,
        redirectedAmountMinor: redirectedMinor,
        redirectTarget: redirectTarget.trim() || null,
      })
      if (res && "error" in res && res.error) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  const needsActual = resolution === "partial" || resolution === "spent"

  return (
    <section aria-labelledby="resolve-title" className="shadow-card flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 id="resolve-title" className="text-sm font-semibold tracking-tight">
          记录最终结果
        </h2>
        <p className="text-xs text-muted-foreground">只记录事实。这里不评分,也不做道德判断。</p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">最终决定</legend>
        <div className="grid grid-cols-2 gap-2.5">
          {OPTIONS.map((value) => {
            const active = resolution === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setResolution(value)}
                aria-pressed={active}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-3 py-3 text-sm transition-colors",
                  value === "unknown" && !active && "border-dashed",
                  active
                    ? "border-info bg-info/15 font-semibold text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-info/40",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border-2",
                    active ? "border-info" : "border-border",
                  )}
                >
                  {active && <span className="size-2.5 rounded-full bg-info" />}
                </span>
                {RESOLUTION_LABEL[value]}
              </button>
            )
          })}
        </div>
      </fieldset>

      {needsActual ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rs-actual">实际消费金额(元){resolution === "partial" ? " *" : ""}</Label>
          <Input
            id="rs-actual"
            inputMode="decimal"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            placeholder={resolution === "spent" ? `留空按计划金额 ${formatCny(plannedAmountMinor)}` : "500.00"}
            className="min-h-11 max-w-52 font-mono tabular-nums"
          />
          {overspendPreview > 0 ? (
            <label className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
              <input
                type="checkbox"
                checked={confirmOverspend}
                onChange={(e) => setConfirmOverspend(e.target.checked)}
                className="mt-0.5 size-4"
              />
              <span>
                实际金额超过计划金额 {formatCny(overspendPreview)}。这是事实记录,保护金额会是 ¥0.00。勾选表示确认。
              </span>
            </label>
          ) : null}
        </div>
      ) : null}

      {/* 金额结果双栏:保护金额 / 实际转向 */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/40 p-4">
        <p className="text-sm font-semibold">金额结果</p>
        <div className="grid grid-cols-2 divide-x divide-border">
          <div className="flex flex-col items-center gap-1 px-2 text-center">
            <span className="text-xs font-medium text-warning">保护金额</span>
            <span className="font-mono text-2xl font-bold tabular-nums text-warning">{formatCny(protectedPreview)}</span>
            <span className="text-xs text-muted-foreground">计划金额减去实际消费</span>
          </div>
          <div className="flex flex-col items-center gap-1 px-2 text-center">
            <span className="text-xs font-medium text-success">实际转向</span>
            <span className="font-mono text-2xl font-bold tabular-nums text-success">
              {formatCny(redirectedMinorPreview)}
            </span>
            <span className="text-xs text-muted-foreground">已确认转入目标预算</span>
          </div>
        </div>
        {protectedPreview > 0 ? (
          <p className="flex items-center justify-between gap-2 border-t border-dashed border-border pt-2 text-xs text-muted-foreground">
            <span>{`未转向的保护金额 ${formatCny(Math.max(protectedPreview - redirectedMinorPreview, 0))}`}</span>
            <span className="text-warning">保护金额不是账户余额</span>
          </p>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rs-redirect">实际转入目标预算的金额(元,可选)</Label>
          <Input
            id="rs-redirect"
            inputMode="decimal"
            value={redirected}
            onChange={(e) => setRedirected(e.target.value)}
            placeholder="0.00"
            className="min-h-11 max-w-52 font-mono tabular-nums"
          />
          <p className="text-xs text-muted-foreground">不能超过保护金额。没有真实转账就留空。</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rs-target">转向去处(可选)</Label>
          <Input
            id="rs-target"
            value={redirectTarget}
            maxLength={80}
            onChange={(e) => setRedirectTarget(e.target.value)}
            placeholder="如:AI 工具预算"
            className="min-h-11"
          />
        </div>
      </div>

      {/* 规则验证清单:由本次事实派生,不用户打分 */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-background/40 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-4 text-success" aria-hidden="true" />
          形成一次规则验证
        </p>
        <dl className="flex flex-col divide-y divide-border/60 text-sm">
          <div className="flex items-center justify-between py-2">
            <dt className="text-muted-foreground">遵守冷静期</dt>
            <dd className="font-medium text-success">是</dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-muted-foreground">行为不同(有保护金额)</dt>
            <dd className={cn("font-medium", protectedPreview > 0 ? "text-success" : "text-muted-foreground")}>
              {protectedPreview > 0 ? "是" : "否"}
            </dd>
          </div>
          <div className="flex items-center justify-between py-2">
            <dt className="text-muted-foreground">结果改善</dt>
            <dd className="font-medium text-warning">待确认</dd>
          </div>
        </dl>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="hud-cta flex min-h-13 w-full items-center justify-center gap-2 rounded-xl text-base font-bold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Save className="size-5" aria-hidden="true" />
        {isPending ? "正在保存…" : "保存最终结果"}
      </button>
    </section>
  )
}
