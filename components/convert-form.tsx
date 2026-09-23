"use client"

// 价值换算输入页:大金额输入 + 双段状态 + 类别行 + 比较锚点勾选 + 汇率内联编辑,对齐参考稿
import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, Hourglass, CircleCheck, Info, Lock, Pencil, Plus, Repeat, ShieldCheck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { createSpendConversion, updateConversionPreferences } from "@/app/actions/spend-conversion"
import {
  CURRENCY_SYMBOL,
  PRIVACY_LABELS,
  formatMinor,
  normalizeRate,
  parseAmountToMinor,
  type CurrencyCode,
  type DecisionStage,
} from "@/lib/convert-domain"
import type { SpendingAnchor } from "@/lib/db/schema"

const COLLAPSED_ITEM_COUNT = 5

type Prefs = {
  usdToCnyRate: string
  defaultCooldownMinutes: number
  highImpactThresholdMinor: number
  privacyMode: string
}

export function ConvertForm({
  items,
  defaultItemIds = [],
  initialAmount,
  initialStage,
  prefs,
}: {
  items: SpendingAnchor[]
  defaultItemIds?: number[]
  initialAmount?: string
  initialStage?: DecisionStage
  prefs: Prefs
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [amount, setAmount] = useState(initialAmount ?? "")
  const [currency, setCurrency] = useState<CurrencyCode>("CNY")
  const [stage, setStage] = useState<DecisionStage>(initialStage ?? "considering")
  const [privacyLabel, setPrivacyLabel] = useState<string>(PRIVACY_LABELS[0])
  const [sensitiveLabel, setSensitiveLabel] = useState("")
  const [showPrivacyOptions, setShowPrivacyOptions] = useState(false)
  const [selected, setSelected] = useState<number[]>(() => {
    const valid = defaultItemIds.filter((id) => items.some((item) => item.id === id))
    return valid.length > 0 ? valid : items.slice(0, 3).map((item) => item.id)
  })
  const [showAllItems, setShowAllItems] = useState(false)

  // 汇率内联编辑(用户录入,未自动核验)
  const [rate, setRate] = useState(() => {
    const n = Number.parseFloat(prefs.usdToCnyRate)
    return Number.isFinite(n) ? n.toFixed(2) : "7.00"
  })
  const [editingRate, setEditingRate] = useState(false)
  const [rateDraft, setRateDraft] = useState(rate)

  const visibleItems = showAllItems
    ? items
    : items.filter((item, index) => selected.includes(item.id) || index < COLLAPSED_ITEM_COUNT)
  const hiddenCount = items.length - visibleItems.length

  // 金额展示格式化(千分位,仅展示用)
  const displayAmount = useMemo(() => {
    const n = Number.parseFloat(amount)
    if (!Number.isFinite(n)) return null
    return n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }, [amount])

  function toggleItem(id: number) {
    setError(null)
    setSelected((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]))
  }

  function saveRate() {
    const normalized = normalizeRate(rateDraft)
    if (!normalized) {
      setError("汇率必须是大于 0 的数字")
      return
    }
    setError(null)
    setEditingRate(false)
    setRate(Number.parseFloat(normalized).toFixed(2))
    startTransition(async () => {
      const res = await updateConversionPreferences({
        usdToCnyRate: normalized,
        defaultCooldownMinutes: prefs.defaultCooldownMinutes,
        highImpactThresholdMinor: prefs.highImpactThresholdMinor,
        privacyMode: prefs.privacyMode === "explicit" ? "explicit" : "neutral",
      })
      if (res && "error" in res && res.error) setError(res.error)
    })
  }

  function submit() {
    setError(null)
    const parsed = parseAmountToMinor(amount)
    if (!parsed.ok) {
      setError(parsed.message)
      return
    }
    if (selected.length === 0) {
      setError("请至少选择 1 个比较项")
      return
    }
    startTransition(async () => {
      const res = await createSpendConversion({
        decisionStage: stage,
        inputCurrency: currency === "THB" ? "CNY" : currency,
        plannedAmountMinor: parsed.minor,
        catalogItemIds: selected,
        privacyLabel,
        sensitiveLabel: sensitiveLabel.trim() || null,
      })
      if ("error" in res && res.error) {
        setError(res.error)
        return
      }
      if ("id" in res) router.push(`/convert/${res.id}`)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 计划金额 */}
      <section className="shadow-card rounded-xl border bg-card p-4">
        <Label htmlFor="cv-amount" className="text-sm font-semibold">
          计划金额
        </Label>
        <div className="mt-2 flex items-stretch overflow-hidden rounded-lg border border-border">
          <div className="flex shrink-0 border-r border-border" role="group" aria-label="选择币种">
            {(["CNY", "USD"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setCurrency(code)}
                aria-pressed={currency === code}
                className={cn(
                  "min-h-14 px-3.5 font-mono text-sm font-semibold transition-colors",
                  currency === code ? "bg-secondary text-foreground" : "bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {code}
              </button>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-1 bg-background px-3.5">
            <span className="shrink-0 font-mono text-2xl font-bold text-muted-foreground" aria-hidden="true">
              {CURRENCY_SYMBOL[currency]}
            </span>
            <Input
              id="cv-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="2,000.00"
              aria-describedby="cv-amount-hint"
              className="min-h-14 flex-1 border-0 bg-transparent p-0 font-mono text-2xl font-bold tabular-nums shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
        <p id="cv-amount-hint" className="mt-1.5 text-xs text-muted-foreground">
          {displayAmount ? `${CURRENCY_SYMBOL[currency]} ${displayAmount} · ` : ""}最多两位小数,只保存在本机数据库。
        </p>
      </section>

      {/* 状态双段 */}
      <fieldset>
        <legend className="sr-only">这笔消费的状态</legend>
        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setStage("considering")}
            aria-pressed={stage === "considering"}
            className={cn(
              "flex min-h-14 items-center justify-center gap-2 text-sm font-semibold transition-colors",
              stage === "considering" ? "bg-info text-info-foreground" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <Hourglass className="size-4" aria-hidden="true" />
            正在考虑
          </button>
          <button
            type="button"
            onClick={() => setStage("spent")}
            aria-pressed={stage === "spent"}
            className={cn(
              "flex min-h-14 items-center justify-center gap-2 text-sm font-semibold transition-colors",
              stage === "spent" ? "bg-info text-info-foreground" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <CircleCheck className="size-4" aria-hidden="true" />
            已经发生
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {stage === "considering" ? "还没付款:换算后可以开始一个冷静期。" : "已经付款:只计入历史支出,不会产生保护金额。"}
        </p>
      </fieldset>

      {/* 类别行 */}
      <section className="shadow-card rounded-xl border bg-card">
        <button
          type="button"
          onClick={() => setShowPrivacyOptions((v) => !v)}
          aria-expanded={showPrivacyOptions}
          className="flex min-h-14 w-full items-center justify-between gap-2 px-4 text-left"
        >
          <span className="text-sm font-semibold">类别</span>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            {privacyLabel}
            <Lock className="size-4" aria-hidden="true" />
          </span>
        </button>
        {showPrivacyOptions && (
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {PRIVACY_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setPrivacyLabel(label)}
                  aria-pressed={privacyLabel === label}
                  className={cn(
                    "min-h-10 rounded-full border px-3.5 text-sm transition-colors",
                    privacyLabel === label
                      ? "border-foreground/30 bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cv-sensitive" className="text-xs text-muted-foreground">
                私密别名(可选,仅在详情页显示)
              </Label>
              <Input
                id="cv-sensitive"
                value={sensitiveLabel}
                maxLength={40}
                onChange={(e) => setSensitiveLabel(e.target.value)}
                placeholder="留空即只显示中性标签"
                className="min-h-10"
              />
            </div>
          </div>
        )}
      </section>

      {/* 比较锚点 */}
      <section className="shadow-card rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold tracking-tight">比较锚点</h2>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">{`· 已选 ${selected.length} 项`}</span>
          </div>
          <Link
            href="/convert/catalog"
            className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Plus className="size-4" aria-hidden="true" />
            自定义添加
          </Link>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          可按需选择任意数量的锚点,结果页会完整保留本次比较快照。
        </p>
        <ul className="mt-3 flex flex-col">
          {visibleItems.map((item, index) => {
            const active = selected.includes(item.id)
            const isRange = item.billingType === "range_unit" && item.maxPriceMinor
            return (
              <li key={item.id} className={cn(index > 0 && "border-t border-border")}>
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  aria-pressed={active}
                  className="flex min-h-14 w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-accent/50"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                      active ? "border-info bg-info text-info-foreground" : "border-border bg-background",
                    )}
                  >
                    {active && <Check className="size-4" />}
                  </span>
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background font-mono text-xs font-bold text-muted-foreground"
                  >
                    {item.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {item.name}
                      <span className="ml-1.5 font-mono text-xs text-muted-foreground tabular-nums">
                        {`· ${item.currency === "USD" ? "USD " : "¥"}${formatMinor(item.priceMinor)}`}
                        {isRange ? `–${formatMinor(item.maxPriceMinor as number)}` : ""}
                        {`/${item.unitLabel}`}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {(hiddenCount > 0 || showAllItems) && (
          <button
            type="button"
            onClick={() => setShowAllItems((v) => !v)}
            aria-expanded={showAllItems}
            className="mt-2 flex min-h-11 w-full items-center justify-between rounded-lg border border-dashed border-border px-3.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {showAllItems ? "只看已选与常用项" : `查看其他目录项(${hiddenCount})`}
            <ChevronDown className={cn("size-4 transition-transform", showAllItems && "rotate-180")} aria-hidden="true" />
          </button>
        )}
      </section>

      {/* 汇率行 */}
      <section className="shadow-card flex min-h-14 items-center gap-3 rounded-xl border bg-card px-4 py-2.5">
        <Repeat className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        {editingRate ? (
          <>
            <label htmlFor="cv-rate" className="shrink-0 font-mono text-sm font-semibold">
              USD/CNY
            </label>
            <Input
              id="cv-rate"
              inputMode="decimal"
              value={rateDraft}
              onChange={(e) => setRateDraft(e.target.value)}
              className="min-h-10 max-w-24 font-mono tabular-nums"
            />
            <button
              type="button"
              onClick={saveRate}
              className="ml-auto flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Check className="size-4" aria-hidden="true" />
              保存
            </button>
          </>
        ) : (
          <>
            <p className="min-w-0 flex-1 text-sm">
              <span className="font-mono font-semibold tabular-nums">{`USD/CNY ${rate}`}</span>
              <span className="ml-1.5 text-xs text-muted-foreground">· 用户录入,未自动核验</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setRateDraft(rate)
                setEditingRate(true)
              }}
              aria-label="编辑汇率"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </button>
          </>
        )}
      </section>

      {/* 隐私提示 */}
      <p className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
        <Info className="size-4 shrink-0" aria-hidden="true" />
        金额与类别不会发送给第三方
      </p>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="hud-cta flex min-h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-bold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ShieldCheck className="size-5" aria-hidden="true" />
        {isPending ? "正在换算…" : "查看机会成本"}
      </button>
    </div>
  )
}
