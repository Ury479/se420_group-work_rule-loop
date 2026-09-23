import { FileText } from "lucide-react"
import { HudHeader } from "@/components/hud"
import { RulesList } from "@/components/rules-list"
import { getRules } from "@/app/actions/rules"
import { getReviews } from "@/app/actions/evidence-review"
import { getRuleExecutionStats } from "@/app/actions/entropy-principles"

export const metadata = {
  title: "规则库 | 关键动作拦截台",
}

export default async function RulesPage() {
  const [rules, reviews, stats] = await Promise.all([getRules(), getReviews(), getRuleExecutionStats()])

  return (
    <div className="flex flex-col gap-6">
      <HudHeader
        icon={FileText}
        tone="gold"
        eyebrow="RuleLoop · Rules"
        title="规则库"
        description="每一条规则都来自一次真实的错误。已启用的规则会在对应场景的确认流程中提醒你。"
      />
      <section aria-label="执行率统计" className="rounded-lg border border-border bg-card px-5 py-4 shadow-card">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">活跃规则</dt>
            <dd className="mt-1 font-serif text-2xl tabular-nums">
              {stats.activeRules}
              <span className="ml-1 text-sm text-muted-foreground">/ {stats.totalRules}</span>
            </dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">总触发</dt>
            <dd className="mt-1 font-serif text-2xl tabular-nums">{stats.totalMatches}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">已执行</dt>
            <dd className="mt-1 font-serif text-2xl tabular-nums">{stats.totalActed}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">执行率</dt>
            <dd className="mt-1 font-serif text-2xl tabular-nums">
              {stats.executionRate !== null ? `${stats.executionRate}%` : "—"}
            </dd>
          </div>
        </dl>
      </section>
      <RulesList rules={rules} reviews={reviews} />
    </div>
  )
}
