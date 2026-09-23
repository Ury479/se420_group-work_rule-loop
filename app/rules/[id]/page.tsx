import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  FileText,
  Info,
  Search,
  ShieldCheck,
  Swords,
  Target,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react"
import { getRule, getRuleValidations } from "@/app/actions/rules"
import { HudPanel, MeterBar, StatTile, StatusPill, toneText } from "@/components/hud"
import { RuleDetailActions } from "@/components/rule-detail-actions"
import { cn } from "@/lib/utils"

export default async function RuleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ruleId = Number(id)
  if (!Number.isInteger(ruleId)) notFound()
  const rule = await getRule(ruleId)
  if (!rule) notFound()

  const matched = rule.matchCount ?? 0
  const acted = rule.actedCount ?? 0
  const validated = rule.validatedCount ?? 0
  const helpful = rule.helpfulCount ?? 0
  const improveRate = acted > 0 ? Math.round((helpful / acted) * 100) : 0
  const verified = validated >= 3 && helpful > 0

  // 验证战报:来自 choice_validations 的真实记录,不再用计数造行
  const reports = await getRuleValidations(ruleId)

  return (
    <main className="w-full">
      <header className="flex items-center justify-between gap-3">
        <Link href="/rules" className="inline-flex min-h-11 items-center gap-2 text-sm">
          <ArrowLeft className="size-5" aria-hidden="true" />
          规则详情
        </Link>
        <StatusPill tone={rule.isActive ? "green" : "muted"} dot>
          {rule.isActive ? "启用中" : "已暂停"}
        </StatusPill>
      </header>

      {/* 规则宣言:徽章 + 衬线大字 + 证据成色 */}
      <HudPanel className="mt-4 flex flex-col items-center gap-4 px-5 py-7 text-center">
        <span className={cn("relative flex size-20 items-center justify-center", toneText("gold"))}>
          <svg viewBox="0 0 48 48" className="absolute inset-0 size-full" aria-hidden="true">
            <path
              d="M24 3 43 10v15c0 10-9 17-19 20C14 42 5 35 5 25V10Z"
              fill="currentColor"
              fillOpacity={0.14}
              stroke="currentColor"
              strokeWidth={2}
            />
          </svg>
          <span className="relative font-serif text-2xl font-bold tabular-nums">{validated}</span>
        </span>

        <h1 className="hud-glow font-serif text-2xl font-semibold leading-relaxed tracking-wide text-balance text-primary md:text-3xl">
          {rule.ruleText}
        </h1>

        <span className="flex w-full items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-primary/30" />
          <span className="size-1.5 rotate-45 bg-primary/60" />
          <span className="h-px flex-1 bg-primary/30" />
        </span>

        <p className={cn("flex items-center gap-2 font-medium", verified ? "text-success" : "text-muted-foreground")}>
          <ShieldCheck className="size-5" aria-hidden="true" />
          {verified ? `有效 · ${validated}次真实验证` : `待观察 · ${validated}次验证`}
        </p>
      </HudPanel>

      <HudPanel aria-label="规则指标" className="mt-4 p-0">
        <dl className="grid grid-cols-4 divide-x divide-border py-4">
          <StatTile icon={Zap} tone="red" label="触发" value={matched} />
          <StatTile icon={Target} tone="gold" label="遵守" value={acted} />
          <StatTile icon={Search} tone="purple" label="验证" value={validated} />
          <StatTile icon={TrendingUp} tone="blue" label="改善" value={helpful} />
        </dl>
        <div className="border-t border-border px-4 py-3">
          <MeterBar label="改善率" value={improveRate} tone="gold" valueLabel={`${improveRate}%`} />
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="size-3.5" aria-hidden="true" />
            按遵守次数计算
          </p>
        </div>
      </HudPanel>

      <HudPanel aria-labelledby="tactic-title" className="mt-4">
        <h2 id="tactic-title" className="flex items-center gap-2 text-base font-semibold">
          <Swords className="size-5 text-primary" aria-hidden="true" />
          战术动作
        </h2>
        <p className="mt-3 text-sm leading-relaxed">
          <span className="text-primary">最小行动:</span> {rule.principleText ?? "补充一个 30 秒内能做完的动作。"}
        </p>
        <ul className="mt-3 flex flex-col border-t border-border">
          <SourceRow icon={FileText} label="来源事件" value={rule.scenario ?? "未关联"} href="/event-library" />
          <SourceRow icon={BookOpen} label="来源复盘" value={rule.principleText ?? "未关联"} href="/spending-review" />
        </ul>
      </HudPanel>

      <HudPanel aria-labelledby="report-title" className="mt-4">
        <h2 id="report-title" className="flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
          验证战报
        </h2>
        {reports.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">还没有验证记录。下一次触发时记录一次,就能开始积累证据。</p>
        ) : (
          <ol className="mt-3 flex flex-col">
            {reports.map((item, index) => (
              <li key={item.id} className="flex gap-3 border-t border-border py-3.5">
                <span className="flex flex-col items-center">
                  <span className={cn("shrink-0", item.good ? "text-success" : "text-destructive")}>
                    {item.good ? <ShieldCheck className="size-6" aria-hidden="true" /> : <XCircle className="size-6" aria-hidden="true" />}
                  </span>
                  {index < reports.length - 1 ? (
                    <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />
                  ) : null}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <time className="font-mono text-sm text-muted-foreground">
                      {new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(new Date(item.validatedAt))}
                    </time>
                    <StatusPill tone={item.good ? "green" : "red"}>{item.title}</StatusPill>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </HudPanel>

      <Link
        href={`/rules/${rule.id}/confirm`}
        className="hud-cta mt-5 flex min-h-14 items-center justify-center gap-2.5 rounded-lg text-lg font-bold transition-opacity hover:opacity-90"
      >
        <ShieldCheck className="size-5" aria-hidden="true" />
        记录一次验证
      </Link>

      <RuleDetailActions ruleId={rule.id} ruleText={rule.ruleText} isActive={rule.isActive} />
    </main>
  )
}

function SourceRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof FileText
  label: string
  value: string
  href: string
}) {
  return (
    <li>
      <Link href={href} className="flex min-h-12 items-center gap-2.5 text-sm transition-colors hover:text-primary">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="shrink-0 text-muted-foreground">{label}:</span>
        <span className="min-w-0 flex-1 truncate text-info">{value}</span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  )
}


