import type { LucideIcon } from "lucide-react"
import { TranslateToggle } from "@/components/page-translator"
import { cn } from "@/lib/utils"

// 决策 HUD 的共享视觉原件:节点、指标块、进度条、状态徽章。
// 所有语义色都走静态类名映射,避免 Tailwind 无法静态分析动态拼接的类。

export type HudTone = "gold" | "green" | "red" | "purple" | "blue" | "muted"

const TONE_TEXT: Record<HudTone, string> = {
  gold: "text-primary",
  green: "text-success",
  red: "text-destructive",
  purple: "text-spirit",
  blue: "text-info",
  muted: "text-muted-foreground",
}

const TONE_FILL: Record<HudTone, string> = {
  gold: "bg-primary",
  green: "bg-success",
  red: "bg-destructive",
  purple: "bg-spirit",
  blue: "bg-info",
  muted: "bg-muted-foreground",
}

const TONE_EDGE: Record<HudTone, string> = {
  gold: "border-l-primary",
  green: "border-l-success",
  red: "border-l-destructive",
  purple: "border-l-spirit",
  blue: "border-l-info",
  muted: "border-l-border",
}

export function toneText(tone: HudTone) {
  return TONE_TEXT[tone]
}

/** HUD 面板:统一的卡片容器,可选左侧语义色描边 */
export function HudPanel({
  children,
  className,
  accent,
  ...rest
}: React.ComponentProps<"section"> & { accent?: HudTone }) {
  return (
    <section
      {...rest}
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-card",
        accent && cn("border-l-[3px]", TONE_EDGE[accent]),
        className,
      )}
    >
      {children}
    </section>
  )
}

/** 页面标题栏:图标底座 + 代号 + 标题 + 说明,全站统一 */
export function HudHeader({
  icon,
  tone = "gold",
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  tone?: HudTone
  eyebrow?: string
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn("flex flex-col gap-3 border-b border-border pb-5", className)}>
      <div className="flex items-start gap-3">
        <IconTile icon={icon} tone={tone} className="size-11" />
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
          ) : null}
          <h1 className="font-serif text-2xl font-semibold leading-tight text-balance md:text-3xl">{title}</h1>
        </div>
        {/* 语言切换固定在页面状态标记左侧,全站位置一致 */}
        <div className="flex shrink-0 items-center gap-2">
          <TranslateToggle />
          {action}
        </div>
      </div>
      {description ? <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p> : null}
    </header>
  )
}

/** 语义色图标底座 */
export function IconTile({
  icon: Icon,
  tone = "gold",
  className,
}: {
  icon: LucideIcon
  tone?: HudTone
  className?: string
}) {
  return (
    <span
      className={cn(
        "hud-tile flex size-10 shrink-0 items-center justify-center rounded-lg",
        TONE_TEXT[tone],
        className,
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </span>
  )
}

/** 状态徽章 */
export function StatusPill({
  tone = "muted",
  dot = false,
  children,
  className,
}: {
  tone?: HudTone
  dot?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "hud-tile inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        TONE_TEXT[tone],
        className,
      )}
    >
      {dot ? <span className={cn("size-1.5 rounded-full", TONE_FILL[tone])} aria-hidden="true" /> : null}
      {children}
    </span>
  )
}

/** 指标块:图标 + 名称 + 大数字 */
export function StatTile({
  icon: Icon,
  tone = "gold",
  label,
  value,
  suffix,
}: {
  icon?: LucideIcon
  tone?: HudTone
  label: string
  value: React.ReactNode
  suffix?: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-1 text-center">
      <span className={cn("flex items-center gap-1.5 text-xs", TONE_TEXT[tone])}>
        {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
        {label}
      </span>
      <span className="font-serif text-2xl leading-none tabular-nums">
        {value}
        {suffix ? <span className="ml-1 text-xs font-sans text-muted-foreground">{suffix}</span> : null}
      </span>
    </div>
  )
}

/** 带标签的进度条 */
export function MeterBar({
  label,
  value,
  max = 100,
  tone = "gold",
  valueLabel,
  icon: Icon,
}: {
  label?: string
  value: number
  max?: number
  tone?: HudTone
  valueLabel?: string
  icon?: LucideIcon
}) {
  const pct = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0
  return (
    <div className="flex items-center gap-3">
      {label ? (
        <span className="flex min-w-0 shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
          {Icon ? <Icon className={cn("size-4", TONE_TEXT[tone])} aria-hidden="true" /> : null}
          <span className="truncate">{label}</span>
        </span>
      ) : null}
      <span
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
      >
        <span className={cn("block h-full rounded-full", TONE_FILL[tone])} style={{ width: `${pct}%` }} />
      </span>
      {valueLabel ? (
        <span className={cn("shrink-0 text-sm font-semibold tabular-nums", TONE_TEXT[tone])}>{valueLabel}</span>
      ) : null}
    </div>
  )
}

/** 分段属性条(战力 / 精神 / 节律 / 认知) */
export function SegmentedMeter({
  filled,
  total = 5,
  tone = "gold",
  label,
}: {
  filled: number
  total?: number
  tone?: HudTone
  label?: string
}) {
  return (
    <span className="flex gap-1" role="img" aria-label={label ?? `${filled} / ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn("h-1.5 w-4 rounded-sm", i < filled ? TONE_FILL[tone] : "bg-muted")}
          aria-hidden="true"
        />
      ))}
    </span>
  )
}

export type LoopShape = "circle" | "diamond" | "square" | "shield" | "hexagon"

// 节点外形用 SVG 描边绘制:clip-path 会裁掉描边,SVG 能保证 1.5px 轮廓清晰
const SHAPE_PATH: Record<LoopShape, string> = {
  circle: "M24 3a21 21 0 1 0 0 42a21 21 0 1 0 0-42Z",
  diamond: "M24 3 45 24 24 45 3 24Z",
  square: "M12 4h24a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8H12a8 8 0 0 1-8-8V12a8 8 0 0 1 8-8Z",
  shield: "M24 3 43 10v15c0 10-9 17-19 20C14 42 5 35 5 25V10Z",
  hexagon: "M24 3 42 13.5v21L24 45 6 34.5v-21Z",
}

export type LoopItem = {
  shape: LoopShape
  tone: HudTone
  icon: LucideIcon
  label: string
  sublabel?: string
  /** 已完成:与下一节点之间用实线连接 */
  done?: boolean
  /** 当前节点:轮廓加粗并轻微发光 */
  active?: boolean
}

function LoopNode({ item }: { item: LoopItem }) {
  const { shape, tone, icon: Icon, active } = item
  return (
    <span className={cn("relative flex size-14 items-center justify-center", TONE_TEXT[tone])}>
      <svg viewBox="0 0 48 48" className="absolute inset-0 size-full" aria-hidden="true">
        <path
          d={SHAPE_PATH[shape]}
          fill="currentColor"
          fillOpacity={active ? 0.16 : 0.07}
          stroke="currentColor"
          strokeWidth={active ? 2.4 : 1.5}
          strokeOpacity={active ? 1 : 0.55}
        />
      </svg>
      <Icon className="relative size-5" aria-hidden="true" />
    </span>
  )
}

/** 行为闭环 / 决策科技树:节点 + 连接线 + 名称与状态 */
export function LoopTrack({ items, className }: { items: LoopItem[]; className?: string }) {
  return (
    <ol className={cn("flex items-start", className)}>
      {items.map((item, index) => (
        <li key={item.label} className="flex min-w-0 flex-1 items-start">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <LoopNode item={item} />
            {/* 固定两行高度:英文标签换行时,下方副标题仍与相邻节点齐平 */}
            <span
              className={cn(
                "flex min-h-10 items-start text-center text-sm font-medium leading-tight",
                item.active ? TONE_TEXT[item.tone] : "text-foreground",
              )}
            >
              {item.label}
            </span>
            {item.sublabel ? (
              <span className="text-center text-xs text-muted-foreground">{item.sublabel}</span>
            ) : null}
          </div>
          {index < items.length - 1 ? (
            <span
              aria-hidden="true"
              className={cn(
                "mt-7 h-0 min-w-4 flex-1 border-t",
                item.done ? cn("border-solid", TONE_TEXT[item.tone]) : "border-dashed border-border",
              )}
            />
          ) : null}
        </li>
      ))}
    </ol>
  )
}
