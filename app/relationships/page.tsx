import Link from "next/link"
import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RelationshipCard } from "@/components/relationship-card"
import {
  getRelationships,
  getLatestRelationshipReview,
} from "@/app/actions/relationships"
import {
  RELATIONSHIP_STATUS_LABELS,
  METHODOLOGY_COPY,
  type RelationshipStatus,
} from "@/lib/relationships"
import { Zap, UserPlus, Flame, TriangleAlert } from "lucide-react"
import { RelationshipSeedButton } from "@/components/relationship-seed-button"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "人际关系筛查台 | 关键动作拦截台",
  description:
    "基于事实和结果,判断关系对事业、工作、情绪和发展的净影响。广泛社交,广泛筛选,精准维护,守住底线。",
}

const STATUS_ORDER: RelationshipStatus[] = [
  "long_term_maintain",
  "normal_contact",
  "observe_carefully",
  "boundary_needed",
]

export default async function RelationshipsPage() {
  const [relationships, latestReview] = await Promise.all([
    getRelationships(),
    getLatestRelationshipReview(),
  ])

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: relationships.filter((r) => r.relationshipStatus === status),
  }))

  const riskSignals = relationships.filter(
    (r) =>
      r.relationshipStatus === "observe_carefully" ||
      r.relationshipStatus === "boundary_needed"
  )
  const keyMaintain = relationships.filter(
    (r) => r.relationshipStatus === "long_term_maintain"
  )

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-5 border-b border-border pb-6">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Relationship review</p>
          <h1 className="text-2xl font-semibold text-balance sm:text-3xl">人际关系筛查台</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            基于事实和结果判断关系净影响。{METHODOLOGY_COPY}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button nativeButton={false} render={<Link href="/relationships/new?mode=quick" />}>
            <Zap className="size-4" aria-hidden="true" />
            30 秒快速筛查
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/relationships/new?mode=deep" />}
          >
            <UserPlus className="size-4" aria-hidden="true" />
            新建关系记录
          </Button>
        </div>
        <details className="rounded-lg border border-border bg-card px-3 py-2 text-sm"><summary className="cursor-pointer font-medium text-muted-foreground">初始化已确认的关系背景</summary><div className="mt-3"><RelationshipSeedButton /></div></details>
      </header>

      {/* 最近提醒区 */}
      {(latestReview || riskSignals.length > 0 || keyMaintain.length > 0) && (
        <section aria-label="最近提醒" className="flex flex-col gap-3">
          {latestReview && (
            <Card className="border-l-4 border-l-primary py-3">
              <CardContent className="flex flex-col gap-1 px-4 text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <Flame className="size-4 text-primary" aria-hidden="true" />
                  最近一次人际灰烬备忘录
                </span>
                <p className="text-muted-foreground">原则:{latestReview.principle}</p>
              </CardContent>
            </Card>
          )}
          {riskSignals.length > 0 && (
            <Card className="border-l-4 border-l-warning py-3">
              <CardContent className="flex flex-col gap-1 px-4 text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <TriangleAlert className="size-4 text-warning" aria-hidden="true" />
                  需要注意的关系信号 · {riskSignals.length}
                </span>
                <p className="text-muted-foreground">
                  {riskSignals.map((r) => r.personName).join("、")}
                  :重要沟通前请先走确认流程,减少即时承诺。
                </p>
              </CardContent>
            </Card>
          )}
          {keyMaintain.length > 0 && (
            <Card className="border-l-4 border-l-success py-3">
              <CardContent className="flex flex-col gap-1 px-4 text-sm">
                <span className="font-medium">
                  最近需要维护的关键关系 · {keyMaintain.length}
                </span>
                <p className="text-muted-foreground">
                  {keyMaintain.map((r) => r.personName).join("、")}
                  :定期联系、表达感谢、同步关键进展。
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* 4 个关系分区 */}
      {relationships.length === 0 ? (
        <Card className="py-8">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm leading-relaxed text-muted-foreground">
              还没有关系记录。用 30 秒快速筛查开始:
              只需要 3 个问题,基于事实,不贴标签。
            </p>
            <Button nativeButton={false} render={<Link href="/relationships/new?mode=quick" />}>
              <Zap className="size-4" aria-hidden="true" />
              开始快速筛查
            </Button>
          </CardContent>
        </Card>
      ) : (
        grouped.map(
          ({ status, items }) =>
            items.length > 0 && (
              <section key={status} aria-label={RELATIONSHIP_STATUS_LABELS[status]}>
                <h2 className="mb-3 text-lg font-semibold">
                  {RELATIONSHIP_STATUS_LABELS[status]}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {items.length}
                  </span>
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {items.map((r) => (
                    <RelationshipCard key={r.id} relationship={r} />
                  ))}
                </div>
              </section>
            )
        )
      )}
    </div>
  )
}
