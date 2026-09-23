"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Pencil, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { toggleCatalogItem, updateConversionPreferences, upsertCatalogItem } from "@/app/actions/spend-conversion"
import {
  BILLING_TYPE_LABEL,
  CURRENCY_SYMBOL,
  formatMinor,
  parseAmountToMinor,
  type BillingType,
  type CurrencyCode,
} from "@/lib/convert-domain"
import type { ConversionPreference, SpendingAnchor } from "@/lib/db/schema"

const BILLING_TYPES: BillingType[] = ["subscription", "credit_pack", "single_unit", "range_unit"]
const CURRENCIES: CurrencyCode[] = ["CNY", "USD"]

type FormState = {
  id: number | null
  name: string
  billingType: BillingType
  currency: CurrencyCode
  price: string
  maxPrice: string
  unitLabel: string
  sourceNote: string
}

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  billingType: "subscription",
  currency: "CNY",
  price: "",
  maxPrice: "",
  unitLabel: "个月",
  sourceNote: "",
}

export function CatalogManager({ items, prefs }: { items: SpendingAnchor[]; prefs: ConversionPreference }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState | null>(null)

  // 偏好:汇率、默认冷静期、高影响阈值、隐私模式
  const [rate, setRate] = useState(prefs.usdToCnyRate)
  const [cooldown, setCooldown] = useState(String(prefs.defaultCooldownMinutes))
  const [threshold, setThreshold] = useState(String(Math.round(prefs.highImpactThresholdMinor / 100)))
  const [privacyMode, setPrivacyMode] = useState(prefs.privacyMode)
  const [prefsMessage, setPrefsMessage] = useState<string | null>(null)

  function savePrefs() {
    setPrefsMessage(null)
    const cooldownMinutes = Number.parseInt(cooldown, 10)
    const thresholdYuan = Number.parseInt(threshold, 10)
    if (!Number.isInteger(cooldownMinutes) || cooldownMinutes < 1) {
      setPrefsMessage("默认冷静期需要是大于 0 的整数分钟")
      return
    }
    if (!Number.isInteger(thresholdYuan) || thresholdYuan < 1) {
      setPrefsMessage("高影响阈值需要是大于 0 的整数金额")
      return
    }
    startTransition(async () => {
      const res = await updateConversionPreferences({
        usdToCnyRate: rate,
        defaultCooldownMinutes: cooldownMinutes,
        highImpactThresholdMinor: thresholdYuan * 100,
        privacyMode: privacyMode as "neutral" | "explicit",
      })
      if (res && "error" in res && res.error) {
        setPrefsMessage(res.error)
        return
      }
      setPrefsMessage("已保存")
      router.refresh()
    })
  }

  function submitItem() {
    if (!form) return
    setError(null)
    const price = parseAmountToMinor(form.price)
    if (!price.ok) {
      setError(price.message)
      return
    }
    let maxPriceMinor: number | null = null
    if (form.billingType === "range_unit") {
      const parsedMax = parseAmountToMinor(form.maxPrice)
      if (!parsedMax.ok) {
        setError("区间单价必须填写有效的价格上限")
        return
      }
      maxPriceMinor = parsedMax.minor
    }
    startTransition(async () => {
      const res = await upsertCatalogItem({
        id: form.id,
        name: form.name.trim(),
        billingType: form.billingType,
        currency: form.currency,
        priceMinor: price.minor,
        maxPriceMinor,
        unitLabel: form.unitLabel.trim() || "份",
        sourceNote: form.sourceNote.trim() || null,
      })
      if (res && "error" in res && res.error) {
        setError(res.error)
        return
      }
      setForm(null)
      router.refresh()
    })
  }

  function onToggle(id: number, next: boolean) {
    startTransition(async () => {
      await toggleCatalogItem(id, next)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="prefs-title" className="shadow-card flex flex-col gap-4 rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-1">
          <h2 id="prefs-title" className="text-sm font-semibold tracking-tight">
            汇率与默认值
          </h2>
          <p className="text-xs text-muted-foreground">汇率可编辑,每次换算都会保存快照,历史结果不会随之漂移。</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-rate">USD → CNY 汇率</Label>
            <Input id="pf-rate" value={rate} onChange={(e) => setRate(e.target.value)} className="min-h-11 font-mono tabular-nums" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-cooldown">默认冷静期(分钟)</Label>
            <Input
              id="pf-cooldown"
              inputMode="numeric"
              value={cooldown}
              onChange={(e) => setCooldown(e.target.value)}
              className="min-h-11 font-mono tabular-nums"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-threshold">高影响阈值(元)</Label>
            <Input
              id="pf-threshold"
              inputMode="numeric"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="min-h-11 font-mono tabular-nums"
            />
          </div>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">隐私模式</legend>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "neutral", label: "中性显示(推荐)" },
              { value: "explicit", label: "详情显示私密别名" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPrivacyMode(option.value)}
                aria-pressed={privacyMode === option.value}
                className={cn(
                  "min-h-11 rounded-md border px-3.5 text-sm transition-colors",
                  privacyMode === option.value ? "border-primary bg-primary/10 font-semibold" : "text-muted-foreground hover:bg-accent",
                )}
              >
                {privacyMode === option.value ? "● " : "○ "}
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
        {prefsMessage ? (
          <p role="status" className="text-xs text-muted-foreground">
            {prefsMessage}
          </p>
        ) : null}
        <Button onClick={savePrefs} disabled={isPending} variant="outline" size="sm" className="self-start">
          保存偏好
        </Button>
      </section>

      <section aria-labelledby="catalog-title" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="catalog-title" className="text-sm font-semibold tracking-tight">
            价值目录
          </h2>
          <Button size="sm" variant={form ? "outline" : "default"} onClick={() => setForm(form ? null : EMPTY_FORM)}>
            <Plus className="size-4" aria-hidden="true" />
            {form ? "收起" : "新增比较项"}
          </Button>
        </div>

        {form ? (
          <div className="shadow-card flex flex-col gap-3 rounded-xl border bg-card p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ct-name">名称 *</Label>
                <Input
                  id="ct-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="如:Cursor Pro"
                  className="min-h-11"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ct-unit">单位 *</Label>
                <Input
                  id="ct-unit"
                  value={form.unitLabel}
                  onChange={(e) => setForm({ ...form, unitLabel: e.target.value })}
                  placeholder="个月 / 包 / 顿 / 份"
                  className="min-h-11"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ct-price">单价 *</Label>
                <Input
                  id="ct-price"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="20.00"
                  className="min-h-11 font-mono tabular-nums"
                />
              </div>
              {form.billingType === "range_unit" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ct-max">价格上限 *</Label>
                  <Input
                    id="ct-max"
                    inputMode="decimal"
                    value={form.maxPrice}
                    onChange={(e) => setForm({ ...form, maxPrice: e.target.value })}
                    placeholder="60.00"
                    className="min-h-11 font-mono tabular-nums"
                  />
                </div>
              ) : null}
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-sm font-medium">计费类型</legend>
              <div className="flex flex-wrap gap-2">
                {BILLING_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({ ...form, billingType: type })}
                    aria-pressed={form.billingType === type}
                    className={cn(
                      "min-h-11 rounded-md border px-3.5 text-sm transition-colors",
                      form.billingType === type ? "border-primary bg-primary/10 font-semibold" : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {BILLING_TYPE_LABEL[type]}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1.5 text-sm font-medium">币种</legend>
              <div className="flex flex-wrap gap-2">
                {CURRENCIES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setForm({ ...form, currency: code })}
                    aria-pressed={form.currency === code}
                    className={cn(
                      "min-h-11 rounded-md border px-3.5 font-mono text-sm transition-colors",
                      form.currency === code ? "border-primary bg-primary/10 font-semibold" : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {CURRENCY_SYMBOL[code]} {code}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ct-note">价格来源备注</Label>
              <Input
                id="ct-note"
                value={form.sourceNote}
                onChange={(e) => setForm({ ...form, sourceNote: e.target.value })}
                placeholder="如:用户录入,未自动核验"
                className="min-h-11"
              />
            </div>

            {error ? (
              <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button onClick={submitItem} disabled={isPending} size="sm" className="self-start">
              {form.id ? "保存修改" : "添加到目录"}
            </Button>
          </div>
        ) : null}

        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn("shadow-card flex items-start gap-3 rounded-xl border bg-card px-4 py-3", !item.isActive && "opacity-55")}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="font-mono text-xs text-muted-foreground tabular-nums">
                  {CURRENCY_SYMBOL[item.currency as CurrencyCode]}
                  {formatMinor(item.priceMinor)}
                  {item.maxPriceMinor ? `–${formatMinor(item.maxPriceMinor)}` : ""} / {item.unitLabel} ·{" "}
                  {BILLING_TYPE_LABEL[item.billingType as BillingType]}
                </p>
                <p className="text-xs text-muted-foreground">{item.sourceNote ?? "用户录入,未自动核验"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    setForm({
                      id: item.id,
                      name: item.name,
                      billingType: item.billingType as BillingType,
                      currency: item.currency as CurrencyCode,
                      price: (item.priceMinor / 100).toFixed(2),
                      maxPrice: item.maxPriceMinor ? (item.maxPriceMinor / 100).toFixed(2) : "",
                      unitLabel: item.unitLabel,
                      sourceNote: item.sourceNote ?? "",
                    })
                  }
                  aria-label={`编辑 ${item.name}`}
                  className="flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onToggle(item.id, !item.isActive)}
                  aria-label={item.isActive ? `停用 ${item.name}` : `启用 ${item.name}`}
                  className="flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.isActive ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}
                </button>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs leading-relaxed text-muted-foreground">
          停用只影响新的换算。历史记录始终按当时快照渲染,即使目录项被停用或改名。
        </p>
      </section>
    </div>
  )
}
