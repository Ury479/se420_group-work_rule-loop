import Link from "next/link"
import { ArrowRight, Ban, Calculator, PiggyBank, Receipt, Settings2, ShieldCheck, Timer, type LucideIcon } from "lucide-react"
import { HudHeader, HudPanel, StatusPill, toneText, type HudTone } from "@/components/hud"
import {
  getConversionPreferences,
  getConversionSummary,
  getConversions,
  getEnabledCatalogItems,
} from "@/app/actions/spend-conversion"
import { ConvertForm } from "@/components/convert-form"
import {
  DECISION_STAGE_LABEL,
  RESOLUTION_LABEL,
  formatCny,
  formatMinorCompact,
  isCooldownOver,
  type DecisionStage,
  type Resolution,
} from "@/lib/convert-domain"

export const metadata = { title: "消费换算 | 决策拦截台" }

function formatTime(value: Date | string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(value),
  )
}

export default async function ConvertPage({
  searchParams,
}: {
  searchParams: Promise<{ amount?: string; stage?: string }>
}) {
  const { amount, stage } = await searchParams
  const [items, conversions, summary, prefs] = await Promise.all([
    getEnabledCatalogItems(),
    getConversions(20),
    getConversionSummary(),
    getConversionPreferences(),
  ])

  const defaultItemIds = (() => {
    try {
      const parsed: unknown = JSON.parse(prefs.defaultCatalogItemIdsJson)
      return Array.isArray(parsed) ? parsed.filter((v): v is number => typeof v === "number") : []
    } catch {
      return []
    }
  })()

  return (
    <main className="flex flex-col gap-5">
      <HudHeader
        icon={Calculator}
        tone="gold"
        eyebrow="RuleLoop · Spend Converter"
        title="先把金额变得具体"
        description="把一笔金额换成你真正在意的东西,然后给自己一个冷静期。这里不评价消费值不值,只帮你在付款前多看一眼。"
      />

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          价值目录是空的。请先到
          <Link href="/convert/catalog" className="mx-1 underline">
            价值目录
          </Link>
          添加至少一个比较项。
        </p>
      ) : (
        <ConvertForm
          items={items}
          defaultItemIds={defaultItemIds}
          initialAmount={/^\d+(\.\d{1,2})?$/.test(amount ?? "") ? amount : undefined}
          initialStage={stage === "spent" || stage === "considering" ? stage : undefined}
          prefs={{
            usdToCnyRate: prefs.usdToCnyRate,
            defaultCooldownMinutes: prefs.defaultCooldownMinutes,
            highImpactThresholdMinor: prefs.highImpactThresholdMinor,
            privacyMode: prefs.privacyMode,
          }}
        />
      )}

      <HudPanel aria-labelledby="convert-summary" accent="green" className="p-5">
        <h2 id="convert-summary" className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="size-5 text-success" aria-hidden="true" />
          派生摘要
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            icon={ShieldCheck}
            tone="green"
            label="保护金额"
            value={formatCny(summary.protectedMinor)}
            hint="未发生的支出,不是账户余额"
          />
          <Stat
            icon={PiggyBank}
            tone="blue"
            label="实际转向"
            value={formatCny(summary.redirectedMinor)}
            hint="你确认已放进目标预算的钱"
          />
          <Stat icon={Ban} tone="purple" label="已放弃" value={`${summary.avoidedCount} 次`} />
          <Stat icon={Receipt} tone="red" label="历史支出" value={formatCny(summary.historySpentMinor)} />
        </dl>
        <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
          保护金额只表示支出没有发生,不代表这笔钱已经存下或赚到。
        </p>
      </HudPanel>

      <section aria-labelledby="convert-history" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="convert-history" className="flex items-center gap-2 text-lg font-semibold">
            <Receipt className="size-5 text-muted-foreground" aria-hidden="true" />
            换算历史
          </h2>
          <Link
            href="/convert/catalog"
            className="flex min-h-11 items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Settings2 className="size-3.5" aria-hidden="true" />
            价值目录与汇率
          </Link>
        </div>
        {conversions.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
            还没有换算记录。第一次换算完成后,这里会保留当时的价格与汇率快照。
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {conversions.map((row) => {
              const cooling = row.cooldownEndsAt !== null && !row.resolution && !isCooldownOver(row.cooldownEndsAt)
              return (
                <li key={row.id}>
                  <Link
                    href={`/convert/${row.id}`}
                    prefetch={true}
                    className="shadow-card flex min-h-16 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/50"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="truncate text-sm font-medium">
                        {row.privacyLabel}换算 · ¥{formatMinorCompact(row.plannedAmountMinor)}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground tabular-nums">
                        {formatTime(row.createdAt)} · {DECISION_STAGE_LABEL[row.decisionStage as DecisionStage]}
                        {row.protectedAmountMinor > 0 ? ` · 保护 ${formatCny(row.protectedAmountMinor)}` : ""}
                      </p>
                    </div>
                    <StatusPill
                      tone={row.resolution ? "green" : cooling ? "gold" : row.decisionStage === "spent" ? "red" : "muted"}
                      dot={!cooling}
                      className="shrink-0"
                    >
                      {cooling ? <Timer className="size-3" aria-hidden="true" /> : null}
                      {row.resolution
                        ? RESOLUTION_LABEL[row.resolution as Resolution]
                        : cooling
                          ? "冷静期中"
                          : row.decisionStage === "spent"
                            ? "历史支出"
                            : "待决定"}
                    </StatusPill>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}

function Stat({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: LucideIcon
  tone: HudTone
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-background/40 px-3 py-2.5">
      <dt className={`flex items-center gap-1.5 text-xs ${toneText(tone)}`}>
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </dt>
      <dd className="font-serif text-lg font-semibold leading-none tabular-nums">{value}</dd>
      {hint ? <p className="text-[0.68rem] leading-snug text-muted-foreground/80">{hint}</p> : null}
    </div>
  )
}
