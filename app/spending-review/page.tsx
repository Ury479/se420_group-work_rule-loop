import Link from "next/link"
import { Plus, ShieldAlert, Hourglass, Bot, UserCheck, Compass, ScrollText } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getSpendingStats } from "@/app/actions/spending-review"
import { categoryLabel } from "@/lib/spending-review-types"
import { RiskBadge, DecisionStatusBadge } from "@/components/spending-badges"
import type { SpendingReview } from "@/lib/db/schema"

export const metadata = { title: "决策拦截台 | 高额支出审查" }

function ReviewRow({ r }: { r: SpendingReview }) {
  return (
    <Link
      href={`/spending-review/${r.id}`}
      className="group/row shadow-card flex flex-col gap-1.5 rounded-xl border bg-card px-4 py-3 transition-colors hover:border-foreground/25"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium group-hover/row:underline">{r.title}</p>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {r.amount} <span className="text-xs font-normal text-muted-foreground">{r.currency}</span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <DecisionStatusBadge status={r.decisionStatus} />
        <RiskBadge level={r.riskLevel} />
        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{categoryLabel(r.category)}</span>
        <span className="text-muted-foreground/70">{new Date(r.createdAt).toISOString().slice(0, 10)}</span>
      </div>
    </Link>
  )
}

function Section({
  title,
  icon: Icon,
  items,
  empty,
}: {
  title: string
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>
  items: SpendingReview[]
  empty: string
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        {title}
        {items.length > 0 && (
          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
            {items.length}
          </span>
        )}
      </h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-3 text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((r) => (
            <ReviewRow key={r.id} r={r} />
          ))}
        </div>
      )}
    </section>
  )
}

export default async function SpendingReviewPage() {
  const stats = await getSpendingStats()

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">决策拦截台</h1>
            <p className="text-sm text-muted-foreground text-pretty">
              高额支出与负面状态决策拦截:识别状态 → 判断风险 → 拆解需求 → 冷静期 → Markdown 审核。
            </p>
          </div>
          <Link href="/spending-review/new" className={cn(buttonVariants({ size: "sm" }), "shrink-0")}>
            <Plus className="size-4" aria-hidden="true" />
            新建审核
          </Link>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
            累计 {stats.total} 条
          </span>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
            成功拦截 {stats.intercepted} 笔
          </span>
          <Link
            href="/spending-review/baseline"
            className="rounded-full border px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            最佳状态决策协议
          </Link>
          <Link
            href="/spending-review/recovery"
            className="rounded-full border px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            主线回归
          </Link>
          <Link
            href="/spending-review/anchors"
            className="rounded-full border px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            消费参照物
          </Link>
          <Link
            href="/convert"
            className="rounded-full border px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            消费价值换算
          </Link>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-xl border border-primary/35 bg-card p-5">
        <h2 className="text-lg font-semibold">这笔投入，后来真正帮到了什么？</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">留下期待，对照结果与未知，再约一次最小验证。新版为隔离设计预览，不改动原有审查记录。</p>
        <Link href="/spending-review/preview" className={cn(buttonVariants({ variant: "outline" }), "min-h-11 w-fit")}>
          打开新版消费审查预览
        </Link>
      </section>

      <Section title="待冷静决策" icon={Hourglass} items={stats.cooling} empty="没有处于冷静期的决策。" />
      <Section title="待 GPT 审核" icon={Bot} items={stats.awaitingGpt} empty="没有等待外部审核的支出。" />
      <Section title="待人工确认" icon={UserCheck} items={stats.awaitingFinal} empty="没有等待最终确认的支出。" />
      <Section title="最近高风险支出" icon={ShieldAlert} items={stats.highRisk} empty="最近没有高风险支出,保持住。" />
      <Section title="最近记录" icon={ScrollText} items={stats.recent} empty="还没有任何支出审核记录。点击右上角新建。" />

      <section className="shadow-card flex items-start gap-3 rounded-xl border bg-card p-4">
        <Compass className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
          晚上 8 点至凌晨 4 点不完成非必要高额付款;负面状态下不做不可逆决定;冲动被拦截后,只需要回到一个最小主线动作。
        </p>
      </section>
    </main>
  )
}
