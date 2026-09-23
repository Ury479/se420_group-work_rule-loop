import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, CheckCircle2, Clock, Coins, ShieldAlert } from "lucide-react"
import { getEntertainmentSessionDetail } from "@/app/actions/entertainment"
import { ActiveSessionActions, EntertainmentAssessmentForm, EntertainmentReflectionForm } from "@/components/entertainment-forms"
import { RESULT_META } from "@/lib/entertainment-rules"
import { buildGptPrompt } from "@/lib/entertainment-exports"
import { CopyBlock, MarkdownViewer } from "@/components/entertainment-export-viewer"

export default async function EntertainmentSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getEntertainmentSessionDetail(Number(id))
  if (!detail) notFound()
  const { session, assessment, reflection } = detail
  const meta = assessment ? RESULT_META[assessment.resultLevel as keyof typeof RESULT_META] : null
  const fact = assessment ? `${session.title}实际持续 ${assessment.actualMinutes} 分钟、花费 ${assessment.actualCostCny} 元，结果分 ${assessment.score}。` : ""
  const lesson = assessment?.resultLevel === "harmful" ? "娱乐不能以推迟主线和突破边界为代价。" : "有效娱乐需要在开始前明确停止边界，并在结束后验收恢复效果。"
  const rule = assessment?.resultLevel === "harmful" ? "当娱乐超时、超预算或影响主线时，停止追加投入，至少冷静到次日再开启新会话。" : "娱乐开始前明确时长与预算，结束后立即完成结果评估。"

  return <main className="flex flex-1 flex-col gap-6 py-6">
    <Link href="/entertainment" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />返回娱乐闭环</Link>
    <header className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 flex-col gap-1"><p className="text-xs text-muted-foreground">娱乐会话 #{session.id}</p><h1 className="text-balance text-xl font-semibold">{session.title}</h1></div><span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{session.status === "active" ? "进行中" : session.status === "ended" ? "待评估" : session.status === "assessed" ? "待复盘" : session.status === "reviewed" ? "已闭环" : "已放弃"}</span></div>
      <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-lg bg-secondary p-3"><p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" />计划时长</p><p className="mt-1 font-mono font-semibold">{session.plannedMinutes} 分钟</p></div><div className="rounded-lg bg-secondary p-3"><p className="flex items-center gap-1 text-xs text-muted-foreground"><Coins className="size-3" />预算上限</p><p className="mt-1 font-mono font-semibold">{session.plannedBudgetCny} 元</p></div></div>
      {session.boundaryNote && <div className="mt-3 rounded-lg border border-border p-3"><p className="text-xs font-medium text-muted-foreground">停止边界</p><p className="mt-1 text-sm leading-relaxed">{session.boundaryNote}</p></div>}
    </header>

    {session.ticktickTitle && <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"><div><h2 className="font-semibold">滴答清单执行桥接</h2><p className="mt-1 text-sm text-muted-foreground">只生成一个任务。分别复制标题、正文或检查项到滴答清单。</p></div><CopyBlock label="快速添加标题" value={session.ticktickTitle} sessionId={session.id} recordCopy /><CopyBlock label="完整任务正文" value={session.ticktickBody || ""} sessionId={session.id} recordCopy /><CopyBlock label="检查清单" value={session.ticktickChecklist || ""} sessionId={session.id} recordCopy />{session.ticktickCopiedAt && <p className="text-xs text-muted-foreground">最近复制：{session.ticktickCopiedAt.toLocaleString("zh-CN")}</p>}</section>}

    {session.status === "active" && <section className="rounded-xl border border-primary/30 bg-primary/5 p-4"><h2 className="font-semibold">会话进行中</h2><p className="mb-4 mt-1 text-sm leading-relaxed text-muted-foreground">娱乐结束时主动点击结束。放弃只用于误建会话，不会生成评估。</p><ActiveSessionActions sessionId={session.id} /></section>}

    {session.status === "ended" && <section className="rounded-xl border border-border bg-card p-4"><div className="mb-4"><h2 className="font-semibold">结束后评估</h2><p className="mt-1 text-sm text-muted-foreground">只记录事实。系统依据固定规则计算净结果，不替你做决定。</p></div><EntertainmentAssessmentForm sessionId={session.id} plannedMinutes={session.plannedMinutes} plannedBudgetCny={session.plannedBudgetCny} /></section>}

    {assessment && <section className={`rounded-xl border p-4 ${assessment.resultLevel === "harmful" ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"}`}>
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-muted-foreground">结果卡</p><h2 className="mt-1 text-lg font-semibold">{meta?.label}</h2><p className="mt-1 text-sm text-muted-foreground">{meta?.description}</p></div><div className="text-right"><p className="font-mono text-3xl font-semibold">{assessment.score}</p><p className="text-xs text-muted-foreground">/ 100</p></div></div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><ResultStat label="实际时长" value={`${assessment.actualMinutes} 分钟`} /><ResultStat label="超时" value={`${assessment.overtimeMinutes} 分钟`} /><ResultStat label="实际花费" value={`${assessment.actualCostCny} 元`} /><ResultStat label="恢复感" value={`${assessment.recoveredEnergy} / 10`} /><ResultStat label="停止难度" value={`${assessment.stopDifficulty} / 10`} /><ResultStat label="满意度均值" value={`${assessment.satisfactionAverage} / 10`} /><ResultStat label="主线帮助" value={`${assessment.mainlineHelpScore} / 5`} /><ResultStat label="转化结果" value={({immediate:"立即转化",delayed:"延迟转化",none:"未转化",sleep:"转入睡眠"} as Record<string,string>)[assessment.conversionResult || "none"]} /></dl>
      <div className="mt-4 flex flex-col gap-2 text-sm"><Flag ok={assessment.didStopOnTime} text={assessment.didStopOnTime ? "按时停止" : "超出计划时长"} /><Flag ok={assessment.didStayInBudget} text={assessment.didStayInBudget ? "预算内完成" : "超出预算"} /><Flag ok={!assessment.delayedMainline} text={assessment.delayedMainline ? "影响了主线任务" : "未影响主线"} /></div>
      {assessment.nextRecoveryAction && <div className="mt-4 rounded-lg border border-border bg-background p-3"><p className="text-xs font-medium text-muted-foreground">下一步</p><p className="mt-1 text-sm">{assessment.nextRecoveryAction}</p></div>}
    </section>}

    {session.status === "assessed" && assessment && <><section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"><div><h2 className="font-semibold">GPT 手工复盘桥接</h2><p className="mt-1 text-sm text-muted-foreground">复制提示词到 GPT，完成分析后回填。系统不会自动调用 AI，也不会替你同意结论。</p></div><CopyBlock label="GPT 复盘提示词" value={buildGptPrompt(session, assessment)} /></section><section className="rounded-xl border border-border bg-card p-4"><div className="mb-4"><h2 className="font-semibold">确认复盘沉淀</h2><p className="mt-1 text-sm text-muted-foreground">先回填 GPT 分析并明确同意态度，再决定是否写入灰烬和规则库。</p></div><EntertainmentReflectionForm sessionId={session.id} defaultFact={fact} defaultLesson={lesson} defaultRule={rule} /></section></>}

    {reflection && <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"><div className="flex items-center gap-2"><CheckCircle2 className="size-5 text-primary" /><h2 className="font-semibold">复盘已沉淀</h2></div><div className="flex flex-col gap-3 text-sm"><div><p className="text-xs text-muted-foreground">你对 GPT 的态度</p><p className="mt-1">{({ agreed: "同意", partially_agreed: "部分同意", disagreed: "不同意", pending: "待确认" } as Record<string, string>)[reflection.gptResultStatus]}</p></div><div><p className="text-xs text-muted-foreground">教训</p><p className="mt-1 leading-relaxed">{reflection.lesson}</p></div>{reflection.principle && <div><p className="text-xs text-muted-foreground">原则</p><p className="mt-1 leading-relaxed">{reflection.principle}</p></div>}{reflection.candidateRule && <div><p className="text-xs text-muted-foreground">规则</p><p className="mt-1 leading-relaxed">{reflection.candidateRule}</p></div>}</div><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-secondary px-2.5 py-1">{reflection.ashMemoId ? "已写入灰烬备忘录" : "未写入灰烬"}</span><span className="rounded-full bg-secondary px-2.5 py-1">{reflection.confirmationRuleId ? "规则已保存(默认关闭)" : "未写入规则库"}</span></div>{reflection.markdownSnapshot && <MarkdownViewer value={reflection.markdownSnapshot} title={`娱乐复盘-${session.title}`} />}</section>}

    {session.status === "abandoned" && <section className="rounded-xl border border-dashed border-border p-6 text-center"><ShieldAlert className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">该会话已放弃，不计入结果评分。</p></section>}
  </main>
}

function ResultStat({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-secondary p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div> }
function Flag({ ok, text }: { ok: boolean; text: string }) { return <p className={`flex items-center gap-2 ${ok ? "text-foreground" : "text-destructive"}`}><span aria-hidden className={`size-2 rounded-full ${ok ? "bg-primary" : "bg-destructive"}`} />{text}</p> }
