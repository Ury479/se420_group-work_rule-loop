import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getPlanDetail } from "@/app/actions/people-resources"
import { generateCommunicationPlanMarkdown } from "@/lib/communication-markdown"
import {
  communicationTypeLabel,
  communicationChannelLabel,
  investmentNatureLabel,
  outcomeStatusLabel,
  needsBottomLineCheck,
} from "@/lib/resource-types"
import { PlanMarkdownViewer } from "@/components/plan-markdown-viewer"
import { PlanResultForm, ClosePlanButton } from "@/components/plan-result-form"
import { cn } from "@/lib/utils"

export const metadata = { title: "沟通计划" }

function fmt(d: Date | null): string {
  if (!d) return "未设置"
  return new Date(d).toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" })
}

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = Number.parseInt(id, 10)
  if (Number.isNaN(numId)) notFound()

  const detail = await getPlanDetail(numId)
  if (!detail || !detail.person) notFound()
  const { plan, person, results, hypotheses } = detail

  const markdown = generateCommunicationPlanMarkdown(plan, person, hypotheses)
  const statusLabel =
    plan.status === "draft" ? "草稿" : plan.status === "ready" ? "待执行" : plan.status === "executed" ? "已执行" : "已关闭"

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/resources/people/${person.id}`}
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回 {person.personName}
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              plan.status === "executed"
                ? "bg-accent text-accent-foreground"
                : plan.status === "closed"
                  ? "bg-muted text-muted-foreground"
                  : "bg-warning/15 text-warning-foreground"
            )}
          >
            {statusLabel}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {communicationTypeLabel(plan.communicationType)}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {communicationChannelLabel(plan.communicationChannel)}
          </span>
        </div>
        <h1 className="text-lg font-semibold leading-snug tracking-tight text-pretty">{plan.communicationGoal}</h1>
      </header>

      {/* 底线警示 */}
      {needsBottomLineCheck(plan.investmentNature) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          投入性质为「{investmentNatureLabel(plan.investmentNature)}」,执行前请完成底线五问,必要时先回复「我确认后再答复」。
        </div>
      )}

      {/* 计划要点 */}
      <section className="shadow-card flex flex-col gap-2.5 rounded-xl border bg-card px-4 py-3.5 text-sm">
        <h2 className="text-sm font-semibold">计划要点</h2>
        <dl className="flex flex-col gap-2">
          {plan.triedAlready && (
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">我已经尝试</dt>
              <dd className="leading-relaxed">{plan.triedAlready}</dd>
            </div>
          )}
          {plan.expectedNextAction && (
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">希望对方采取的下一步</dt>
              <dd className="leading-relaxed">{plan.expectedNextAction}</dd>
            </div>
          )}
          {plan.coreMessage && (
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">核心表达</dt>
              <dd className="leading-relaxed">{plan.coreMessage}</dd>
            </div>
          )}
          {plan.investmentLimit && (
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">最大投入上限</dt>
              <dd className="leading-relaxed">{plan.investmentLimit}</dd>
            </div>
          )}
          {plan.valueToOffer && (
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">我能提供的价值</dt>
              <dd className="leading-relaxed">{plan.valueToOffer}</dd>
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">最多主动跟进</dt>
            <dd>{plan.followUpLimit} 次(超过后暂缓,等待对方或调整策略)</dd>
          </div>
        </dl>
      </section>

      {/* Markdown 导出 */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold">导出沟通计划</h2>
          <p className="text-xs text-muted-foreground">生成完整 Markdown,可存档或粘贴给外部 GPT 复核措辞。</p>
        </div>
        <PlanMarkdownViewer markdown={markdown} title={plan.communicationGoal} />
      </section>

      {/* 结果验收 */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">沟通结果({results.length})</h2>
        {results.length > 0 && (
          <ul className="flex flex-col gap-2">
            {results.map((r) => (
              <li key={r.id} className="shadow-card flex flex-col gap-1.5 rounded-xl border bg-card px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  {r.outcomeStatus && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                      {outcomeStatusLabel(r.outcomeStatus)}
                    </span>
                  )}
                  {r.feedbackRequired && !r.feedbackCompleted && (
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning-foreground">
                      待回馈
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">{fmt(r.createdAt)}</span>
                </div>
                {r.keyInformation && <p className="leading-relaxed">{r.keyInformation}</p>}
                {r.confirmedCoreNeed && (
                  <p className="text-xs text-muted-foreground">确认关注点:{r.confirmedCoreNeed}</p>
                )}
                {r.nextAction && <p className="text-xs text-muted-foreground">下一步:{r.nextAction}</p>}
                {r.reflection && <p className="text-xs text-muted-foreground">复盘:{r.reflection}</p>}
              </li>
            ))}
          </ul>
        )}
        {plan.status !== "closed" && <PlanResultForm planId={plan.id} />}
      </section>

      {plan.status !== "closed" && (
        <div className="flex justify-end border-t pt-4">
          <ClosePlanButton planId={plan.id} />
        </div>
      )}
    </div>
  )
}
