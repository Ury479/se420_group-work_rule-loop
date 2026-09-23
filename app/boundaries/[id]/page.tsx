import Link from "next/link"
import { notFound } from "next/navigation"
import { getBoundary } from "@/app/actions/boundaries"
import { getCards } from "@/app/actions/cards"
import { CardContainer } from "@/components/card-container"
import { Button } from "@/components/ui/button"
import { DECISION_LABELS, CONFIDENCE_LABELS, SOURCE_LABELS } from "@/components/boundary-card"
import { BoundaryStatusActions } from "@/components/boundary-status-actions"
import { ShieldCheck } from "lucide-react"

export const dynamic = "force-dynamic"

const STATUS_LABELS: Record<string, string> = {
  active: "进行中",
  completed: "已完成",
  stopped: "已停止",
  backlogged: "Backlog",
}

export default async function BoundaryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = Number(id)
  if (!Number.isFinite(numId)) notFound()
  const data = await getBoundary(numId)
  if (!data) notFound()
  const { boundary, checks } = data
  const cards = await getCards("boundary", boundary.id)

  const fields: { label: string; value: string | null }[] = [
    { label: "最低完成标准", value: boundary.minimumDoneStandard },
    { label: "标准完成定义", value: boundary.standardDoneDefinition },
    { label: "本次明确不做", value: boundary.explicitNonGoals },
    { label: "继续深做会挤占", value: boundary.opportunityCost },
    { label: "停止条件", value: boundary.stopCondition },
  ]

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground">
            {SOURCE_LABELS[boundary.sourceType] ?? boundary.sourceType}
          </span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
            {STATUS_LABELS[boundary.status] ?? boundary.status}
          </span>
          <span className="text-muted-foreground">
            {CONFIDENCE_LABELS[boundary.informationConfidence]} · 时间盒 {boundary.timeboxMinutes} 分钟
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{boundary.title}</h1>
        <p className="text-sm text-muted-foreground">
          当前决策:<span className="font-medium text-foreground">{DECISION_LABELS[boundary.decision]}</span>
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href={`/boundaries/${boundary.id}/check`} />}>
            <ShieldCheck className="size-4" aria-hidden="true" />
            进行边界检查
          </Button>
          <BoundaryStatusActions boundaryId={boundary.id} status={boundary.status} />
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        {fields.map(
          (f) =>
            f.value && (
              <div key={f.label} className="flex flex-col gap-0.5">
                <p className="text-xs font-medium text-muted-foreground">{f.label}</p>
                <p className="text-sm leading-relaxed text-pretty">{f.value}</p>
              </div>
            )
        )}
      </section>

      {/* 卡片流:边界卡 → 决策卡 → 执行卡 → 复盘卡,持续追加,不限数量 */}
      <CardContainer contextType="boundary" contextId={boundary.id} initialCards={cards} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">检查记录</h2>
        {checks.length === 0 ? (
          <p className="text-sm text-muted-foreground">还没有检查记录。准备继续投入前,先做一次边界检查。</p>
        ) : (
          <div className="flex flex-col gap-2">
            {checks.map((c) => (
              <div key={c.id} className="flex flex-col gap-1.5 rounded-lg border bg-card px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded bg-secondary px-1.5 py-0.5 font-medium text-secondary-foreground">
                    {DECISION_LABELS[c.recommendation] ?? c.recommendation}
                  </span>
                  {c.isOverExecution && (
                    <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-medium text-destructive">
                      过度执行
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    已投入 {c.timeSpentMinutes} 分钟 ·{" "}
                    {new Date(c.createdAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
                  </span>
                </div>
                {c.reasons && (
                  <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{c.reasons}</p>
                )}
                {c.whatIsBeingCrowdedOut && (
                  <p className="text-xs text-muted-foreground">被挤占:{c.whatIsBeingCrowdedOut}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
