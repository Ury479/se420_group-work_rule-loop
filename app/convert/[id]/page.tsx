import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { getConversionDetail } from "@/app/actions/spend-conversion"
import { ConversionCooldownPanel } from "@/components/conversion-cooldown-panel"
import { ConversionDetailActions } from "@/components/conversion-detail-actions"
import { ConversionResolveForm } from "@/components/conversion-resolve-form"
import {
  BILLING_TYPE_LABEL,
  CURRENCY_SYMBOL,
  DECISION_STAGE_LABEL,
  RESOLUTION_LABEL,
  formatCny,
  formatMinor,
  formatMinorCompact,
  formatQuantity,
  formatRemainder,
  isCooldownOver,
  quantityAriaLabel,
  type BillingType,
  type CurrencyCode,
  type DecisionStage,
  type Resolution,
  type SnapshotItem,
} from "@/lib/convert-domain"

export const metadata = { title: "换算结果 | 决策拦截台" }

export default async function ConversionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const conversionId = Number(id)
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(conversionId) || conversionId <= 0) notFound()

  const detail = await getConversionDetail(conversionId)
  if (!detail) notFound()
  const { conversion, snapshot, prefs } = detail

  const stage = conversion.decisionStage as DecisionStage
  const resolution = conversion.resolution as Resolution | null
  const items = snapshot?.items ?? []
  const primary = items.slice(0, 3)
  const folded = items.slice(3)
  const cooling = conversion.cooldownEndsAt !== null && !resolution && !isCooldownOver(conversion.cooldownEndsAt)
  const cooldownDone = conversion.cooldownEndsAt !== null && isCooldownOver(conversion.cooldownEndsAt)
  const showResolve = stage === "considering" && !resolution && (cooldownDone || conversion.cooldownEndsAt === null)

  return (
    <main className="flex flex-col gap-5">
      <Link
        href="/convert"
        className="inline-flex min-h-11 w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回换算
      </Link>

      <header className="shadow-card flex flex-col items-center gap-3 rounded-xl border border-info/40 bg-card px-4 py-6 text-center">
        <p className="rounded-full border border-info/50 bg-info/10 px-3 py-1 text-xs font-medium text-info-foreground/90">
          {`${conversion.privacyLabel}换算`}
        </p>
        <p className="font-mono text-[2.6rem] font-semibold leading-none tabular-nums">
          {CURRENCY_SYMBOL[conversion.inputCurrency as CurrencyCode]}
          {formatMinorCompact(conversion.plannedAmountMinor)}
        </p>
        <p className="text-sm text-muted-foreground">{DECISION_STAGE_LABEL[stage]}</p>
        {snapshot && conversion.inputCurrency !== "CNY" ? (
          <p className="text-sm text-muted-foreground">折算人民币 {formatCny(snapshot.input.cnyAmountMinor)}</p>
        ) : null}
        {prefs.privacyMode === "explicit" && conversion.sensitiveLabel ? (
          <p className="text-sm text-muted-foreground">私密别名:{conversion.sensitiveLabel}</p>
        ) : null}
        {resolution ? (
          <p className="text-sm">
            最终结果:<span className="font-medium">{RESOLUTION_LABEL[resolution]}</span>
          </p>
        ) : null}
      </header>

      {snapshot === null ? (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          这条记录的价格快照无法解析,换算明细不可用。金额与最终结果仍然有效。
        </p>
      ) : (
        <section aria-labelledby="equiv-title" className="flex flex-col gap-3">
          <h2 id="equiv-title" className="text-sm font-semibold tracking-tight">
            这笔金额可以换成
          </h2>
          <ul className="flex flex-col gap-2">
            {primary.map((item, index) => (
              <EquivalentRow key={item.catalogItemId} item={item} highlight rank={index + 1} />
            ))}
          </ul>
          {folded.length > 0 ? (
            <details className="rounded-xl border border-dashed bg-card/60">
              <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm text-muted-foreground">
                {`查看全部比较(${folded.length})`}
              </summary>
              <ul className="flex flex-col gap-2 px-3 pb-3">
                {folded.map((item) => (
                  <EquivalentRow key={item.catalogItemId} item={item} />
                ))}
              </ul>
            </details>
          ) : null}
          {/* 价格快照卡 */}
          <div className="shadow-card flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
            <div className="min-w-0 text-xs leading-relaxed text-muted-foreground">
              <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {`价格快照 · USD/CNY ${Number(snapshot.items.find((i) => i.currency === "USD")?.toCnyRate ?? prefs.usdToCnyRate).toFixed(2)}`}
              </p>
              <p className="mt-0.5">
                {`记录于 ${new Date(snapshot.calculatedAt).toLocaleString("zh-CN", { hour12: false })} · 历史结果不会随目录价格变化。等值只是比较单位,不是购买建议。`}
              </p>
            </div>
          </div>
        </section>
      )}

      {stage === "considering" ? (
        <ConversionCooldownPanel
          conversionId={conversion.id}
          defaultMinutes={prefs.defaultCooldownMinutes}
          cooldownEndsAt={conversion.cooldownEndsAt ? new Date(conversion.cooldownEndsAt).toISOString() : null}
          cooldownMinutes={conversion.cooldownMinutes}
          minimumAction={conversion.minimumAction}
          resolved={resolution !== null}
        />
      ) : (
        <section className="rounded-xl border border-border border-l-[6px] border-l-muted px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">已经发生的支出</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            这笔钱已经花掉,只计入历史支出,不会产生保护金额。
            {conversion.eventCaseId ? "已按高影响门槛创建事件,可以进入复盘。" : ""}
          </p>
          {conversion.eventCaseId ? (
            <Link
              href={`/event-library/${conversion.eventCaseId}`}
              className="mt-2 inline-flex min-h-11 items-center text-sm text-primary underline"
            >
              打开关联事件 #{conversion.eventCaseId}
            </Link>
          ) : null}
        </section>
      )}

      {cooling ? (
        // 冷静期内不主动催促决定,但保留一条明确入口:如果已经付款,可以照实记录
        <details className="rounded-xl border border-dashed">
          <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm text-muted-foreground">
            冷静期还没结束,但我需要现在就记录结果
          </summary>
          <div className="px-3 pb-3">
            <ConversionResolveForm conversionId={conversion.id} plannedAmountMinor={conversion.plannedAmountMinor} />
          </div>
        </details>
      ) : showResolve ? (
        <ConversionResolveForm conversionId={conversion.id} plannedAmountMinor={conversion.plannedAmountMinor} />
      ) : null}

      {resolution ? (
        <section aria-labelledby="result-title" className="shadow-card flex flex-col gap-3 rounded-xl border bg-card p-4">
          <h2 id="result-title" className="text-sm font-semibold tracking-tight">
            资金去向
          </h2>
          <dl className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">保护金额</dt>
              <dd className="font-mono text-lg font-semibold tabular-nums">{formatCny(conversion.protectedAmountMinor)}</dd>
              <p className="text-[0.68rem] leading-snug text-muted-foreground/80">支出没有发生,不是账户余额</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">实际转向</dt>
              <dd className="font-mono text-lg font-semibold tabular-nums">{formatCny(conversion.redirectedAmountMinor)}</dd>
              <p className="text-[0.68rem] leading-snug text-muted-foreground/80">
                {conversion.redirectTarget ? `去处:${conversion.redirectTarget}` : "你确认已转入目标预算的金额"}
              </p>
            </div>
          </dl>
          {conversion.actualAmountMinor !== null ? (
            <p className="text-xs text-muted-foreground">实际消费 {formatCny(conversion.actualAmountMinor)}</p>
          ) : null}
        </section>
      ) : null}

      <section className="flex flex-col gap-3 rounded-xl border border-primary/35 bg-card p-5">
        <h2 className="text-lg font-semibold">这笔投入，我想验证什么？</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">带上当时的金额与比较选项，留下一个期待。已有工具够用、先不买，也可以约一次回访。</p>
        <Link href={`/spending-review/preview?conversion=${conversion.id}`} className="inline-flex min-h-11 w-fit items-center text-sm text-primary underline underline-offset-4">
          带入这次换算，预览验证卡
        </Link>
        <p className="text-sm text-muted-foreground">隔离预览：不写入真实记录，不创建外部提醒。购买前冷静期与结果回访节点相互独立。</p>
      </section>

      <ConversionDetailActions conversionId={conversion.id} ruleId={conversion.ruleId} />
    </main>
  )
}

const RANK_STYLES: Record<number, string> = {
  1: "border-warning/60 bg-warning/15 text-warning",
  2: "border-primary/60 bg-primary/15 text-primary",
  3: "border-info/60 bg-info/15 text-info",
}

function EquivalentRow({ item, highlight = false, rank }: { item: SnapshotItem; highlight?: boolean; rank?: number }) {
  const remainder = formatRemainder(item)
  return (
    <li
      className={
        highlight
          ? "shadow-card flex flex-col gap-1 rounded-xl border bg-card px-4 py-3"
          : "flex flex-col gap-1 rounded-lg border bg-card/70 px-3 py-2"
      }
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          {rank && rank <= 3 ? (
            <span
              aria-label={`第 ${rank} 名`}
              className={`flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold ${RANK_STYLES[rank]}`}
            >
              {rank}
            </span>
          ) : null}
          <span className="min-w-0 truncate text-sm font-medium">{item.name}</span>
        </span>
        <span
          className={highlight ? "font-mono text-xl font-semibold tabular-nums" : "font-mono text-base tabular-nums"}
          aria-label={quantityAriaLabel(item)}
        >
          {formatQuantity(item)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{BILLING_TYPE_LABEL[item.billingType as BillingType]}</span>
        <span className="font-mono tabular-nums">
          单价 {CURRENCY_SYMBOL[item.currency as CurrencyCode]}
          {formatMinor(item.priceMinor)}
          {item.maxPriceMinor !== null ? `–${formatMinor(item.maxPriceMinor)}` : ""} / {item.unitLabel}
        </span>
        {remainder ? <span className="font-mono tabular-nums">{remainder}</span> : null}
      </div>
    </li>
  )
}
