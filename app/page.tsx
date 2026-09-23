import Link from "next/link"
import { Suspense } from "react"
import {
  ArrowRight,
  Brain,
  Calculator,
  CircleUserRound,
  ClipboardList,
  Clock,
  FileText,
  HardDrive,
  HelpCircle,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react"
import { getConfirmations } from "@/app/actions/confirmations"
import { getRules } from "@/app/actions/rules"
import { DayPhaseGate } from "@/components/day-phase-gate"
import { HudPanel, IconTile, LoopTrack, StatusPill, type HudTone, type LoopItem } from "@/components/hud"
import { TranslateToggle } from "@/components/page-translator"

function formatDate(value: Date | string | null) {
  if (!value) return "时间待定"
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value))
}

const TOTAL_STEPS = 3

// 主线任务进度:pending 只记录了事件,armed/checking 已进入复盘,confirmed 才算闭环
function stepOf(status: string | undefined) {
  if (status === "confirmed") return TOTAL_STEPS
  if (status === "armed" || status === "checking") return 2
  return 1
}

export default async function DashboardPage() {
  const [confirmations, rules] = await Promise.all([getConfirmations(), getRules()])
  const active = confirmations.find((item) => ["pending", "armed", "checking"].includes(item.status))
  const recent = confirmations.slice(0, 3)
  const activeRules = rules.filter((rule) => rule.isActive)
  const watchingRules = rules.filter((rule) => !rule.isActive)
  const pending = confirmations.filter((item) => ["pending", "armed", "checking"].includes(item.status)).length
  const improved = rules.reduce((sum, rule) => sum + (rule.helpfulCount ?? 0), 0)
  const step = stepOf(active?.status)

  const loop: LoopItem[] = [
    { shape: "circle", tone: "green", icon: FileText, label: "已记录", sublabel: "事件", done: true },
    {
      shape: "diamond",
      tone: "gold",
      icon: Search,
      label: step >= 2 ? "复盘中" : "待复盘",
      sublabel: "决策",
      done: step >= 2,
      active: true,
    },
    { shape: "square", tone: "muted", icon: Pencil, label: activeRules.length > 0 ? "已形成" : "待形成", sublabel: "规则", done: activeRules.length > 0 },
    { shape: "shield", tone: "muted", icon: HelpCircle, label: improved > 0 ? "已验证" : "待验证", sublabel: "证据" },
  ]

  return (
    <main className="w-full">
      <Suspense fallback={null}>
        <DayPhaseGate />
      </Suspense>

      <header className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2.5">
          <RefreshCw className="size-7 shrink-0 text-primary" aria-hidden="true" />
          <span className="font-serif text-2xl font-semibold tracking-wide">
            RuleLoop <span className="text-muted-foreground">· 决策回路</span>
          </span>
        </p>
        <span className="flex shrink-0 items-center gap-2">
          <TranslateToggle />
          <StatusPill tone="muted">
            <HardDrive className="size-3.5" aria-hidden="true" />
            账户私有
          </StatusPill>
          <Link
            href="/settings"
            aria-label="个人设置"
            className="flex size-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary lg:hidden"
          >
            <CircleUserRound className="size-5" aria-hidden="true" />
          </Link>
        </span>
      </header>

      {/* 主线任务:整页唯一的金色主行动 */}
      <HudPanel aria-labelledby="today-title" className="mt-4 border-primary/45 p-5">
        <p className="flex items-center gap-2 text-sm text-primary">
          <Target className="size-4" aria-hidden="true" />
          当前主线任务
        </p>
        <h1 id="today-title" className="hud-glow mt-2 font-serif text-3xl font-semibold leading-tight text-balance text-primary">
          {active?.title ?? "从第一条记录开始"}
        </h1>
        {active ? (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              进度 <span className="tabular-nums text-foreground">{step}/{TOTAL_STEPS}</span>
            </p>
            <span className="mt-3 flex gap-2" role="img" aria-label={`进度 ${step} / ${TOTAL_STEPS}`}>
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <span
                  key={i}
                  className={`h-2.5 flex-1 rounded-sm ${i < step ? "bg-primary" : "border border-border bg-muted"}`}
                  aria-hidden="true"
                />
              ))}
            </span>
          </>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">还没有记录。先记录一件需要确认的事。</p>
        )}
        <Link
          href={active ? `/critical-confirmations/${active.id}` : "/arm"}
          className="hud-cta mt-4 flex min-h-14 items-center justify-between rounded-lg px-5 text-lg font-bold transition-opacity hover:opacity-90"
        >
          {active ? "继续复盘" : "开始记录"}
          <ArrowRight className="size-5" aria-hidden="true" />
        </Link>
      </HudPanel>

      <section aria-labelledby="loop-title" className="mt-6">
        <h2 id="loop-title" className="flex items-center gap-2 text-lg font-semibold">
          <RefreshCw className="size-5 text-muted-foreground" aria-hidden="true" />
          行为闭环
        </h2>
        <LoopTrack items={loop} className="mt-4" />
      </section>

      <section aria-label="闭环指标" className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <dl className="grid grid-cols-2 divide-x divide-y divide-border">
          <MetricCell icon={ClipboardList} tone="red" label="待复盘" value={pending} />
          <MetricCell icon={Brain} tone="purple" label="待观察规则" value={watchingRules.length} />
          <MetricCell icon={ShieldCheck} tone="green" label="有效规则" value={activeRules.length} />
          <MetricCell icon={TrendingUp} tone="blue" label="改善" value={improved} suffix="次" />
        </dl>
      </section>

      <Link
        href="/convert"
        className="mt-5 flex min-h-16 items-center gap-4 rounded-xl border border-border bg-card px-5 py-3 shadow-card transition-colors hover:border-primary/50"
      >
        <IconTile icon={Calculator} tone="gold" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">想付款之前,先换算一次</span>
          <span className="text-sm text-muted-foreground">把金额换成你在意的东西,并给自己一个冷静期</span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>

      <HudPanel aria-labelledby="recent-title" className="mt-5 p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 id="recent-title" className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="size-5 text-muted-foreground" aria-hidden="true" />
            最近轨迹
          </h2>
          <span className="text-sm text-muted-foreground">本周期</span>
        </div>
        <ul className="border-t border-border">
          {recent.map((item, index) => {
            const marks: { icon: typeof Search; tone: HudTone; text: string }[] = [
              { icon: Search, tone: "gold", text: "复盘中" },
              { icon: Brain, tone: "purple", text: "已关联规则" },
              { icon: ShieldCheck, tone: "green", text: "已存档" },
            ]
            const mark = marks[Math.min(index, 2)]
            return (
              <li key={item.id} className="border-b border-border last:border-b-0">
                <Link
                  href={item.id > 0 ? `/critical-confirmations/${item.id}` : "/spending-review"}
                  className="flex min-h-16 items-center gap-3 px-5 transition-colors hover:bg-accent/50"
                >
                  <IconTile icon={mark.icon} tone={mark.tone} className="size-9" />
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <StatusPill tone={mark.tone} dot className="hidden shrink-0 sm:inline-flex">
                    {mark.text}
                  </StatusPill>
                  <time className="hidden shrink-0 font-mono text-xs text-muted-foreground md:block">
                    {formatDate(item.createdAt)}
                  </time>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
          {recent.length === 0 ? (
            <li className="px-5 py-6 text-sm text-muted-foreground">暂无记录，新的行动会出现在这里。</li>
          ) : null}
        </ul>
      </HudPanel>
    </main>
  )
}

function MetricCell({
  icon,
  tone,
  label,
  value,
  suffix,
}: {
  icon: typeof Brain
  tone: HudTone
  label: string
  value: number
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <IconTile icon={icon} tone={tone} className="size-11 rounded-full" />
      <div className="min-w-0">
        <dt className="truncate text-sm text-muted-foreground">{label}</dt>
        <dd className="font-serif text-3xl leading-none tabular-nums">
          {value}
          {suffix ? <span className="ml-1 font-sans text-xs text-muted-foreground">{suffix}</span> : null}
        </dd>
      </div>
    </div>
  )
}
