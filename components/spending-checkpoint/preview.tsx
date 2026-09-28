"use client"

import Link from "next/link"
import { Activity, useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, CalendarClock, ChevronRight, CircleHelp, FlaskConical, History, Scale } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { HudPanel } from "@/components/hud"
import { TranslateToggle } from "@/components/page-translator"
import { cn } from "@/lib/utils"
import { createTopics, checkpointLabel, isDue, type ConversionContext, type Decision, type ReviewTopic } from "@/lib/spending-checkpoint-preview"
import { Field, ReviewSelect } from "./fields"
import { EvidencePanel } from "./evidence-panel"
import { CloseRoundForm, DecisionForm, ExpectationForm } from "./review-forms"
import { ReminderStatus, ReviewHistory } from "./review-history"

type View = "home" | "plan" | "review" | "history"
const navigation: { id: View; label: string }[] = [{ id: "home", label: "当前问题" }, { id: "plan", label: "留下期待" }, { id: "review", label: "回访判断" }, { id: "history", label: "判断历史" }]
const emptyDecision: Decision = { question: "", action: "", criterion: "" }

export function SpendingCheckpointPreview({ conversion }: { conversion?: ConversionContext }) {
  const [topics, setTopics] = useState(() => createTopics(conversion))
  const [topicId, setTopicId] = useState(conversion ? "conversion" : "tool")
  const [view, setView] = useState<View>(conversion ? "plan" : "home")
  const [drafts, setDrafts] = useState<Record<string, Decision>>({})
  const [unknown, setUnknown] = useState("")
  const [simulateDue, setSimulateDue] = useState(false)
  const [notice, setNotice] = useState("")
  const [now, setNow] = useState(() => Date.now())
  const root = useRef<HTMLElement>(null)
  const topic = topics.find((item) => item.id === topicId)!
  const round = topic.current
  const editable = round.status === "reviewing"
  const due = isDue(round, now) || (simulateDue && round.status === "waiting" && Boolean(round.checkpoint))
  const draft = drafts[topicId] ?? emptyDecision
  const statusLabel = round.status === "draft" ? "待约定" : round.status === "paused" ? "已暂停" : round.status === "ended" ? "已结束" : editable ? "回访中" : due ? "待回访" : "等待节点"
  const actionLabel = round.status === "draft" ? "约一次真实回访" : round.status === "paused" ? "重新约定节点" : round.status === "ended" ? "查看判断历史" : editable ? "继续判断" : due ? "开始这次回访" : "查看这次验证"

  useEffect(() => {
    if (root.current) root.current.dataset.ready = "true"
    const interval = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [])

  function update(next: ReviewTopic) {
    setTopics((items) => items.map((item) => item.id === next.id ? next : item))
  }
  function navigate(next: View) {
    setView(next)
    requestAnimationFrame(() => {
      document.getElementById(`preview-${next}`)?.focus({ preventScroll: true })
      document.getElementById("preview-navigation")?.scrollIntoView({ block: "start", behavior: "instant" })
    })
  }
  function beginReview() {
    if (["paused", "ended"].includes(round.status)) return
    if (!round.mainline || !round.expectations[0]?.text) return navigate("plan")
    update({ ...topic, current: { ...round, status: "reviewing" } })
    navigate("review")
  }
  function primaryAction() {
    if (["draft", "paused"].includes(round.status)) return navigate("plan")
    if (round.status === "ended") return navigate("history")
    if (due) return beginReview()
    navigate("review")
  }
  function save(next: ReviewTopic) {
    update(next); setSimulateDue(false); setNow(Date.now())
    setNotice("约定已保留在本次预览，尚未写入数据库，也未创建外部提醒。")
    navigate("home")
  }
  function chooseQuestion(question: string) {
    if (["paused", "ended"].includes(round.status)) return
    const toolCase = topic.id === "tool"
    setDrafts((items) => ({ ...items, [topicId]: { question,
      action: toolCase ? "先完成一次真实回访，再决定是否继续开发。" : "选一项下一阶段的真实任务，先用已有工具尝试一次。",
      criterion: toolCase ? "是否补出原本遗漏的信息；是否形成一个具体下一步；记录整理材料和完成回访的负担。" : "是否完成这项任务；遇到哪些具体限制；能否留下一份可查看的材料。",
    } }))
    beginReview()
    requestAnimationFrame(() => {
      document.getElementById("minimum-validation")?.scrollIntoView({ block: "start", behavior: "instant" })
      document.getElementById("decision-question")?.focus({ preventScroll: true })
    })
  }

  function unknownsPanel(interactive: boolean) {
    return <section className="flex flex-col gap-4" aria-label="未知的信息">
      <div className="flex items-center gap-2"><CircleHelp className="size-5 text-primary" aria-hidden="true" /><h2 className="text-lg font-semibold">未知的信息</h2></div>
      <p className="text-sm leading-relaxed text-muted-foreground">先找到一个值得验证的问题，而不是急着下结论。</p>
      {round.unknowns.length ? <ul className="flex flex-col gap-2">{round.unknowns.map((question, index) => <li key={index} className="rounded-lg border border-border bg-card p-4"><div className="flex flex-col items-start gap-3"><p data-no-translate className="text-base leading-relaxed">{question}</p>{interactive && <Button type="button" variant="link" onClick={() => chooseQuestion(question)}>先验证这个问题<ArrowRight data-icon="inline-end" /></Button>}</div></li>)}</ul> : <p className="text-sm text-muted-foreground">尚未补充未知，不代表已经确定。</p>}
      {editable && view === "review" && <form onSubmit={(event) => { event.preventDefault(); const value = unknown.trim(); if (value && !round.unknowns.includes(value)) update({ ...topic, current: { ...round, unknowns: [...round.unknowns, value] } }); setUnknown("") }} className="flex flex-col gap-3">
        <Field id="unknown-question" label="还缺什么依据"><Input id="unknown-question" required maxLength={500} value={unknown} onChange={(e) => setUnknown(e.target.value)} placeholder="也可以如实写：我还不知道" /></Field>
        <Button type="submit" variant="outline" className="w-fit">保留这个未知</Button>
      </form>}
    </section>
  }

  return <main ref={root} className="flex flex-col gap-6 font-sans">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/spending-review" className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" />原消费审查台</Link><TranslateToggle /></div>
    <header className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-primary"><FlaskConical className="size-4" aria-hidden="true" /><span>消费审查 · 设计预览</span></div>
      <p className="text-sm leading-relaxed text-muted-foreground">先记住期待，再用结果判断。此版本仅用于交互评审，不写入真实历史；刷新或离开页面后重置。</p>
    </header>
    <details className="rounded-lg border border-dashed px-4 py-3">
      <summary className="cursor-pointer text-sm text-muted-foreground">预览控制与页面对应</summary>
      <div className="flex flex-col gap-4 pt-4">
        <Field id="preview-case" label="选择评审场景"><ReviewSelect id="preview-case" value={topicId} onChange={(e) => { setTopicId(e.target.value); setView(e.target.value === "blank" || e.target.value === "conversion" ? "plan" : "home"); setSimulateDue(false); setNotice(""); setUnknown("") }}><option value="tool">工具自身的实用性</option><option value="gpt">GPT 这笔投入</option><option value="blank">空白验证卡（不含示例）</option>{conversion && <option value="conversion">带入的真实换算（只读）</option>}</ReviewSelect></Field>
        <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" checked={simulateDue} disabled={round.status !== "waiting" || !round.checkpoint} onChange={(e) => setSimulateDue(e.target.checked)} className="mt-1 size-4 accent-primary" /><span>模拟节点到期（先约定节点，不修改真实时间）</span></label>
        <p className="text-sm text-muted-foreground">切换场景保留已提交的预览状态，未提交的表单草稿可能重置。</p>
        <dl className="flex flex-col gap-2 text-sm text-muted-foreground"><div><dt>当前问题 / 创建 / 回访</dt><dd className="break-all">/spending-review → /spending-review/preview</dd></div><div><dt>换算上下文</dt><dd>/convert/[id]</dd></div><div><dt>判断历史</dt><dd>本预览内查看；不替换 /archive</dd></div></dl>
      </div>
    </details>
    <nav id="preview-navigation" aria-label="验证页面" className="grid scroll-mt-4 grid-cols-4 border-b border-border">
      {navigation.map((item) => <button key={item.id} type="button" aria-current={view === item.id ? "page" : undefined} onClick={() => navigate(item.id)} className={cn("min-h-12 border-b-2 px-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", view === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>{item.label}</button>)}
    </nav>
    {notice && <p role="status" className="text-sm leading-relaxed text-primary">{notice}</p>}
    {simulateDue && <p role="status" className="text-sm text-primary">正在模拟到期状态，没有发送提醒，也没有改变约定日期。</p>}
    {topic.origin === "example" && <p className="text-sm text-muted-foreground">示例｜依据用户自述整理，未写入个人记录。</p>}
    {topic.conversion && <HudPanel className="flex flex-col gap-3"><h2 className="font-semibold">带入的原始换算快照</h2><p data-no-translate className="text-lg font-medium">{`${topic.conversion.amount} ${topic.conversion.currency}`}</p><p data-no-translate className="break-words text-sm leading-relaxed text-muted-foreground">{topic.conversion.options.join(" / ") || "快照明细不可用"}</p><p data-no-translate className="text-sm text-muted-foreground">{`${topic.conversion.capturedAt ?? "快照日期缺失"} · ${topic.conversion.rate ? `USD/CNY ${topic.conversion.rate}` : "汇率口径缺失"}`}</p><p data-no-translate className="text-sm">{topic.conversion.resolution}</p><Link href={`/convert/${topic.conversion.id}`} className="w-fit text-sm text-primary underline">查看原始换算记录</Link><p className="text-sm text-muted-foreground">仅带入上下文，不推算回报，不改写原记录。</p></HudPanel>}

    <Activity mode={view === "home" ? "visible" : "hidden"}>
      <section id="preview-home" tabIndex={-1} className="flex flex-col gap-6 outline-none">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">我现在要判断的事</span><span className="text-primary">{statusLabel}</span></div>
          <h1 data-no-translate className="text-3xl font-semibold leading-snug tracking-tight text-balance sm:text-4xl">{topic.title}</h1>
          <p data-no-translate className="text-base leading-relaxed text-muted-foreground">{round.mainline || "先留下当前主线与期待，再约定节点。"}</p>
          {topic.id === "tool" && round.number === 1 && <p className="text-lg leading-relaxed text-primary">已经帮助过一次，但持续价值还不知道。</p>}
          <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-card p-5">
            <div className="flex items-start gap-3"><CalendarClock className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" /><div className="flex min-w-0 flex-col gap-2"><p className="font-medium">{round.checkpoint ? "约定的回访节点" : "不用每天记，只在约好的时候回来"}</p><p data-no-translate className="break-words text-sm text-muted-foreground">{checkpointLabel(round.checkpoint)}</p>{round.checkpoint?.kind === "milestone" && <p data-no-translate className="text-sm leading-relaxed">{`${round.checkpoint.milestone} · ${round.checkpoint.milestoneConfirmed ? "用户已确认完成" : "尚未确认完成，上方时间为兜底检查"}`}</p>}</div></div>
            <Button type="button" size="lg" className="h-auto min-h-12 w-full whitespace-normal" onClick={primaryAction}>{actionLabel}<ArrowRight data-icon="inline-end" /></Button>
            <p className="text-sm leading-relaxed text-muted-foreground">{round.status === "ended" || round.status === "paused" ? "当前不会进入待回访队列。" : due ? "到节点只是邀请你回来判断，不代表实验已完成。" : round.checkpoint ? "等待期间不需要签到；也可以主动提前回访。" : "日期还没约定，不是逾期，也没有创建提醒。"}</p>
          </div>
        </div>
        {round.experiment && <section className="flex flex-col gap-2"><h2 className="text-lg font-semibold">这一次约好要验证的事</h2><p data-no-translate className="text-base leading-relaxed">{round.experiment.question}</p><p data-no-translate className="text-sm leading-relaxed text-muted-foreground">{round.experiment.action}</p><p data-no-translate className="text-sm leading-relaxed text-muted-foreground">{round.experiment.criterion}</p></section>}
        <div className="grid gap-5 sm:grid-cols-2">
          <section className="flex flex-col gap-3"><h2 className="text-lg font-semibold">当初的期待</h2>{round.expectations.map((item) => <div key={item.id} className="flex flex-col gap-3"><p data-no-translate className="text-base leading-relaxed">{item.text || "待填写"}</p><p className="text-sm text-muted-foreground">{round.evidence.some((entry) => entry.expectationId === item.id && entry.confirmed && entry.relation === "related") ? "有相关依据，仍需对照判断" : "尚无已确认的相关依据"}</p></div>)}</section>
          <section className="flex flex-col gap-3"><h2 className="text-lg font-semibold">你验证的结果</h2>{round.evidence.filter((item) => item.confirmed).length ? <ul className="flex flex-col gap-3">{round.evidence.filter((item) => item.confirmed).map((item) => <li key={item.id} className="flex flex-col gap-1"><p data-no-translate className="text-sm leading-relaxed">{item.content}</p><p className="text-sm text-muted-foreground">{item.kind === "self_report" ? "用户自述" : item.kind === "material" ? "可查看材料" : "用户确认的候选"}<span>{" · "}</span><span>{item.relation === "related" ? "有关联" : item.relation === "context" ? "仅作背景" : "关联待确认"}</span></p></li>)}</ul> : <p className="text-sm leading-relaxed text-muted-foreground">待回访。暂未有确认结果，不代表没有进展。</p>}</section>
        </div>
        {unknownsPanel(!["paused", "ended"].includes(round.status))}
        {round.conclusion && <p data-no-translate className="rounded-lg border p-4 text-sm leading-relaxed">{round.conclusion}</p>}
        <div className="flex flex-wrap gap-2"><Link href="/convert" className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}><Scale aria-hidden="true" />消费换算</Link><Button variant="ghost" className="min-h-11" onClick={() => navigate("history")}><History data-icon="inline-start" />查看判断历史</Button></div>
      </section>
    </Activity>

    <Activity mode={view === "plan" ? "visible" : "hidden"}><section id="preview-plan" tabIndex={-1} className="outline-none">{round.status === "ended" ? <p className="text-sm text-muted-foreground">这个主题已经结束，原始记录保留在判断历史。</p> : <ExpectationForm key={`${topicId}-${round.number}-${round.changes.length}`} topic={topic} onSave={save} />}</section></Activity>

    <Activity mode={view === "review" ? "visible" : "hidden"}>
      <section id="preview-review" tabIndex={-1} className="flex flex-col gap-7 outline-none">
        <header className="flex flex-col gap-2"><p className="text-sm text-primary">{statusLabel}</p><h2 className="text-2xl font-semibold">带着依据，回来判断</h2><p data-no-translate className="text-sm leading-relaxed text-muted-foreground">{topic.title}</p></header>
        {!editable && !["ended", "paused"].includes(round.status) && <Button type="button" className="h-auto min-h-11 w-fit whitespace-normal" onClick={beginReview}>{due ? "开始这次回访" : "现在主动回访"}<ArrowRight data-icon="inline-end" /></Button>}
        {round.checkpoint?.kind === "milestone" && round.status === "waiting" && <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" checked={round.checkpoint.milestoneConfirmed} onChange={(e) => update({ ...topic, current: { ...round, checkpoint: { ...round.checkpoint!, milestoneConfirmed: e.target.checked } } })} className="mt-1 size-4 accent-primary" /><span>我确认约定的里程碑已经完成</span></label>}
        {round.experiment && <HudPanel className="flex flex-col gap-3"><h3 className="font-medium">这一轮原本要做的验证</h3><p data-no-translate className="text-base leading-relaxed">{round.experiment.action}</p><p data-no-translate className="text-sm leading-relaxed text-muted-foreground">{round.experiment.criterion}</p></HudPanel>}
        <div className="grid items-start gap-6 sm:grid-cols-[0.8fr_1.2fr]">
          <section className="flex flex-col gap-4"><h2 className="text-lg font-semibold">当初的期待</h2>{round.expectations.map((expectation) => <div key={expectation.id} className="flex flex-col gap-2"><p data-no-translate className="text-base leading-relaxed">{expectation.text || "待填写"}</p><p className="text-sm text-muted-foreground">{round.evidence.some((entry) => entry.expectationId === expectation.id && entry.confirmed && entry.relation === "related") ? "有相关依据，仍需对照判断" : "尚无已确认的相关依据"}</p></div>)}<details><summary className="cursor-pointer text-sm text-muted-foreground">当时的背景</summary><p data-no-translate className="whitespace-pre-wrap pt-3 text-sm leading-relaxed text-muted-foreground">{topic.background}</p></details></section>
          <EvidencePanel key={`${topicId}-${round.number}`} round={round} readOnly={!editable} onChange={(evidence) => update({ ...topic, current: { ...round, evidence } })} />
        </div>
        {unknownsPanel(editable)}
        {editable && <DecisionForm key={`${topicId}-${round.number}`} topic={topic} draft={draft} onDraft={(value) => setDrafts((items) => ({ ...items, [topicId]: value }))} onSave={(next) => { setDrafts((items) => ({ ...items, [topicId]: emptyDecision })); save(next) }} />}
        {round.checkpoint && !["paused", "ended"].includes(round.status) && <ReminderStatus round={round} onChange={(reminder) => update({ ...topic, current: { ...round, reminder } })} />}
        {round.status !== "ended" && <div className="flex flex-col gap-4"><Button variant="outline" type="button" className="w-fit" onClick={() => navigate("plan")}>改约具体节点</Button><CloseRoundForm key={`${topicId}-${round.number}`} topic={topic} onSave={(next) => { update(next); setSimulateDue(false); setNotice("状态已变更；如设置过外部提醒，请手动处理旧提醒。"); navigate("home") }} /></div>}
      </section>
    </Activity>
    <Activity mode={view === "history" ? "visible" : "hidden"}><section id="preview-history" tabIndex={-1} className="outline-none"><ReviewHistory topic={topic} /></section></Activity>
    <footer className="flex flex-col gap-3 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground"><p>不需要每日记录，不需要启用 AI，也不需要连接全量私人材料。</p><Link href="/spending-review" className="inline-flex w-fit items-center gap-1 hover:text-foreground">旧消费审查与历史功能<ChevronRight className="size-4" aria-hidden="true" /></Link></footer>
  </main>
}
