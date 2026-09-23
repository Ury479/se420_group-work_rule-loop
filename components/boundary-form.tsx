"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createBoundary, type BoundaryInput } from "@/app/actions/boundaries"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp, CloudUpload } from "lucide-react"

const SOURCE_OPTIONS = [
  { value: "task", label: "任务" },
  { value: "demand", label: "需求" },
  { value: "project", label: "项目" },
  { value: "study", label: "学业" },
  { value: "relationship", label: "人际" },
  { value: "purchase", label: "消费" },
  { value: "custom", label: "其他" },
] as const

const TIMEBOX_OPTIONS = [
  { value: 10, label: "10 分钟 · 快速判断" },
  { value: 30, label: "30 分钟 · 小验证" },
  { value: 60, label: "60 分钟 · 最小实现" },
  { value: 90, label: "90 分钟 · 高价值深做" },
] as const

const CONFIDENCE_OPTIONS = [
  { value: "high", label: "充分", hint: "可以推进到标准完成" },
  { value: "medium", label: "部分充分", hint: "只允许 30-60 分钟小验证" },
  { value: "low", label: "不足", hint: "禁止重投入,先补关键事实" },
  { value: "unknown", label: "不清楚", hint: "先列 3 个必须确认的信息" },
] as const

// 草稿仅用于防止填写中途丢失,提交成功后即清除
const DRAFT_KEY = "boundary-form-draft"

type DraftShape = {
  title: string
  minimumDoneStandard: string
  opportunityCost: string
  stopCondition: string
  standardDoneDefinition: string
  explicitNonGoals: string
  sourceType: BoundaryInput["sourceType"]
  timebox: 10 | 30 | 60 | 90
  confidence: BoundaryInput["informationConfidence"]
}

const EMPTY_DRAFT: DraftShape = {
  title: "",
  minimumDoneStandard: "",
  opportunityCost: "",
  stopCondition: "",
  standardDoneDefinition: "",
  explicitNonGoals: "",
  sourceType: "task",
  timebox: 30,
  confidence: "unknown",
}

export function BoundaryForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showOptional, setShowOptional] = useState(false)
  const [draft, setDraft] = useState<DraftShape>(EMPTY_DRAFT)
  const [draftRestored, setDraftRestored] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 挂载时恢复草稿:填了一半离开页面也不丢。
  // localStorage 仅客户端可读,不能放进 useState 初始化(会造成 SSR 水合不一致),
  // 只能在挂载后一次性 setState;该二次渲染发生在绘制前,用户无感知。
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<DraftShape>
        const merged = { ...EMPTY_DRAFT, ...saved }
        const hasContent =
          merged.title || merged.minimumDoneStandard || merged.opportunityCost || merged.stopCondition
        if (hasContent) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setDraft(merged)
          setDraftRestored(true)
          if (merged.standardDoneDefinition || merged.explicitNonGoals) setShowOptional(true)
        }
      }
    } catch {}
  }, [])

  // 输入防抖自动保存草稿
  function update<K extends keyof DraftShape>(key: K, value: DraftShape[K]) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value }
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
          setDraftSaved(true)
        } catch {}
      }, 400)
      return next
    })
  }

  function clearDraft() {
    // 先取消尚未触发的防抖写入,防止清除后又被旧定时器写回
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return
    setError(null)

    const title = draft.title.trim()
    const minimumDoneStandard = draft.minimumDoneStandard.trim()
    const opportunityCost = draft.opportunityCost.trim()
    const stopCondition = draft.stopCondition.trim()

    if (!title || !minimumDoneStandard || !opportunityCost || !stopCondition) {
      setError("标题和三个必答问题都需要填写")
      return
    }

    setPending(true)
    const result = await createBoundary({
      title,
      sourceType: draft.sourceType,
      minimumDoneStandard,
      opportunityCost,
      stopCondition,
      standardDoneDefinition: draft.standardDoneDefinition.trim() || null,
      explicitNonGoals: draft.explicitNonGoals.trim() || null,
      timeboxMinutes: draft.timebox,
      informationConfidence: draft.confidence,
    })
    setPending(false)

    if ("error" in result && result.error) {
      setError(result.error)
      return
    }
    if ("boundary" in result && result.boundary) {
      clearDraft()
      router.push(`/boundaries/${result.boundary.id}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {draftRestored && (
        <p className="rounded-md bg-accent px-3 py-2 text-xs leading-relaxed text-accent-foreground">
          已恢复上次未提交的草稿,内容不会丢失。
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">我要做什么?*</Label>
        <Input
          id="title"
          name="title"
          placeholder="例如:新增人际关系筛查台"
          value={draft.title}
          onChange={(e) => update("title", e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>所属场景</Label>
        <div className="flex flex-wrap gap-1.5">
          {SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("sourceType", opt.value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                draft.sourceType === opt.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-accent"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 必填 3 问 */}
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground">必答三问 · 边界先于投入</p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="minimumDoneStandard">1. 最低做到什么程度就算够用?*</Label>
          <Textarea
            id="minimumDoneStandard"
            name="minimumDoneStandard"
            rows={2}
            placeholder="例如:完成关系记录、状态分类、沟通前检查即可"
            value={draft.minimumDoneStandard}
            onChange={(e) => update("minimumDoneStandard", e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="opportunityCost">2. 继续深做会挤占什么更重要的任务?*</Label>
          <Textarea
            id="opportunityCost"
            name="opportunityCost"
            rows={2}
            placeholder="例如:课程复习、P0 数据库迁移、作业提交"
            value={draft.opportunityCost}
            onChange={(e) => update("opportunityCost", e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="stopCondition">3. 什么情况下必须停下来?*</Label>
          <Textarea
            id="stopCondition"
            name="stopCondition"
            rows={2}
            placeholder="例如:完成基础表单和列表后停止,复杂分析进入 Backlog"
            value={draft.stopCondition}
            onChange={(e) => update("stopCondition", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>本次最多投入多久?</Label>
        <div className="flex flex-wrap gap-1.5">
          {TIMEBOX_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("timebox", opt.value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                draft.timebox === opt.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-accent"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>当前信息充分吗?</Label>
        <div className="flex flex-col gap-1.5">
          {CONFIDENCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("confidence", opt.value)}
              className={cn(
                "flex items-baseline gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                draft.confidence === opt.value
                  ? "border-primary bg-accent text-accent-foreground"
                  : "bg-background hover:bg-accent/50"
              )}
            >
              <span className="font-medium">{opt.label}</span>
              <span className="text-xs text-muted-foreground">{opt.hint}</span>
            </button>
          ))}
        </div>
        {(draft.confidence === "low" || draft.confidence === "unknown") && (
          <p className="rounded-md bg-accent px-3 py-2 text-xs leading-relaxed text-accent-foreground">
            当前信息不足,不适合重投入。请先做最小验证,确认关键事实后再决定是否继续。
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowOptional((v) => !v)}
        className="flex items-center gap-1 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {showOptional ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        可选:标准完成定义、本次不做什么
      </button>

      {showOptional && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="standardDoneDefinition">标准完成定义是什么?</Label>
            <Textarea
              id="standardDoneDefinition"
              name="standardDoneDefinition"
              rows={2}
              placeholder="例如:完成页面、数据保存、基础校验、移动端可用"
              value={draft.standardDoneDefinition}
              onChange={(e) => update("standardDoneDefinition", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="explicitNonGoals">本次明确不做什么?</Label>
            <Textarea
              id="explicitNonGoals"
              name="explicitNonGoals"
              rows={2}
              placeholder="例如:不做复杂图谱,不做 RAG,不做多 Agent"
              value={draft.explicitNonGoals}
              onChange={(e) => update("explicitNonGoals", e.target.value)}
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "保存中…" : "创建边界卡"}
        </Button>
        {draftSaved && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CloudUpload className="size-3.5" aria-hidden="true" />
            草稿已自动保存
          </span>
        )}
      </div>
    </form>
  )
}
