import Link from "next/link";
import { Bot, ChevronRight, Flame, Scale } from "lucide-react";
import type { getSpendingReview } from "@/app/actions/spending-review";
import { buttonVariants } from "@/components/ui/button";
import { DecisionStatusBadge, RiskBadge } from "@/components/spending-badges";
import {
  CoolingRecheck,
  DeleteReviewButton,
  FinalDecisionForm,
  StartHermesReviewButton,
} from "@/components/spending-detail-actions";
import { calendarDateTime } from "@/lib/calendar";
import {
  BASELINE_CONTRAST,
  categoryLabel,
  finalDecisionLabel,
  fundingSourceLabel,
  gptConclusionLabel,
  isClosedSpendingDecision,
  isNightWindow,
  recommendationLabel,
  statesLabels,
  triggerLabel,
} from "@/lib/spending-review-types";
import type { SpendingReviewJobError } from "@/lib/spending-review-job";

export type SpendingReviewDetailData = NonNullable<
  Awaited<ReturnType<typeof getSpendingReview>>
>;

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <p className="text-xs font-semibold">{label}</p>
      <p className="text-sm wrap-anywhere text-muted-foreground">
        {value ?? "—"}
      </p>
    </div>
  );
}

const yn = (value: boolean | null | undefined) =>
  value === true ? "是" : value === false ? "否" : "—";

const failures: Record<SpendingReviewJobError, string> = {
  unavailable: "暂时无法连接 Hermes。已保留你填写的信息。",
  timeout: "模型响应超时。已保留你填写的信息。",
  invalid_result: "审核结果未通过校验。已保留你填写的信息。",
  interrupted: "审核服务中断。已保留你填写的信息。",
};

export function SpendingReviewDetail({
  data,
  status,
  now,
}: {
  data: SpendingReviewDetailData;
  status: string;
  now: Date;
}) {
  const { review: r, aiReview, gptResult } = data;
  const result = aiReview?.result;
  const triggers = r.riskTriggers?.split(",").filter(Boolean) ?? [];
  const financialViolation =
    r.usesLivingExpense ||
    r.usesHealthBudget ||
    r.usesTuition ||
    r.usesEmergencyFund ||
    r.usesCredit ||
    [
      "living_expense",
      "health_budget",
      "tuition",
      "emergency_fund",
      "credit",
    ].includes(r.fundingSource);
  const canUseLegacyReview = [
    "draft",
    "awaiting_gpt",
    "awaiting_final",
  ].includes(r.decisionStatus);
  const linkClass = buttonVariants({ variant: "ghost", size: "sm" });

  return (
    <div className="grid gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p
            data-no-translate
            className="text-3xl leading-tight font-semibold tracking-tight tabular-nums sm:text-4xl"
          >
            {r.currency} {r.amount}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {categoryLabel(r.category)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1" aria-live="polite">
          <RiskBadge level={r.riskLevel} />
          <DecisionStatusBadge status={status} className="rounded-md" />
        </div>
      </div>
      {r.problemToSolve && (
        <p
          data-no-translate
          className="text-sm wrap-anywhere text-muted-foreground"
        >
          {r.problemToSolve}
        </p>
      )}
      {financialViolation && (
        <p className="rounded-lg bg-destructive/8 p-3 text-sm text-destructive">
          这笔支出触发财务底线，无法确认支出。
        </p>
      )}
      {r.decisionStatus === "cooling" && (
        <CoolingRecheck
          reviewId={r.id}
          coolingUntil={r.coolingUntil?.toISOString() ?? null}
          ready={status === "cooling_ready"}
        />
      )}
      {[
        "ai_queued",
        "ai_running",
        "ai_failed",
        "awaiting_gpt",
        "draft",
      ].includes(status) && (
        <section
          className="grid gap-2 rounded-xl border bg-muted/40 p-4"
          aria-labelledby="review-progress-title"
        >
          <h3 id="review-progress-title" className="font-semibold">
            {status === "ai_queued"
              ? "已加入审核队列"
              : status === "ai_running"
                ? "Hermes 正在审核"
                : status === "ai_failed"
                  ? "本次审核未完成"
                  : "可以发起 Hermes 审核"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {status === "ai_queued"
              ? "你可以离开此页，稍后从审核记录查看结果。"
              : status === "ai_running"
                ? "本地模型启动可能需要几分钟，稍后可回到此记录查看结果。"
                : status === "ai_failed"
                  ? failures[aiReview?.errorCode ?? "unavailable"]
                  : "发起审核后，这条记录会加入 Hermes 队列。"}
          </p>
          {["ai_failed", "awaiting_gpt", "draft"].includes(status) && (
            <StartHermesReviewButton
              key={status}
              reviewId={r.id}
              retry={status === "ai_failed"}
            />
          )}
        </section>
      )}
      {result && (
        <section
          className="grid gap-3 rounded-xl border bg-muted/40 p-4"
          aria-labelledby="hermes-suggestion-title"
        >
          <h3
            id="hermes-suggestion-title"
            className="flex flex-wrap items-center gap-2 font-semibold"
          >
            <Bot className="size-4 text-muted-foreground" aria-hidden="true" />
            <span>Hermes 审核建议</span>
            <span className="text-xs font-normal text-muted-foreground">
              本地 Qwen
            </span>
          </h3>
          <div className="grid gap-3">
            <Field
              label="审核结论"
              value={gptConclusionLabel(result.conclusion)}
            />
            <Field
              label="主要理由"
              value={<span data-no-translate>{result.mainReason}</span>}
            />
            <Field
              label="主要风险"
              value={<span data-no-translate>{result.risks}</span>}
            />
            <Field
              label={
                result.alternativesFromInput
                  ? "你填写的替代方案"
                  : "可尝试的替代方案"
              }
              value={
                <span data-no-translate className="whitespace-pre-line">
                  {result.alternativesFromInput
                    ? (r.alternatives ?? result.alternatives)
                    : result.alternatives}
                </span>
              }
            />
            {typeof result.suggestedCoolingHours === "number" && (
              <Field
                label="建议冷静期"
                value={
                  <>
                    {result.suggestedCoolingHours} <span>小时</span>
                  </>
                }
              />
            )}
          </div>
        </section>
      )}
      {status === "awaiting_final" && (
        <FinalDecisionForm
          reviewId={r.id}
          blockConfirmation={
            financialViolation
              ? "这笔支出触发财务底线，无法确认支出。"
              : isNightWindow(now)
                ? "当前处于夜间高风险时段，请稍后确认支出。"
                : null
          }
        />
      )}
      {isClosedSpendingDecision(status) && (
        <section
          className="grid gap-2 rounded-xl border bg-muted/40 p-4"
          aria-labelledby="saved-decision-title"
        >
          <h3 id="saved-decision-title" className="font-semibold">
            已保存决定
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field
              label="最终决定"
              value={finalDecisionLabel(r.finalDecision)}
            />
            <Field label="是否完成付款" value={yn(r.paymentCompleted)} />
            {r.finalDecisionReason && (
              <Field
                label="决定理由"
                value={<span data-no-translate>{r.finalDecisionReason}</span>}
              />
            )}
          </div>
        </section>
      )}

      <details className="group rounded-xl border">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          <ChevronRight
            className="size-4 shrink-0 transition-transform group-open:rotate-90"
            aria-hidden="true"
          />
          查看提交信息与原有工具
        </summary>
        <div className="grid gap-4 px-3 pb-4">
          <div className="flex flex-wrap gap-1">
            <Link
              className={linkClass}
              href={`/spending-review/${r.id}/markdown`}
            >
              生成 Markdown
            </Link>
            {canUseLegacyReview && (
              <Link
                className={linkClass}
                href={`/spending-review/${r.id}/gpt-result`}
              >
                回写 GPT 结果
              </Link>
            )}
            <Link
              className={linkClass}
              href={`/spending-review/${r.id}/postmortem`}
            >
              事后复盘
            </Link>
            <DeleteReviewButton reviewId={r.id} />
          </div>
          <section className="grid gap-2 border-t pt-4">
            <h3 className="text-sm font-semibold">系统风险结论</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="系统建议"
                value={recommendationLabel(r.systemRecommendation)}
              />
              <Field
                label="冷静期"
                value={
                  r.coolingUntil ? (
                    <time
                      dateTime={r.coolingUntil.toISOString()}
                      data-no-translate
                    >
                      {calendarDateTime(r.coolingUntil).replace("T", " ")}
                    </time>
                  ) : (
                    "无"
                  )
                }
              />
            </div>
            {triggers.length > 0 && (
              <ul className="flex flex-wrap gap-2 text-xs text-warning">
                {triggers.map((trigger) => (
                  <li
                    key={trigger}
                    className="rounded-md bg-warning/8 px-2 py-1"
                  >
                    {triggerLabel(trigger)}
                  </li>
                ))}
              </ul>
            )}
          </section>
          {gptResult && (
            <section className="grid gap-2 border-t pt-4">
              <h3 className="text-sm font-semibold">GPT 审核结果</h3>
              <div className="grid gap-2">
                <Field
                  label="审核结论"
                  value={gptConclusionLabel(gptResult.conclusion)}
                />
                <Field
                  label="主要理由"
                  value={
                    <span data-no-translate>{gptResult.mainReason ?? "—"}</span>
                  }
                />
                <Field
                  label="指出的风险"
                  value={
                    <span data-no-translate>{gptResult.risks ?? "—"}</span>
                  }
                />
                <Field
                  label="建议替代方案"
                  value={
                    <span data-no-translate>
                      {gptResult.alternatives ?? "—"}
                    </span>
                  }
                />
                <Field
                  label="建议冷静期"
                  value={
                    <span data-no-translate>
                      {gptResult.suggestedCoolingPeriod ?? "—"}
                    </span>
                  }
                />
              </div>
            </section>
          )}
          <SpendingReviewContext data={data} />
        </div>
      </details>
    </div>
  );
}

function SpendingReviewContext({ data }: { data: SpendingReviewDetailData }) {
  const { review: r, toolCheck, postmortem } = data;
  const states = statesLabels(r.currentStates);
  return (
    <>
      {/* 当前状态 */}
      <section className="flex flex-col gap-3 border-t pt-4">
        <h3 className="text-sm font-semibold tracking-tight">
          当前状态与时间窗口
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {states.length > 0 ? (
            states.map((s) => (
              <span
                key={s}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {s}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">未填写</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="冲动强度" value={`${r.impulseLevel} / 10`} />
          <Field
            label="时间风险"
            value={
              r.timeRiskLevel === "severe"
                ? "凌晨高危窗口"
                : r.timeRiskLevel === "elevated"
                  ? "夜间风险窗口"
                  : "正常时段"
            }
          />
          <Field
            label="睡眠情况"
            value={
              r.sleepStatus === "enough"
                ? "充足"
                : r.sleepStatus === "not_enough"
                  ? "不足"
                  : "—"
            }
          />
          <Field
            label="决策时间"
            value={
              r.decisionTime
                ? calendarDateTime(r.decisionTime).replace("T", " ")
                : "—"
            }
          />
        </div>
      </section>

      {/* 资金安全 */}
      <section className="flex flex-col gap-3 border-t pt-4">
        <h3 className="text-sm font-semibold tracking-tight">资金安全</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="资金来源" value={fundingSourceLabel(r.fundingSource)} />
          <Field label="本月剩余预算" value={r.monthlyBudgetRemaining ?? "—"} />
          <Field label="动用生活费" value={yn(r.usesLivingExpense)} />
          <Field label="动用健康预算" value={yn(r.usesHealthBudget)} />
          <Field label="动用学费" value={yn(r.usesTuition)} />
          <Field label="动用应急资金" value={yn(r.usesEmergencyFund)} />
          <Field label="使用借款/信用" value={yn(r.usesCredit)} />
          <Field label="是否订阅" value={yn(r.isSubscription)} />
        </div>
      </section>

      {/* 需求拆解 */}
      <section className="flex flex-col gap-3 border-t pt-4">
        <h3 className="text-sm font-semibold tracking-tight">真实需求拆解</h3>
        <Field
          label="我真正想得到什么"
          value={<span data-no-translate>{r.realNeed ?? "—"}</span>}
        />
        <Field
          label="不购买会发生什么"
          value={<span data-no-translate>{r.consequenceIfNotBuy ?? "—"}</span>}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="属于情绪缓解" value={yn(r.emotionalRelief)} />
          <Field label="属于逃避任务" value={yn(r.taskAvoidance)} />
        </div>
        <Field
          label="替代方案"
          value={<span data-no-translate>{r.alternatives ?? "—"}</span>}
        />
      </section>

      {/* 主线核对 */}
      <section className="flex flex-col gap-3 border-t pt-4">
        <h3 className="text-sm font-semibold tracking-tight">主线核对</h3>
        <Field
          label="当前最紧急硬任务"
          value={<span data-no-translate>{r.currentMainline ?? "—"}</span>}
        />
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            ["睡眠", r.affectsSleep],
            ["课程", r.affectsCourse],
            ["仪表盘", r.affectsDashboard],
            ["算法", r.affectsAlgorithm],
            ["AI 课程", r.affectsAiCourse],
            ["产品经理", r.affectsPmLearning],
            ["训练", r.affectsTraining],
            ["预算", r.affectsBudget],
          ].map(([label, v]) =>
            v ? (
              <span
                key={label as string}
                className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive"
              >
                {`影响${label}`}
              </span>
            ) : null,
          )}
          {!r.affectsSleep &&
            !r.affectsCourse &&
            !r.affectsDashboard &&
            !r.affectsAlgorithm &&
            !r.affectsAiCourse &&
            !r.affectsPmLearning &&
            !r.affectsTraining &&
            !r.affectsBudget && (
              <span className="text-muted-foreground">不影响任何主线</span>
            )}
        </div>
      </section>

      {/* 工具专项 */}
      {toolCheck && (
        <section className="flex flex-col gap-3 border-t pt-4">
          <h3 className="text-sm font-semibold tracking-tight">
            工具与订阅专项审查
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="工具名称"
              value={<span data-no-translate>{toolCheck.toolName ?? "—"}</span>}
            />
            <Field
              label="预计使用次数"
              value={toolCheck.expectedUsageCount ?? "—"}
            />
          </div>
          <Field
            label="未来七天用途"
            value={
              <span data-no-translate>{toolCheck.useCaseNext7Days ?? "—"}</span>
            }
          />
          <Field
            label="现有工具"
            value={
              <span data-no-translate>{toolCheck.existingTools ?? "—"}</span>
            }
          />
          <Field
            label="功能重叠"
            value={
              <span data-no-translate>
                {toolCheck.overlapDescription ?? "—"}
              </span>
            }
          />
          <Field
            label="现有额度"
            value={
              <span data-no-translate>
                {toolCheck.currentQuotaRemaining ?? "—"}
              </span>
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="不买仍能继续"
              value={yn(toolCheck.canContinueWithoutPurchase)}
            />
            <Field label="因焦虑购买" value={yn(toolCheck.anxietyDriven)} />
          </div>
        </section>
      )}

      {/* 最佳状态协议对照 */}
      <section className="flex flex-col gap-3 border-t pt-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
          <Scale className="size-4 text-muted-foreground" aria-hidden="true" />
          最佳状态决策协议对照
        </h3>
        <div className="flex flex-col gap-1.5">
          {BASELINE_CONTRAST.map((row) => (
            <div key={row.current} className="flex items-center gap-2 text-xs">
              <span className="flex-1 text-muted-foreground">
                {row.current}
              </span>
              <span aria-hidden="true" className="text-muted-foreground/50">
                {"→"}
              </span>
              <span className="flex-1 font-medium">{row.baseline}</span>
            </div>
          ))}
        </div>
        <Link
          href="/spending-review/baseline"
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          查看完整协议
        </Link>
      </section>

      {/* 事后复盘 */}
      {postmortem && (
        <section className="flex flex-col gap-3 border-t pt-4">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
            <Flame
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            事后复盘
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="实际金额" value={postmortem.actualAmount ?? "—"} />
            <Field
              label="后悔程度"
              value={`${postmortem.regretLevel ?? 0} / 10`}
            />
          </div>
          {postmortem.lesson && (
            <Field
              label="教训"
              value={<span data-no-translate>{postmortem.lesson}</span>}
            />
          )}
          {postmortem.principle && (
            <Field
              label="原则"
              value={<span data-no-translate>{postmortem.principle}</span>}
            />
          )}
          {postmortem.interceptionRule && (
            <div className="flex flex-col gap-1 rounded-lg bg-accent/60 p-3">
              <p className="text-xs font-medium text-accent-foreground/80">
                下次拦截规则
              </p>
              <p
                data-no-translate
                className="text-sm font-medium text-accent-foreground"
              >
                {postmortem.interceptionRule}
              </p>
            </div>
          )}
        </section>
      )}
    </>
  );
}
