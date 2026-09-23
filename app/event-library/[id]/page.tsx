import Link from "next/link"
import { notFound } from "next/navigation"
import { getEventCase } from "@/app/actions/event-library"
import { getCards } from "@/app/actions/cards"
import { MiniReviewForm } from "@/components/mini-review-form"
import { EventContextActions } from "@/components/event-context-actions"
import { EventStatusActions } from "@/components/event-status-actions"
import { EventCaseCard } from "@/components/event-case-card"
import { CardContainer } from "@/components/card-container"
import { eventTypeLabel, sceneLabel, rootCauseLabel, ruleStatusLabel } from "@/lib/event-library-types"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function EventCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numId = Number.parseInt(id, 10)
  if (Number.isNaN(numId)) notFound()

  const data = await getEventCase(numId)
  if (!data) notFound()
  const { eventCase: c, reviews, rules, related } = data
  const cards = await getCards("event_case", c.id)
  const review = reviews[0]

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/event-library"
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        返回案例库
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{eventTypeLabel(c.eventType)}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{sceneLabel(c.scene)}</span>
          {c.itemName && <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{c.itemName}</span>}
          <span className="text-muted-foreground/70">{c.createdAt.toISOString().slice(0, 10)}</span>
        </div>
        <h1 className="text-xl font-semibold leading-snug tracking-tight text-balance md:text-2xl">{c.title}</h1>
        {(c.searchMinutes > 0 || c.moneyLoss > 0) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {c.searchMinutes > 0 && <span>{`寻找耗时 ${c.searchMinutes} 分钟`}</span>}
            {c.moneyLoss > 0 && <span>{`损失 ${c.moneyLoss} 元`}</span>}
          </div>
        )}
        <EventStatusActions eventId={c.id} status={c.status} />
      </header>

      {/* 五问复盘 */}
      {review ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-tight">复盘记录</h2>
          <div className="shadow-card flex flex-col gap-4 rounded-xl border bg-card p-4 text-sm leading-relaxed md:p-5">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">发生了什么</p>
              <p>{review.whatHappened}</p>
            </div>
            {review.whyNotDiscovered && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground">为什么没有立即发现</p>
                <p>{review.whyNotDiscovered}</p>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">根因</p>
              <p>
                <span className="inline-flex rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning-foreground">
                  {rootCauseLabel(review.rootCause)}
                </span>
              </p>
            </div>
            {review.prevention && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground">如何防止</p>
                <p>{review.prevention}</p>
              </div>
            )}
            {review.systemRule && (
              <div className="flex flex-col gap-1 rounded-lg bg-accent/60 p-3">
                <p className="text-xs font-medium text-accent-foreground/80">系统记住的规则</p>
                <p className="font-medium text-accent-foreground">{review.systemRule}</p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">复盘任务</h2>
          <p className="text-xs text-muted-foreground">
            现实问题解决之后再做。三步:风险信号 → 决策点 → 下次行动。
          </p>
          <MiniReviewForm
            eventId={c.id}
            eventTitle={c.title}
            impactLevel={c.impactLevel}
            eventCreatedAt={new Date(c.createdAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
          />
        </section>
      )}

      {/* 生成的规则 */}
      {rules.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold tracking-tight">本案例生成的规则</h2>
          {rules.map((r) => (
            <div
              key={r.id}
              className="shadow-card flex flex-col gap-2 rounded-xl border border-l-2 border-l-foreground/30 bg-card px-4 py-3.5 text-sm"
            >
              <span
                className={
                  r.status === "active"
                    ? "w-fit rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
                    : "w-fit rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                }
              >
                {ruleStatusLabel(r.status)}
              </span>
              <p className="font-medium leading-relaxed">{r.ruleText}</p>
            </div>
          ))}
        </section>
      )}

      {/* GPT / Daily Review */}
      {review && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">输出为决策支持</h2>
          <EventContextActions eventId={c.id} />
        </section>
      )}

      {/* 卡片流挂载 */}
      <CardContainer contextType="event_case" contextId={c.id} initialCards={cards} />

      {/* 同场景案例 */}
      {related.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            同场景历史案例
          </h2>
          <div className="flex flex-col gap-2">
            {related.map((rc) => (
              <EventCaseCard key={rc.id} eventCase={rc} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
