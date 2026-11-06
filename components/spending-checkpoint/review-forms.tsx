"use client"

import { useState, type FormEvent } from "react"
import { ArrowRight, CalendarClock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { HudPanel } from "@/components/hud"
import { Field, FieldGroup } from "./fields"
import { NodeFields } from "./node-fields"
import { readCheckpoint, scheduleTopic, finishRound, type Decision, type ReviewTopic } from "@/lib/spending-checkpoint-preview"

export function ExpectationForm({ topic, onSave }: { topic: ReviewTopic; onSave: (topic: ReviewTopic) => void }) {
  const [error, setError] = useState("")
  const [noPurchase, setNoPurchase] = useState(false)
  const isNew = topic.current.status === "draft"

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fd = new FormData(event.currentTarget)
    const mainline = String(fd.get("mainline") ?? "").trim()
    const expectation = String(fd.get("expectation") ?? "").trim()
    if (!mainline || !expectation) return setError("请留下当前主线与期待变化。")
    const checkpoint = readCheckpoint(fd)
    if (typeof checkpoint === "string") return setError(checkpoint)
    let next = scheduleTopic(topic, checkpoint, mainline, expectation, new Date().toISOString())
    if (isNew) next = { ...next, background: [topic.background, noPurchase ? "已有工具够用，先不买。" : "", String(fd.get("context") ?? "").trim()].filter(Boolean).join("\n") }
    onSave(next)
  }

  return <form onSubmit={submit} className="flex flex-col gap-6">
    <header className="flex flex-col gap-2"><h2 className="text-2xl font-semibold text-balance">留下一个期待，约好回来看看</h2><p className="text-sm leading-relaxed text-muted-foreground">不用填一份长问卷。记住为什么投入，也允许先不买。</p></header>
    <HudPanel className="p-5">
      <FieldGroup>
        <Field id="expectation-mainline" label="我现在在推进什么"><Input id="expectation-mainline" name="mainline" defaultValue={topic.current.mainline} required maxLength={300} readOnly={!isNew} /></Field>
        <Field id="expectation-original" label="我期待这次投入带来什么"><Textarea id="expectation-original" name="expectation" defaultValue={topic.current.expectations[0]?.text} required maxLength={1000} readOnly={!isNew} rows={3} /></Field>
        {!isNew && <p className="text-sm text-muted-foreground">原始期待不在改约时重写；主线变化请在下一轮说明原因。</p>}
        <NodeFields initial={topic.current.checkpoint} />
        {isNew && <details className="rounded-lg border border-dashed p-4"><summary className="cursor-pointer text-sm">已有资源与当时背景（可选）</summary><div className="pt-4"><FieldGroup>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={noPurchase} onChange={(e) => setNoPurchase(e.target.checked)} className="size-4 accent-primary" /><span>已有工具够用，先不买</span></label>
          <Field id="expectation-context" label="资源状态、材料来源或补充背景"><Textarea id="expectation-context" name="context" rows={3} maxLength={2000} /></Field>
        </FieldGroup></div></details>}
        <p className="text-sm leading-relaxed text-muted-foreground">这里只约定应用内节点。没有通知服务，关闭应用后不会主动提醒。</p>
        {topic.current.checkpoint && <p className="text-sm leading-relaxed text-primary">改约后，请手动更新或删除外部日历旧提醒；本应用无法同步撤回。</p>}
        {error && <p role="alert" className="text-sm text-primary">{error}</p>}
        <Button type="submit" size="lg" className="h-auto min-h-12 w-full whitespace-normal"><CalendarClock data-icon="inline-start" />{isNew ? "约好这次回访" : "保存新的回访节点"}</Button>
        <p className="text-center text-sm text-muted-foreground">仅保留在本次预览；刷新或离开页面后重置。</p>
      </FieldGroup>
    </HudPanel>
  </form>
}

export function DecisionForm({ topic, draft, onDraft, onSave }: { topic: ReviewTopic; draft: Decision; onDraft: (draft: Decision) => void; onSave: (topic: ReviewTopic) => void }) {
  const [error, setError] = useState("")
  const [changeMainline, setChangeMainline] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const decision = { question: draft.question.trim(), action: draft.action.trim(), criterion: draft.criterion.trim() }
    if (!decision.question || !decision.action || !decision.criterion) return setError("请写明待验证问题、一个动作和观察标准。")
    const fd = new FormData(event.currentTarget)
    const checkpoint = readCheckpoint(fd)
    if (typeof checkpoint === "string") return setError(checkpoint)
    const mainline = changeMainline ? String(fd.get("newMainline") ?? "").trim() : topic.current.mainline
    const reason = changeMainline ? String(fd.get("changeReason") ?? "").trim() : ""
    if (changeMainline && (!mainline || !reason)) return setError("主线变化时，请留下新的主线与变化原因。")
    onSave(finishRound(topic, decision, checkpoint, mainline, reason, new Date().toISOString()))
  }

  return <section id="minimum-validation" className="scroll-mt-8 rounded-xl border border-primary/40 bg-card p-5" tabIndex={-1}>
    <form onSubmit={submit} className="flex flex-col gap-5">
      <header className="flex flex-col gap-2"><h2 className="text-xl font-semibold leading-relaxed">这次的决定：先进行最小可行性验证</h2><p className="text-sm leading-relaxed text-muted-foreground">只做一件能增加依据的事，不急着得出“值得”或“不值得”。</p></header>
      <FieldGroup>
        <Field id="decision-question" label="这次先回答哪个问题"><Textarea id="decision-question" required maxLength={1000} rows={2} value={draft.question} onChange={(e) => onDraft({ ...draft, question: e.target.value })} /></Field>
        <Field id="decision-action" label="做哪一个动作" hint="带入的是建议草稿，不代表已经执行；请按实际情况修改。"><Textarea id="decision-action" required maxLength={1000} rows={3} value={draft.action} onChange={(e) => onDraft({ ...draft, action: e.target.value })} /></Field>
        <Field id="decision-criterion" label="看到什么才算获得了依据"><Textarea id="decision-criterion" required maxLength={1500} rows={3} value={draft.criterion} onChange={(e) => onDraft({ ...draft, criterion: e.target.value })} /></Field>
        <NodeFields />
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={changeMainline} onChange={(e) => setChangeMainline(e.target.checked)} className="size-4 accent-primary" /><span>下一轮的主线发生了变化</span></label>
        {changeMainline && <><Field id="new-mainline" label="新的主线"><Input id="new-mainline" name="newMainline" defaultValue={topic.current.mainline} required maxLength={300} /></Field><Field id="mainline-reason" label="为什么改变主线"><Textarea id="mainline-reason" name="changeReason" required maxLength={1000} /></Field></>}
        {error && <p role="alert" className="text-sm text-primary">{error}</p>}
        <Button type="submit" size="lg" className="h-auto min-h-12 w-full whitespace-normal">保存这次决定并约好回访<ArrowRight data-icon="inline-end" /></Button>
        <p className="text-center text-sm text-muted-foreground">上一轮会保留，不覆盖原始期待。仅本次预览有效。</p>
      </FieldGroup>
    </form>
  </section>
}

export function CloseRoundForm({ topic, onSave }: { topic: ReviewTopic; onSave: (topic: ReviewTopic) => void }) {
  const [error, setError] = useState("")
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fd = new FormData(event.currentTarget)
    const reason = String(fd.get("reason") ?? "").trim()
    const mode = fd.get("mode") === "ended" ? "ended" : "paused"
    if (!reason) return setError("请留下暂停或结束的简短理由。")
    const now = new Date().toISOString()
    onSave({ ...topic, current: { ...topic.current, status: mode, conclusion: reason,
      completedAt: mode === "ended" ? now : null,
      changes: [...topic.current.changes, { at: now, action: mode === "ended" ? "结束验证" : "暂停验证", checkpoint: topic.current.checkpoint, reason }],
    } })
  }
  return <details className="rounded-xl border border-dashed p-4"><summary className="cursor-pointer text-sm text-muted-foreground">不必无限验证：暂停或结束</summary><form onSubmit={submit} className="pt-4"><FieldGroup>
    <fieldset className="flex flex-wrap gap-4"><legend className="sr-only">选择暂停或结束</legend><label className="flex items-center gap-2 text-sm"><input type="radio" name="mode" value="paused" defaultChecked className="accent-primary" />暂停，之后再约</label><label className="flex items-center gap-2 text-sm"><input type="radio" name="mode" value="ended" className="accent-primary" />结束这个主题</label></fieldset>
    <Field id="close-reason" label="留下简短理由"><Textarea id="close-reason" name="reason" required maxLength={1000} rows={2} /></Field>
    <p className="text-sm leading-relaxed text-muted-foreground">暂停或结束后，请手动删除外部日历提醒；不会自动撤回。</p>
    {error && <p role="alert" className="text-sm text-primary">{error}</p>}
    <Button type="submit" variant="outline" className="w-fit">确认状态变更</Button>
  </FieldGroup></form></details>
}
