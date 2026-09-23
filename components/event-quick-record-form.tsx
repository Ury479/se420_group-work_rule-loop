"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen,
  Clock,
  CloudUpload,
  Ellipsis,
  HeartPulse,
  Hexagon,
  ScrollText,
  ShoppingBag,
  TriangleAlert,
  Users,
} from "lucide-react"
import { createEventCase } from "@/app/actions/event-library"
import { Button } from "@/components/ui/button"
import { HudPanel } from "@/components/hud"
import { EVENT_TYPES, EVENT_SCENES, EVENT_STATUSES } from "@/lib/event-library-types"
import { cn } from "@/lib/utils"

const DRAFT_KEY = "event-quick-record-draft"

// 场景属性 chip:映射到既有 eventType / scene 枚举,不新造分类
const SCENE_CHIPS = [
  { key: "study", label: "学习/工作", icon: BookOpen, eventType: "study", scene: "classroom" },
  { key: "time", label: "时间", icon: Clock, eventType: "decision", scene: "custom" },
  { key: "spend", label: "消费", icon: ShoppingBag, eventType: "consumption", scene: "custom" },
  { key: "people", label: "人际", icon: Users, eventType: "relationship", scene: "custom" },
  { key: "health", label: "健康", icon: HeartPulse, eventType: "health", scene: "gym" },
  { key: "other", label: "其他", icon: Ellipsis, eventType: "lost_item", scene: "transportation" },
] as const

const IMPACT_LEVELS = [
  { value: "low", label: "低", desc: "几乎无影响", tone: "text-success", ring: "border-success bg-success/10" },
  { value: "mid", label: "中", desc: "需要补救", tone: "text-primary", ring: "border-primary bg-primary/10" },
  { value: "high", label: "高", desc: "明显损失", tone: "text-destructive", ring: "border-destructive bg-destructive/10" },
] as const

type Draft = {
  title: string
  sceneChip: string
  eventType: string
  scene: string
  status: string
  impactLevel: "low" | "mid" | "high"
  isRepeat: boolean | null
  itemName: string
  moneyLoss: string
  searchMinutes: string
  tags: string
}

const EMPTY: Draft = {
  title: "",
  sceneChip: "study",
  eventType: "study",
  scene: "classroom",
  status: "searching",
  impactLevel: "low",
  isRepeat: null,
  itemName: "",
  moneyLoss: "",
  searchMinutes: "",
  tags: "",
}

export function EventQuickRecordForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [restored, setRestored] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showOptional, setShowOptional] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 挂载时恢复草稿。localStorage 仅客户端可读,不能放进 useState 初始化
  // (会造成 SSR 水合不一致),只能在挂载后一次性 setState,该渲染发生在绘制前。
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Draft>
        if (parsed.title || parsed.itemName) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setDraft({ ...EMPTY, ...parsed })
          setRestored(true)
          setSaved(true)
        }
      }
    } catch {}
  }, [])

  function update(patch: Partial<Draft>) {
    setDraft((prev) => {
      const next = { ...prev, ...patch }
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
          setSaved(true)
        } catch {}
      }, 400)
      return next
    })
  }

  function clearDraft() {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {}
  }

  const needsReview = draft.impactLevel === "high" && draft.isRepeat === true

  function handleSubmit(startReview: boolean) {
    setError(null)
    if (!draft.title.trim()) {
      setError("先写一句发生了什么")
      return
    }
    if (draft.isRepeat === null) {
      setError("请选择这类事件是否发生过")
      return
    }
    startTransition(async () => {
      const result = await createEventCase({
        title: draft.title.trim().slice(0, 200),
        eventType: draft.eventType,
        scene: draft.scene,
        status: draft.status,
        itemName: draft.itemName.trim() || null,
        moneyLoss: Number.parseInt(draft.moneyLoss, 10) || 0,
        searchMinutes: Number.parseInt(draft.searchMinutes, 10) || 0,
        tags: draft.tags.trim() || null,
        impactLevel: draft.impactLevel,
        isRepeat: draft.isRepeat === true,
      })
      if ("error" in result && result.error) {
        setError(result.error)
        return
      }
      clearDraft()
      if ("eventCase" in result && result.eventCase) {
        if (startReview) {
          router.push(`/reviews/new?eventId=${result.eventCase.id}`)
        } else {
          router.push(`/event-library/${result.eventCase.id}`)
        }
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 草稿状态行 */}
      <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
        <CloudUpload className="size-3.5" aria-hidden="true" />
        {saved ? "草稿已保存" : "自动保存草稿"}
      </div>

      {restored && (
        <p className="rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">
          已恢复上次未提交的草稿,内容不会丢失。
        </p>
      )}

      {/* 发生了什么 */}
      <HudPanel className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span className="hud-tile flex size-9 items-center justify-center rounded-lg text-primary">
            <ScrollText className="size-4.5" aria-hidden="true" />
          </span>
          <label htmlFor="ev-title" className="text-base font-semibold">
            发生了什么?
          </label>
        </div>
        <textarea
          id="ev-title"
          value={draft.title}
          onChange={(e) => update({ title: e.target.value.slice(0, 200) })}
          placeholder="例如:又一次熬夜到2点,白天完全没状态"
          rows={3}
          className="w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-right text-xs tabular-nums text-muted-foreground">{draft.title.length}/200</p>
      </HudPanel>

      {/* 场景属性 */}
      <HudPanel className="flex flex-col gap-3">
        <p className="text-base font-semibold">场景属性</p>
        <div className="grid grid-cols-3 gap-2">
          {SCENE_CHIPS.map((chip) => {
            const Icon = chip.icon
            const selected = draft.sceneChip === chip.key
            return (
              <button
                key={chip.key}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  update({ sceneChip: chip.key, eventType: chip.eventType, scene: chip.scene })
                }
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-sm transition-colors",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/30",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {chip.label}
              </button>
            )
          })}
        </div>
      </HudPanel>

      {/* 影响等级 */}
      <HudPanel className="flex flex-col gap-3">
        <fieldset>
          <legend className="text-base font-semibold">影响等级</legend>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {IMPACT_LEVELS.map((level) => {
              const selected = draft.impactLevel === level.value
              return (
                <button
                  key={level.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => update({ impactLevel: level.value })}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3.5 transition-colors",
                    selected ? level.ring : "border-border bg-background hover:border-foreground/30",
                  )}
                >
                  <span className={cn("relative flex items-center justify-center", level.tone)}>
                    <Hexagon className="size-8" aria-hidden="true" />
                    <span className="absolute text-sm font-bold">{level.label}</span>
                  </span>
                  <span className={cn("text-xs", selected ? level.tone : "text-muted-foreground")}>
                    {level.desc}
                  </span>
                  <span
                    className={cn(
                      "size-3 rounded-full border-2",
                      selected ? cn("border-current", level.tone) : "border-border",
                    )}
                    aria-hidden="true"
                  >
                    {selected ? <span className="block size-full scale-50 rounded-full bg-current" /> : null}
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>
      </HudPanel>

      {/* 是否重复 */}
      <HudPanel className="flex flex-col gap-3">
        <fieldset>
          <legend className="text-base font-semibold">这类事件发生过吗?</legend>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={draft.isRepeat === false}
              onClick={() => update({ isRepeat: false })}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border px-3 py-3.5 transition-colors",
                draft.isRepeat === false
                  ? "border-info bg-info/10 text-info"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/30",
              )}
            >
              <span className="text-sm font-semibold">第一次</span>
              <span className="text-xs">新出现的情况</span>
            </button>
            <button
              type="button"
              aria-pressed={draft.isRepeat === true}
              onClick={() => update({ isRepeat: true })}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border px-3 py-3.5 transition-colors",
                draft.isRepeat === true
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/30",
              )}
            >
              <span className="text-sm font-semibold">曾经发生过</span>
              <span className="text-xs">重复出现的模式</span>
            </button>
          </div>
        </fieldset>
      </HudPanel>

      {/* 高影响 + 重复 → 复盘队列警示 */}
      {needsReview && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-destructive">将进入复盘队列</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              高影响且重复出现的事件,保存后建议立即完成一次复盘,把它变成规则。
            </p>
          </div>
        </div>
      )}

      {/* 补充选填区 */}
      <button
        type="button"
        onClick={() => setShowOptional((v) => !v)}
        className="self-start text-xs text-muted-foreground underline underline-offset-2"
      >
        {showOptional ? "收起补充项" : "补充后果与当时状态(物品/损失/耗时/标签)"}
      </button>

      {showOptional && (
        <HudPanel className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-medium">事件类型</legend>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => update({ eventType: t.value })}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs transition-colors",
                    draft.eventType === t.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/30",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-medium">具体场景</legend>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_SCENES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => update({ scene: s.value })}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs transition-colors",
                    draft.scene === s.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/30",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-medium">当前状态</legend>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => update({ status: s.value })}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs transition-colors",
                    draft.status === s.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/30",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ev-item" className="text-sm font-medium">
              涉及物品
            </label>
            <input
              id="ev-item"
              type="text"
              value={draft.itemName}
              onChange={(e) => update({ itemName: e.target.value })}
              placeholder="例如:手机"
              className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-loss" className="text-sm font-medium">
                金钱损失(元)
              </label>
              <input
                id="ev-loss"
                type="number"
                min={0}
                value={draft.moneyLoss}
                onChange={(e) => update({ moneyLoss: e.target.value })}
                placeholder="0"
                className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {Number(draft.moneyLoss) > 0 && (
                <a
                  href={`/convert?amount=${encodeURIComponent(draft.moneyLoss)}&stage=spent`}
                  className="text-xs text-muted-foreground underline underline-offset-2"
                >
                  换算这笔金额的机会成本
                </a>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ev-minutes" className="text-sm font-medium">
                寻找耗时(分钟)
              </label>
              <input
                id="ev-minutes"
                type="number"
                min={0}
                value={draft.searchMinutes}
                onChange={(e) => update({ searchMinutes: e.target.value })}
                placeholder="0"
                className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ev-tags" className="text-sm font-medium">
              标签(逗号分隔)
            </label>
            <input
              id="ev-tags"
              type="text"
              value={draft.tags}
              onChange={(e) => update({ tags: e.target.value })}
              placeholder="例如:健身房,手机"
              className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </HudPanel>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Button onClick={() => handleSubmit(true)} disabled={isPending} className="hud-cta h-11 w-full text-base">
          {isPending ? "保存中…" : "保存并开始复盘"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => handleSubmit(false)}
          disabled={isPending}
          className="w-full text-muted-foreground"
        >
          仅保存,稍后复盘
        </Button>
      </div>
    </div>
  )
}
