"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createResource } from "@/app/actions/resources"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  RESOURCE_TYPES,
  RESOURCE_DOMAINS,
  MAINLINES,
  BEFORE_USE_QUESTIONS,
} from "@/lib/resource-types"

function PillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly { value: T; label: string }[]
  value: T | null
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div role="group" aria-label={label} className="scrollbar-none flex gap-1.5 overflow-x-auto py-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              value === o.value
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ResourceForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [resourceType, setResourceType] = useState<string>("content")
  const [domain, setDomain] = useState<string>("other")
  const [mainline, setMainline] = useState<string | null>(null)
  const [nextAction, setNextAction] = useState("")
  const [expectedOutput, setExpectedOutput] = useState("")
  const [activateNow, setActivateNow] = useState(false)
  const [locationUrl, setLocationUrl] = useState("")
  const [purchaseCost, setPurchaseCost] = useState("")
  const [currency, setCurrency] = useState<"CNY" | "USD">("CNY")
  const [notes, setNotes] = useState("")
  const [showOptional, setShowOptional] = useState(false)

  const canActivate = Boolean(mainline && nextAction.trim() && expectedOutput.trim())

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await createResource({
        name,
        resourceType,
        domain,
        status: activateNow && canActivate ? "active" : "pending_review",
        platformId: null,
        mainline,
        responsibility: null,
        locationUrl: locationUrl.trim() || null,
        localPath: null,
        purchaseCost: purchaseCost ? Number.parseInt(purchaseCost, 10) || 0 : null,
        currency,
        storageSizeMb: null,
        isReplaceable: true,
        isDuplicate: false,
        nextAction: nextAction.trim() || null,
        expectedOutput: expectedOutput.trim() || null,
        reviewAt: null,
        notes: notes.trim() || null,
      })
      if ("error" in result && result.error) {
        setError(result.error)
        return
      }
      router.push("/resources")
    } catch {
      setError("保存失败:服务器暂时不可用,请稍后重试。填写内容仍在表单中。")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* 调用前四问 */}
      <div className="rounded-xl border bg-secondary/50 px-4 py-3">
        <p className="mb-1.5 text-xs font-medium text-secondary-foreground">登记前先问自己:</p>
        <ul className="flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground">
          {BEFORE_USE_QUESTIONS.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="res-name">
          资源名称 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="res-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例:极客时间算法训练营 / Obsidian / GPT Plus"
        />
      </div>

      <PillGroup label="资源类型" options={RESOURCE_TYPES} value={resourceType} onChange={setResourceType} />
      <PillGroup label="所属领域" options={RESOURCE_DOMAINS} value={domain} onChange={setDomain} />

      {/* 激活三要素 */}
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold">激活三要素</h2>
          <p className="text-xs text-muted-foreground">缺任一项资源不得激活,只能保存为「待复审」。</p>
        </div>
        <PillGroup label="服务主线" options={MAINLINES} value={mainline} onChange={setMainline} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="res-next">下一次使用动作</Label>
          <Input
            id="res-next"
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder="例:本周完成第 3 章练习题"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="res-output">预期成果</Label>
          <Input
            id="res-output"
            value={expectedOutput}
            onChange={(e) => setExpectedOutput(e.target.value)}
            placeholder="例:一篇题解笔记 / 一个可运行 Demo"
          />
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={activateNow}
          disabled={!canActivate}
          onClick={() => setActivateNow((v) => !v)}
          className={cn(
            "flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors",
            activateNow && canActivate
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background text-muted-foreground",
            !canActivate && "opacity-50"
          )}
        >
          <span>{canActivate ? "立即激活该资源" : "补齐三要素后才能激活"}</span>
          <span className="text-xs">{activateNow && canActivate ? "激活" : "待复审"}</span>
        </button>
      </section>

      {/* 可选信息 */}
      <button
        type="button"
        onClick={() => setShowOptional((v) => !v)}
        className="w-fit text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
        aria-expanded={showOptional}
      >
        {showOptional ? "收起可选信息" : "补充可选信息(位置、成本、备注)"}
      </button>
      {showOptional && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="res-url">资源位置(链接)</Label>
            <Input
              id="res-url"
              value={locationUrl}
              onChange={(e) => setLocationUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="res-cost">购入成本({currency === "USD" ? "美元" : "元"})</Label>
              <div className="flex items-center gap-1.5">
                <Input
                  id="res-cost"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(e.target.value)}
                  placeholder="0"
                  className="min-w-0 flex-1"
                />
                <div role="group" aria-label="币种" className="flex shrink-0 rounded-lg border border-border">
                  {(["CNY", "USD"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={currency === c}
                      onClick={() => setCurrency(c)}
                      className={cn(
                        "px-2.5 py-2 text-xs font-medium transition-colors first:rounded-l-[7px] last:rounded-r-[7px]",
                        currency === c
                          ? "bg-foreground text-background"
                          : "bg-card text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {c === "CNY" ? "¥" : "$"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="res-notes">备注</Label>
            <Textarea
              id="res-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="其他需要记录的信息"
              className="min-h-20"
            />
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting || !name.trim()} className="w-full">
        {submitting ? "保存中…" : activateNow && canActivate ? "登记并激活" : "登记为待复审"}
      </Button>
    </form>
  )
}
