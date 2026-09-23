import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, FileText, Bot, Flame, Scale } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getSpendingReview } from "@/app/actions/spending-review"
import {
  categoryLabel,
  fundingSourceLabel,
  recommendationLabel,
  gptConclusionLabel,
  finalDecisionLabel,
  statesLabels,
  triggerLabel,
  isNightWindow,
  BASELINE_CONTRAST,
} from "@/lib/spending-review-types"
import { RiskBadge, DecisionStatusBadge } from "@/components/spending-badges"
import { CoolingRecheck, FinalDecisionForm, DeleteReviewButton } from "@/components/spending-detail-actions"

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm leading-relaxed">{value ?? "—"}</p>
    </div>
  )
}

const yn = (v: boolean | null | undefined) => (v === true ? "是" : v === false ? "否" : "—")

export default async function SpendingReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const numId = Number.parseInt(id, 10)
  if (Number.isNaN(numId)) notFound()
  const detail = await getSpendingReview(numId)
  if (!detail) notFound()
  const { review: r, toolCheck, gptResult, postmortem } = detail

  const states = statesLabels(r.currentStates)
  const triggers = (r.riskTriggers ?? "").split(",").filter(Boolean)
  const night = isNightWindow(new Date())
  const financialViolation =
    r.usesLivingExpense || r.usesHealthBudget || r.usesTuition || r.usesEmergencyFund || r.usesCredit
  const inCooling = r.decisionStatus === "cooling"
  const awaitingFinal = r.decisionStatus === "awaiting_final"
  const closed = ["cancelled", "delayed", "reduced", "confirmed", "paid"].includes(r.decisionStatus)

  return (
    <main className="flex flex-col gap-5">
      <Link
        href="/spending-review"
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回拦截台
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <DecisionStatusBadge status={r.decisionStatus} />
          <RiskBadge level={r.riskLevel} />
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {categoryLabel(r.category)}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold leading-snug tracking-tight text-balance md:text-2xl">{r.title}</h1>
          <span className="shrink-0 text-lg font-semibold tabular-nums">
            {r.amount} <span className="text-sm font-normal text-muted-foreground">{r.currency}</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/spending-review/${r.id}/markdown`} className={buttonVariants({ size: "sm" })}>
            <FileText className="size-4" aria-hidden="true" />
            生成 Markdown
          </Link>
          <Link
            href={`/spending-review/${r.id}/gpt-result`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "bg-card")}
          >
            <Bot className="size-4" aria-hidden="true" />
            回写 GPT 结果
          </Link>
          <Link
            href={`/spending-review/${r.id}/postmortem`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "bg-card")}
          >
            <Flame className="size-4" aria-hidden="true" />
            事后复盘
          </Link>
          <DeleteReviewButton reviewId={r.id} />
        </div>
      </header>

      {/* 系统风险结论 */}
      <section className="shadow-card flex flex-col gap-3 rounded-xl border border-l-2 border-l-foreground/30 bg-card p-4 md:p-5">
        <h2 className="text-sm font-semibold tracking-tight">系统风险结论</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="系统建议" value={recommendationLabel(r.systemRecommendation)} />
          <Field
            label="冷静期"
            value={r.coolingUntil ? `至 ${new Date(r.coolingUntil).toLocaleString("zh-CN")}` : "无"}
          />
        </div>
        {triggers.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">触发规则</p>
            <div className="flex flex-wrap gap-1.5">
              {triggers.map((t) => (
                <span
                  key={t}
                  className={
                    t === "financial_safety_violation"
                      ? "rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                      : "rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground"
                  }
                >
                  {triggerLabel(t)}
                </span>
              ))}
            </div>
          </div>
        )}
        {financialViolation && (
          <p className="rounded-lg bg-destructive/10 p-3 text-xs leading-relaxed text-destructive">
            已触发财务底线(动用生活费 / 健康预算 / 学费 / 应急资金 / 信用额度)。该支出不进入正常付款流程。
          </p>
        )}
        {inCooling && <CoolingRecheck reviewId={r.id} coolingUntil={r.coolingUntil?.toISOString() ?? null} />}
      </section>

      {/* 最终人工决定 */}
      {(awaitingFinal || closed) && (
        <section className="shadow-card flex flex-col gap-3 rounded-xl border bg-card p-4 md:p-5">
          <h2 className="text-sm font-semibold tracking-tight">最终人工决定</h2>
          {closed ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="最终决定" value={finalDecisionLabel(r.finalDecision)} />
              <Field label="是否完成付款" value={yn(r.paymentCompleted)} />
              {r.finalDecisionReason && <Field label="决定理由" value={r.finalDecisionReason} />}
            </div>
          ) : (
            <FinalDecisionForm reviewId={r.id} nightWindow={night} />
          )}
        </section>
      )}

      {/* GPT 审核结果 */}
      {gptResult && (
        <section className="shadow-card flex flex-col gap-3 rounded-xl border bg-card p-4 md:p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
            <Bot className="size-4 text-muted-foreground" aria-hidden="true" />
            GPT 审核结果
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="审核结论" value={gptConclusionLabel(gptResult.conclusion)} />
            <Field label="建议冷静期" value={gptResult.suggestedCoolingPeriod ?? "—"} />
          </div>
          {gptResult.mainReason && <Field label="主要理由" value={gptResult.mainReason} />}
          {gptResult.risks && <Field label="指出的风险" value={gptResult.risks} />}
          {gptResult.alternatives && <Field label="建议替代方案" value={gptResult.alternatives} />}
        </section>
      )}

      {/* 当前状态 */}
      <section className="shadow-card flex flex-col gap-3 rounded-xl border bg-card p-4 md:p-5">
        <h2 className="text-sm font-semibold tracking-tight">当前状态与时间窗口</h2>
        <div className="flex flex-wrap gap-1.5">
          {states.length > 0 ? (
            states.map((s) => (
              <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
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
            value={r.timeRiskLevel === "severe" ? "凌晨高危窗口" : r.timeRiskLevel === "elevated" ? "夜间风险窗口" : "正常时段"}
          />
          <Field label="睡眠情况" value={r.sleepStatus === "enough" ? "充足" : r.sleepStatus === "not_enough" ? "不足" : "—"} />
          <Field label="决策时间" value={r.decisionTime ? new Date(r.decisionTime).toLocaleString("zh-CN") : "—"} />
        </div>
      </section>

      {/* 资金安全 */}
      <section className="shadow-card flex flex-col gap-3 rounded-xl border bg-card p-4 md:p-5">
        <h2 className="text-sm font-semibold tracking-tight">资金安全</h2>
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
      <section className="shadow-card flex flex-col gap-3 rounded-xl border bg-card p-4 md:p-5">
        <h2 className="text-sm font-semibold tracking-tight">真实需求拆解</h2>
        <Field label="我真正想得到什么" value={r.realNeed ?? "—"} />
        <Field label="解决的具体问题" value={r.problemToSolve ?? "—"} />
        <Field label="不购买会发生什么" value={r.consequenceIfNotBuy ?? "—"} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="属于情绪缓解" value={yn(r.emotionalRelief)} />
          <Field label="属于逃避任务" value={yn(r.taskAvoidance)} />
        </div>
        <Field label="替代方案" value={r.alternatives ?? "—"} />
      </section>

      {/* 主线核对 */}
      <section className="shadow-card flex flex-col gap-3 rounded-xl border bg-card p-4 md:p-5">
        <h2 className="text-sm font-semibold tracking-tight">主线核对</h2>
        <Field label="当前最紧急硬任务" value={r.currentMainline ?? "—"} />
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
              <span key={label as string} className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                影响{label}
              </span>
            ) : null
          )}
          {!r.affectsSleep &&
            !r.affectsCourse &&
            !r.affectsDashboard &&
            !r.affectsAlgorithm &&
            !r.affectsAiCourse &&
            !r.affectsPmLearning &&
            !r.affectsTraining &&
            !r.affectsBudget && <span className="text-muted-foreground">不影响任何主线</span>}
        </div>
      </section>

      {/* 工具专项 */}
      {toolCheck && (
        <section className="shadow-card flex flex-col gap-3 rounded-xl border bg-card p-4 md:p-5">
          <h2 className="text-sm font-semibold tracking-tight">工具与订阅专项审查</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="工具名称" value={toolCheck.toolName ?? "—"} />
            <Field label="预计使用次数" value={toolCheck.expectedUsageCount ?? "—"} />
          </div>
          <Field label="未来七天用途" value={toolCheck.useCaseNext7Days ?? "—"} />
          <Field label="现有工具" value={toolCheck.existingTools ?? "—"} />
          <Field label="功能重叠" value={toolCheck.overlapDescription ?? "—"} />
          <Field label="现有额度" value={toolCheck.currentQuotaRemaining ?? "—"} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="不买仍能继续" value={yn(toolCheck.canContinueWithoutPurchase)} />
            <Field label="因焦虑购买" value={yn(toolCheck.anxietyDriven)} />
          </div>
        </section>
      )}

      {/* 最佳状态协议对照 */}
      <section className="shadow-card flex flex-col gap-3 rounded-xl border bg-card p-4 md:p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
          <Scale className="size-4 text-muted-foreground" aria-hidden="true" />
          最佳状态决策协议对照
        </h2>
        <div className="flex flex-col gap-1.5">
          {BASELINE_CONTRAST.map((row) => (
            <div key={row.current} className="flex items-center gap-2 text-xs">
              <span className="flex-1 text-muted-foreground">{row.current}</span>
              <span aria-hidden="true" className="text-muted-foreground/50">
                {"→"}
              </span>
              <span className="flex-1 font-medium">{row.baseline}</span>
            </div>
          ))}
        </div>
        <Link href="/decision-baseline" className="text-xs text-muted-foreground underline hover:text-foreground">
          查看完整协议
        </Link>
      </section>

      {/* 事后复盘 */}
      {postmortem && (
        <section className="shadow-card flex flex-col gap-3 rounded-xl border bg-card p-4 md:p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
            <Flame className="size-4 text-muted-foreground" aria-hidden="true" />
            事后复盘
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="实际金额" value={postmortem.actualAmount ?? "—"} />
            <Field label="后悔程度" value={`${postmortem.regretLevel ?? 0} / 10`} />
          </div>
          {postmortem.lesson && <Field label="教训" value={postmortem.lesson} />}
          {postmortem.principle && <Field label="原则" value={postmortem.principle} />}
          {postmortem.interceptionRule && (
            <div className="flex flex-col gap-1 rounded-lg bg-accent/60 p-3">
              <p className="text-xs font-medium text-accent-foreground/80">下次拦截规则</p>
              <p className="text-sm font-medium text-accent-foreground">{postmortem.interceptionRule}</p>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
