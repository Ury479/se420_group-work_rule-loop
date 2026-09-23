import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getPersonDetail } from "@/app/actions/people-resources"
import {
  relationshipTypeLabel,
  relationshipStageLabel,
  interactionStatusLabel,
  needTypeLabel,
  confidenceLabel,
  communicationTypeLabel,
} from "@/lib/resource-types"
import {
  AddHypothesisForm,
  HypothesisActions,
  AddPlanForm,
  DeletePersonButton,
} from "@/components/person-detail-actions"
import { cn } from "@/lib/utils"

export const metadata = { title: "联系人详情" }

function fmt(d: Date | null): string {
  if (!d) return "未记录"
  return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" })
}

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = Number.parseInt(id, 10)
  if (Number.isNaN(numId)) notFound()

  const detail = await getPersonDetail(numId)
  if (!detail) notFound()
  const { person, hypotheses, plans } = detail

  const activeHypotheses = hypotheses.filter((h) => h.status !== "removed")

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/resources/people"
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回人脉资源
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{person.personName}</h1>
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {interactionStatusLabel(person.interactionStatus)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5">{relationshipTypeLabel(person.relationshipType)}</span>
          <span className="rounded-full bg-muted px-2 py-0.5">{relationshipStageLabel(person.relationshipStage)}</span>
          <span>上次联系:{fmt(person.lastContactAt)}</span>
        </div>
      </header>

      {/* 价值交换 */}
      <section className="shadow-card grid gap-3 rounded-xl border bg-card px-4 py-3.5 md:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xs text-muted-foreground">对方可提供</h2>
          <p className="text-sm leading-relaxed">{person.availableHelp ?? "未记录"}</p>
        </div>
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xs text-muted-foreground">我能回馈</h2>
          <p className="text-sm leading-relaxed">{person.valueICanOffer ?? "未记录"}</p>
        </div>
        {(person.unsuitableTopics || person.boundaryNotes) && (
          <div className="flex flex-col gap-0.5 md:col-span-2">
            <h2 className="text-xs text-muted-foreground">边界</h2>
            <p className="text-sm leading-relaxed">
              {[person.unsuitableTopics && `不讨论:${person.unsuitableTopics}`, person.boundaryNotes]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        )}
      </section>

      {/* 核心诉求假设 */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">核心诉求假设({activeHypotheses.length})</h2>
          <span className="text-xs text-muted-foreground">均为待验证假设,非事实</span>
        </div>
        {activeHypotheses.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-5 text-center text-xs text-muted-foreground">
            尚无诉求假设。先假设对方在意什么,再用沟通验证。
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activeHypotheses.map((h) => (
              <li key={h.id} className="shadow-card flex flex-col gap-2 rounded-xl border bg-card px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {needTypeLabel(h.needType)}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      h.confidence === "high"
                        ? "bg-accent text-accent-foreground"
                        : h.confidence === "medium"
                          ? "bg-warning/15 text-warning-foreground"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    置信度:{confidenceLabel(h.confidence)}
                  </span>
                  <div className="ml-auto">
                    <HypothesisActions id={h.id} />
                  </div>
                </div>
                <p className="text-sm leading-relaxed">{h.hypothesis}</p>
                {h.validationQuestion && (
                  <p className="text-xs text-muted-foreground">验证问题:{h.validationQuestion}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        <AddHypothesisForm personId={person.id} />
      </section>

      {/* 沟通计划 */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">沟通计划({plans.length})</h2>
        {plans.length > 0 && (
          <ul className="flex flex-col gap-2">
            {plans.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/resources/plans/${p.id}`}
                  className="group/plan shadow-card flex flex-col gap-1.5 rounded-xl border bg-card px-4 py-3 transition-colors hover:border-foreground/25"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        p.status === "executed"
                          ? "bg-accent text-accent-foreground"
                          : p.status === "closed"
                            ? "bg-muted text-muted-foreground"
                            : "bg-warning/15 text-warning-foreground"
                      )}
                    >
                      {p.status === "draft" ? "草稿" : p.status === "ready" ? "待执行" : p.status === "executed" ? "已执行" : "已关闭"}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {communicationTypeLabel(p.communicationType)}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">{fmt(p.createdAt)}</span>
                  </div>
                  <p className="line-clamp-2 text-sm leading-snug group-hover/plan:underline">{p.communicationGoal}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <AddPlanForm personId={person.id} />
      </section>

      <div className="flex justify-end border-t pt-4">
        <DeletePersonButton personId={person.id} />
      </div>
    </div>
  )
}
