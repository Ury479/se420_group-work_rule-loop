"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Timer } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { startConversionCooldown } from "@/app/actions/spend-conversion"
import { COOLDOWN_PRESETS, MINIMUM_ACTIONS, formatCooldownMinutes } from "@/lib/convert-domain"

// 冷静期:结果页唯一主行动。倒计时纯本地渲染,不阻塞页面,也不发送系统通知。
export function ConversionCooldownPanel({
  conversionId,
  defaultMinutes,
  cooldownEndsAt,
  cooldownMinutes,
  minimumAction,
  resolved,
}: {
  conversionId: number
  defaultMinutes: number
  cooldownEndsAt: string | null
  cooldownMinutes: number | null
  minimumAction: string | null
  resolved: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [minutes, setMinutes] = useState<number>(defaultMinutes)
  const [customMinutes, setCustomMinutes] = useState("")
  const [action, setAction] = useState<string>(MINIMUM_ACTIONS[0])
  const [customAction, setCustomAction] = useState("")
  const [closePaymentPage, setClosePaymentPage] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)

  const active = Boolean(cooldownEndsAt) && !resolved

  // 倒计时归零时刷新一次:让服务端渲染的「记录最终结果」表单自动出现
  useEffect(() => {
    if (!cooldownEndsAt) return
    let refreshed = false
    const tick = () => {
      const left = Math.max(new Date(cooldownEndsAt).getTime() - Date.now(), 0)
      setRemaining(left)
      if (left === 0 && !refreshed) {
        refreshed = true
        router.refresh()
      }
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [cooldownEndsAt, router])

  function submit() {
    setError(null)
    const finalMinutes = customMinutes.trim() ? Number.parseInt(customMinutes, 10) : minutes
    if (!Number.isInteger(finalMinutes) || finalMinutes < 1) {
      setError("冷静期需要是大于 0 的整数分钟")
      return
    }
    const finalAction = customAction.trim() || action
    startTransition(async () => {
      const res = await startConversionCooldown({
        conversionId,
        durationMinutes: finalMinutes,
        minimumAction: finalAction,
      })
      if (res && "error" in res && res.error) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  if (active && cooldownEndsAt) {
    const over = remaining !== null && remaining <= 0
    const totalSeconds = Math.floor((remaining ?? 0) / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return (
      <section
        aria-labelledby="cooldown-title"
        className={cn(
          "shadow-card flex flex-col gap-2 rounded-xl border bg-card p-4",
          over ? "border-l-[6px] border-l-success" : "border-l-[6px] border-l-warning",
        )}
      >
        <h2 id="cooldown-title" className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
          <Timer className="size-4" aria-hidden="true" />
          {over ? "冷静期已结束" : "冷静期进行中"}
        </h2>
        <p className="font-mono text-3xl font-semibold tabular-nums" aria-live="off">
          {over ? "00:00:00" : `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`}
        </p>
        <p className="text-xs text-muted-foreground">
          {cooldownMinutes ? `本次时长 ${formatCooldownMinutes(cooldownMinutes)} · ` : ""}
          结束时间 {new Date(cooldownEndsAt).toLocaleString("zh-CN", { hour12: false })}
        </p>
        {minimumAction ? <p className="text-sm">最小行动:{minimumAction}</p> : null}
        <p className="text-xs leading-relaxed text-muted-foreground">
          {over ? "现在可以在下面记录最终结果。" : "时间到之前不用做任何决定,可以直接离开这个页面。"}
        </p>
      </section>
    )
  }

  if (resolved) return null

  return (
    <section aria-labelledby="cooldown-start" className="shadow-card flex flex-col gap-4 rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 id="cooldown-start" className="text-sm font-semibold tracking-tight">
          开始一个冷静期
        </h2>
        <p className="text-xs text-muted-foreground">先暂停,再决定。这一步不需要你判断这笔消费对不对。</p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">等待多久</legend>
        <div className="flex flex-wrap gap-2">
          {COOLDOWN_PRESETS.map((preset) => (
            <button
              key={preset.minutes}
              type="button"
              onClick={() => {
                setMinutes(preset.minutes)
                setCustomMinutes("")
              }}
              aria-pressed={!customMinutes && minutes === preset.minutes}
              className={cn(
                "min-h-11 rounded-md border px-3.5 text-sm transition-colors",
                !customMinutes && minutes === preset.minutes
                  ? "border-primary bg-primary/10 font-semibold"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cd-custom">自定义分钟数(可选)</Label>
          <Input
            id="cd-custom"
            inputMode="numeric"
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            placeholder="如 45"
            className="min-h-11 max-w-40 font-mono tabular-nums"
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">现在做的最小行动</legend>
        <div className="flex flex-wrap gap-2">
          {MINIMUM_ACTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setAction(item)
                setCustomAction("")
              }}
              aria-pressed={!customAction && action === item}
              className={cn(
                "min-h-11 rounded-full border px-3.5 text-sm transition-colors",
                !customAction && action === item ? "border-foreground/30 bg-secondary font-medium" : "text-muted-foreground hover:bg-accent",
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cd-action">自定义行动(可选)</Label>
          <Input
            id="cd-action"
            value={customAction}
            maxLength={200}
            onChange={(e) => setCustomAction(e.target.value)}
            placeholder="写下你现在能做的一件小事"
            className="min-h-11"
          />
        </div>
      </fieldset>

      {/* 本地承诺项:只影响本机勾选状态,不写入数据库 */}
      <label className="flex items-center gap-2.5 rounded-lg border border-border bg-background/40 px-3 py-2.5 text-sm">
        <input
          type="checkbox"
          checked={closePaymentPage}
          onChange={(e) => setClosePaymentPage(e.target.checked)}
          className="size-4"
        />
        关闭当前付款页面(仅本地记忆,不做验证)
      </label>

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
        <Timer className="size-5" aria-hidden="true" />
        {isPending ? "正在开始…" : `开始 ${formatCooldownMinutes(customMinutes.trim() ? Number(customMinutes) || 0 : minutes)}冷静期`}
      </button>
      <p className="text-center text-xs text-muted-foreground">现在不想决定?直接离开这个页面,记录会保留在换算历史里。</p>
    </section>
  )
}
