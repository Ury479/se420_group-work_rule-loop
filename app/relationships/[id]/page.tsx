import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  getRelationship,
  getInteractions,
  getRelationshipReviews,
} from "@/app/actions/relationships"
import {
  RELATIONSHIP_TYPE_LABELS,
  RELATIONSHIP_STATUS_LABELS,
  NET_IMPACT_LABELS,
  NEXT_ACTION_LABELS,
  RECIPROCITY_LABELS,
  ENERGY_AFTER_LABELS,
  SIGNAL_TYPE_LABELS,
  STATUS_SUGGESTIONS,
  HYPOTHESIS_DISCLAIMER,
  type RelationshipType,
  type RelationshipStatus,
  type NetImpact,
  type NextAction,
  type ReciprocityLevel,
  type EnergyAfter,
  type SignalType,
} from "@/lib/relationships"
import { MessageSquareWarning, ShieldAlert, Flame, NotebookPen } from "lucide-react"
import { getRelationshipStageData } from "@/app/actions/relationship-stage"
import { RelationshipStagePanel } from "@/components/relationship-stage-panel"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "关系详情 | 人际关系筛查台",
}

function formatDate(date: Date | null) {
  if (!date) return null
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export default async function RelationshipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const relationshipId = Number(id)
  if (!Number.isFinite(relationshipId)) notFound()

  const [relationship, interactions, reviews, stageData] = await Promise.all([
    getRelationship(relationshipId),
    getInteractions(relationshipId),
    getRelationshipReviews(relationshipId),
    getRelationshipStageData(relationshipId),
  ])
  if (!relationship) notFound()

  const status = relationship.relationshipStatus as RelationshipStatus
  const scores = [
    ["事业", relationship.careerImpactScore],
    ["工作", relationship.workImpactScore],
    ["情绪", relationship.emotionImpactScore],
    ["成长", relationship.growthImpactScore],
  ].filter(([, v]) => v != null) as [string, number][]

  const hypotheses = [
    ["核心诉求推测", relationship.coreNeedHypothesis],
    ["敏感点推测", relationship.sensitivePoints],
    ["沟通雷区", relationship.communicationLandmines],
    ["关键信号", relationship.keySignals],
  ].filter(([, v]) => v) as [string, string][]

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 border-b pb-6">
        <Link href="/relationships" className="w-fit text-sm text-muted-foreground transition-colors hover:text-foreground">← 返回关系筛查台</Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3"><div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="font-mono text-xs">
            {RELATIONSHIP_TYPE_LABELS[
              relationship.relationshipType as RelationshipType
            ] ?? relationship.relationshipType}
          </Badge>
          <Badge variant="secondary">{RELATIONSHIP_STATUS_LABELS[status]}</Badge>
          <Badge variant="secondary">
            {NET_IMPACT_LABELS[relationship.netImpact as NetImpact]}
          </Badge>
        </div>
          <h1 className="text-2xl font-semibold text-balance sm:text-3xl">
            {relationship.personName}
          </h1>
          <p className="text-sm text-muted-foreground">先看事实与边界，再决定是否行动。</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:max-w-md sm:justify-end">
          <Button
            nativeButton={false}
            render={<Link href="#communication-strategy" />}
          >
            <MessageSquareWarning className="size-4" aria-hidden="true" />
            梳理沟通策略
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/relationships/${relationship.id}/check`} />}
          >
            <MessageSquareWarning className="size-4" aria-hidden="true" />
            沟通前检查
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/relationships/${relationship.id}/boundary-check`} />}
          >
            <ShieldAlert className="size-4" aria-hidden="true" />
            底线防护检查
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/relationships/${relationship.id}/interactions`} />}
          >
            <NotebookPen className="size-4" aria-hidden="true" />
            记录互动
          </Button>
          <Button
            variant="ghost"
            className="text-muted-foreground"
            nativeButton={false}
            render={<Link href={`/relationships/${relationship.id}/review`} />}
          >
            <Flame className="size-4" aria-hidden="true" />
            灰烬备忘录
          </Button>
        </div>
        </div>
      </header>

      {/* 状态与建议 */}
      <Card className="py-4">
        <CardContent className="flex flex-col gap-3 px-4">
          <h2 className="text-sm font-semibold">
            当前状态:{RELATIONSHIP_STATUS_LABELS[status]} · 下一步:
            {NEXT_ACTION_LABELS[relationship.nextAction as NextAction]}
          </h2>
          <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-muted-foreground">
            {STATUS_SUGGESTIONS[status].map((s) => (
              <li key={s}>· {s}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            互惠程度:
            {RECIPROCITY_LABELS[relationship.reciprocityLevel as ReciprocityLevel]}
            {scores.length > 0 &&
              " · 影响评分:" + scores.map(([k, v]) => `${k} ${v}/5`).join(" / ")}
          </p>
        </CardContent>
      </Card>

      {stageData && <RelationshipStagePanel relationshipId={relationshipId} data={stageData} />}

      {/* 推测区 */}
      {hypotheses.length > 0 && (
        <Card className="py-4">
          <CardContent className="flex flex-col gap-3 px-4">
            <h2 className="text-sm font-semibold">推测与信号(全部为推测)</h2>
            <dl className="flex flex-col gap-2 text-sm">
              {hypotheses.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="leading-relaxed">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="rounded-lg bg-secondary px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              {HYPOTHESIS_DISCLAIMER}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 底线 */}
      {relationship.boundaryNotes && (
        <Card className="border-l-4 border-l-destructive py-4">
          <CardContent className="flex flex-col gap-1 px-4">
            <h2 className="text-sm font-semibold">我的底线</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {relationship.boundaryNotes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 最近互动 */}
      <section aria-label="最近互动">
        <h2 className="mb-3 text-lg font-semibold">
          最近互动
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {interactions.length}
          </span>
        </h2>
        {interactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">还没有互动记录。</p>
        ) : (
          <div className="flex flex-col gap-3">
            {interactions.slice(0, 5).map((it) => (
              <Card key={it.id} className="py-3">
                <CardContent className="flex flex-col gap-1.5 px-4 text-sm">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">
                      {ENERGY_AFTER_LABELS[it.energyAfter as EnergyAfter]}
                    </Badge>
                    <Badge variant="outline">
                      {SIGNAL_TYPE_LABELS[it.signalType as SignalType]}
                    </Badge>
                    {it.didIPeoplePlease && (
                      <Badge className="bg-warning text-warning-foreground">
                        讨好信号
                      </Badge>
                    )}
                    {it.didICrossBoundary && (
                      <Badge className="bg-destructive text-destructive-foreground">
                        越过底线
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(it.interactionDate)}
                    </span>
                  </div>
                  <p className="leading-relaxed">{it.interactionFact}</p>
                  {it.nextStep && (
                    <p className="text-xs text-muted-foreground">
                      下一步:{it.nextStep}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 灰烬备忘录 */}
      {reviews.length > 0 && (
        <section aria-label="人际灰烬备忘录">
          <h2 className="mb-3 text-lg font-semibold">人际灰烬备忘录</h2>
          <div className="flex flex-col gap-3">
            {reviews.map((rv) => (
              <Card key={rv.id} className="border-l-4 border-l-primary py-3">
                <CardContent className="flex flex-col gap-1.5 px-4 text-sm">
                  <p className="leading-relaxed">{rv.whatHappened}</p>
                  <p className="text-muted-foreground">原则:{rv.principle}</p>
                  <p className="text-muted-foreground">
                    拦截规则:{rv.interceptionRule}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
