import Link from "next/link"
import { ArrowRight, Clock, Coins, History, Play } from "lucide-react"
import { getEntertainmentDashboard } from "@/app/actions/entertainment"
import { StartEntertainmentForm } from "@/components/entertainment-forms"
import { RESULT_META } from "@/lib/entertainment-rules"

export const metadata = { title: "娱乐闭环 | 决策拦截台", description: "用边界、结果评估与复盘管理娱乐，而不是用意志力对抗。" }

const statusLabel: Record<string, string> = { active: "进行中", ended: "待评估", assessed: "待复盘", reviewed: "已闭环", abandoned: "已放弃" }

export default async function EntertainmentPage() {
  const { sessions, assessments } = await getEntertainmentDashboard()
  const active = sessions.find((item) => item.status === "active")
  const pending = sessions.filter((item) => item.status === "ended" || item.status === "assessed")
  const assessed = Array.from(assessments.values())
  const averageScore = assessed.length ? Math.round(assessed.reduce((sum, item) => sum + item.score, 0) / assessed.length) : null

  return <main className="flex flex-1 flex-col gap-6 py-6">
    <header className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">稳定娱乐</p><h1 className="text-balance text-2xl font-semibold tracking-tight">娱乐闭环</h1></div>
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-right"><p className="text-xs text-muted-foreground">平均结果分</p><p className="font-mono text-lg font-semibold">{averageScore ?? "—"}</p></div>
      </div>
      <p className="text-pretty text-sm leading-relaxed text-muted-foreground">开始前设边界，结束后看净结果。不是禁止娱乐，而是避免娱乐偷走主线。</p>
    </header>

    {active ? <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start justify-between gap-3"><div className="flex flex-col gap-1"><span className="text-xs font-medium text-primary">进行中的会话</span><h2 className="font-semibold">{active.title}</h2><p className="text-sm text-muted-foreground">计划 {active.plannedMinutes} 分钟 · 预算 {active.plannedBudgetCny} 元</p></div><Play className="size-5 text-primary" /></div>
      <Link href={`/entertainment/${active.id}`} className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">查看并结束会话<ArrowRight className="size-4" /></Link>
    </section> : <section className="rounded-xl border border-border bg-card p-4"><div className="mb-4 flex flex-col gap-1"><h2 className="font-semibold">开始一次有边界的娱乐</h2><p className="text-sm text-muted-foreground">只填最小必要信息。每次只允许一个进行中会话。</p></div><StartEntertainmentForm /></section>}

    {pending.length > 0 && <section className="flex flex-col gap-3"><div className="flex items-center gap-2"><Clock className="size-4 text-amber-600" /><h2 className="font-semibold">需要完成的闭环</h2></div>{pending.map((item) => <Link key={item.id} href={`/entertainment/${item.id}`} className="flex min-h-14 items-center justify-between rounded-xl border border-amber-600/30 bg-amber-600/5 p-4"><div><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{statusLabel[item.status]}</p></div><ArrowRight className="size-4" /></Link>)}</section>}

    <section className="flex flex-col gap-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><History className="size-4 text-muted-foreground" /><h2 className="font-semibold">历史会话</h2></div><span className="text-xs text-muted-foreground">最近 {sessions.length} 条</span></div>
      {sessions.length === 0 ? <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">还没有娱乐记录。先开始一次有边界的会话。</div> : <div className="flex flex-col gap-2">{sessions.map((item) => { const assessment = assessments.get(item.id); return <Link key={item.id} href={`/entertainment/${item.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary"><div className="min-w-0"><p className="truncate font-medium">{item.title}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{statusLabel[item.status]}</span><span className="flex items-center gap-1"><Clock className="size-3" />{assessment?.actualMinutes ?? item.plannedMinutes} 分钟</span><span className="flex items-center gap-1"><Coins className="size-3" />{assessment?.actualCostCny ?? item.plannedBudgetCny} 元</span></div></div>{assessment ? <div className="shrink-0 text-right"><p className="font-mono text-lg font-semibold">{assessment.score}</p><p className="text-xs text-muted-foreground">{RESULT_META[assessment.resultLevel as keyof typeof RESULT_META].label}</p></div> : <ArrowRight className="size-4 shrink-0 text-muted-foreground" />}</Link> })}</div>}
    </section>
  </main>
}
