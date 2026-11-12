import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import {
  getConversionDetail,
  getConversionPreferences,
} from "@/app/actions/spend-conversion";
import { ConversionCooldownPanel } from "@/components/conversion-cooldown-panel";
import { ConversionDetailActions } from "@/components/conversion-detail-actions";
import { ConversionEquivalentRow } from "@/components/conversion-equivalent-row";
import { ConversionResolveForm } from "@/components/conversion-resolve-form";
import {
  CURRENCY_SYMBOL,
  DECISION_STAGE_LABEL,
  RESOLUTION_LABEL,
  formatCny,
  formatMinorCompact,
  getConversionCnyAmounts,
  isCooldownOver,
  type CurrencyCode,
  type DecisionStage,
  type Resolution,
} from "@/lib/convert-domain";

export const metadata = { title: "换算结果 | 决策拦截台" };

export default async function ConversionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conversionId = Number.parseInt(id, 10);
  if (!Number.isInteger(conversionId)) notFound();

  const [detail, prefs] = await Promise.all([
    getConversionDetail(conversionId),
    getConversionPreferences(),
  ]);
  if (!detail) notFound();
  const { conversion, snapshot } = detail;
  const { plannedCnyMinor, actualCnyMinor, protectedCnyMinor } =
    getConversionCnyAmounts(conversion);

  const stage = conversion.decisionStage as DecisionStage;
  const resolution = conversion.resolution as Resolution | null;
  const items = snapshot?.items ?? [];
  const snapshotUsdToCnyRate =
    snapshot?.input.currency === "USD"
      ? snapshot.input.toCnyRate
      : items.find((item) => item.currency === "USD")?.toCnyRate;
  const primary = items.slice(0, 3);
  const folded = items.slice(3);
  const timerAt = resolution ? conversion.resolvedAt : new Date();
  const cooldownDone =
    timerAt !== null && isCooldownOver(conversion.cooldownEndsAt, timerAt);
  const cooling =
    conversion.cooldownEndsAt !== null && !resolution && !cooldownDone;
  const cooldownStatus =
    conversion.cooldownEndsAt === null
      ? "未开启"
      : cooldownDone
        ? "已到期"
        : "尚未到期";
  const savedCooldownStatus =
    conversion.cooldownEndsAt === null
      ? "未开启"
      : timerAt === null
        ? "保存时点未知"
        : cooldownDone
          ? "保存时已到期"
          : "到期前保存";
  const showResolve = stage === "considering" && !resolution && !cooling;

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
        <p className="rounded-full border border-info/50 bg-info/10 px-3 py-1 text-xs font-medium text-info">
          {`${conversion.privacyLabel}换算`}
        </p>
        <p className="font-mono text-[2.6rem] font-semibold leading-none tabular-nums">
          {CURRENCY_SYMBOL[conversion.inputCurrency as CurrencyCode]}
          {formatMinorCompact(conversion.plannedAmountMinor)}
        </p>
        <p className="text-sm text-muted-foreground">
          {DECISION_STAGE_LABEL[stage]}
        </p>
        {plannedCnyMinor !== null && conversion.inputCurrency !== "CNY" ? (
          <p className="text-sm text-muted-foreground">
            折算人民币 {formatCny(plannedCnyMinor)}
          </p>
        ) : null}
        {prefs.privacyMode === "explicit" && conversion.sensitiveLabel ? (
          <p className="text-sm text-muted-foreground">
            私密别名: <span data-no-translate>{conversion.sensitiveLabel}</span>
          </p>
        ) : null}
        {resolution ? (
          <p className="text-sm">
            最终结果:
            <span className="font-medium">{RESOLUTION_LABEL[resolution]}</span>
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
              <ConversionEquivalentRow
                key={item.catalogItemId}
                item={item}
                highlight
                rank={index + 1}
              />
            ))}
          </ul>
          {folded.length > 0 ? (
            <details className="rounded-xl border border-dashed bg-card/60">
              <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm text-muted-foreground">
                {`查看全部比较(${folded.length})`}
              </summary>
              <ul className="flex flex-col gap-2 px-3 pb-3">
                {folded.map((item) => (
                  <ConversionEquivalentRow key={item.catalogItemId} item={item} />
                ))}
              </ul>
            </details>
          ) : null}
          {/* 价格快照卡 */}
          <div className="shadow-card flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
            <ShieldCheck
              className="mt-0.5 size-5 shrink-0 text-success"
              aria-hidden="true"
            />
            <div className="min-w-0 text-xs leading-relaxed text-muted-foreground">
              <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {snapshotUsdToCnyRate
                  ? `价格快照 · USD/CNY ${Number(snapshotUsdToCnyRate).toFixed(2)}`
                  : "价格快照"}
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
          cooldownEndsAt={
            conversion.cooldownEndsAt
              ? new Date(conversion.cooldownEndsAt).toISOString()
              : null
          }
          cooldownMinutes={conversion.cooldownMinutes}
          minimumAction={conversion.minimumAction}
          resolved={resolution !== null}
        />
      ) : (
        <section className="rounded-xl border border-border border-l-[6px] border-l-muted px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">
            已经发生的支出
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            这笔钱已经花掉,只计入历史支出,不会产生保护金额。
            {conversion.eventCaseId
              ? "已按高影响门槛创建事件,可以进入复盘。"
              : ""}
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

      {stage === "considering" && !resolution && plannedCnyMinor === null ? (
        <p className="text-sm text-muted-foreground">
          原换算汇率不可用，无法计算资金去向。
        </p>
      ) : null}
      {cooling && plannedCnyMinor !== null ? (
        // 冷静期内不主动催促决定,但保留一条明确入口:如果已经付款,可以照实记录
        <details className="rounded-xl border border-dashed">
          <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm text-muted-foreground">
            冷静期还没结束,但我需要现在就记录结果
          </summary>
          <div className="px-3 pb-3">
            <ConversionResolveForm
              conversionId={conversion.id}
              plannedCnyMinor={plannedCnyMinor}
              cooldownStatus={cooldownStatus}
            />
          </div>
        </details>
      ) : showResolve && plannedCnyMinor !== null ? (
        <ConversionResolveForm
          conversionId={conversion.id}
          plannedCnyMinor={plannedCnyMinor}
          cooldownStatus={cooldownStatus}
        />
      ) : null}

      {resolution ? (
        <section
          aria-labelledby="result-title"
          className="shadow-card flex flex-col gap-3 rounded-xl border bg-card p-4"
        >
          <h2
            id="result-title"
            className="text-sm font-semibold tracking-tight"
          >
            资金去向
          </h2>
          <dl className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">保护金额</dt>
              <dd className="font-mono text-lg font-semibold tabular-nums">
                {protectedCnyMinor === null
                  ? "待核对"
                  : formatCny(protectedCnyMinor)}
              </dd>
              <p className="text-[0.68rem] leading-snug text-muted-foreground">
                支出没有发生,不是账户余额
              </p>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">实际转向</dt>
              <dd className="font-mono text-lg font-semibold tabular-nums">
                {formatCny(conversion.redirectedAmountMinor)}
              </dd>
              <p className="text-[0.68rem] leading-snug text-muted-foreground">
                {conversion.redirectTarget ? (
                  <>
                    去处: <span data-no-translate>{conversion.redirectTarget}</span>
                  </>
                ) : (
                  "你确认已转入目标预算的金额"
                )}
              </p>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            <span className="mr-1.5">冷静期计时</span>
            <span>{savedCooldownStatus}</span>
          </p>
          {actualCnyMinor !== null ? (
            <p className="text-xs text-muted-foreground">
              实际消费 {formatCny(actualCnyMinor)}
            </p>
          ) : resolution === "spent" || resolution === "partial" ? (
            <p className="text-xs text-muted-foreground">
              这条旧记录的实际消费金额待核对，暂未计入历史支出。
            </p>
          ) : null}
        </section>
      ) : null}

      <ConversionDetailActions
        conversionId={conversion.id}
        ruleId={conversion.ruleId}
      />
    </main>
  );
}
