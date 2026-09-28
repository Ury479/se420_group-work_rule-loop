"use client"

import { Download, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, ReviewSelect } from "./fields"
import { EvidencePanel } from "./evidence-panel"
import { checkpointLabel, downloadPreview, type ReviewTopic, type Round } from "@/lib/spending-checkpoint-preview"

export function ReminderStatus({ round, onChange }: { round: Round; onChange: (value: Round["reminder"]) => void }) {
  return <details className="rounded-xl border border-dashed p-4">
    <summary className="cursor-pointer text-sm">应用外提醒：尚无自动通知服务</summary>
    <div className="flex flex-col gap-4 pt-4">
      <p className="text-sm leading-relaxed text-muted-foreground">首轮试用需验证一次应用外启动。可自行添加日历提醒或请人提醒；本预览不会创建日历事件，也没有可跨设备恢复的真实卡片链接。</p>
      <Field id="reminder-status" label="演示提醒状态（用户自报）">
        <ReviewSelect id="reminder-status" value={round.reminder} onChange={(e) => onChange(e.target.value as Round["reminder"])}>
          <option value="unconfigured">未配置外部提醒</option><option value="added">自报已添加，未验证送达</option><option value="arrived">自报提醒已到达</option><option value="opened">自报通过提醒打开回访</option>
        </ReviewSelect>
      </Field>
      <p className="text-sm leading-relaxed text-muted-foreground">已添加不等于送达，送达不等于已读，打开也不等于行动完成。此状态不作为真实实验记录。</p>
    </div>
  </details>
}

function RoundHistory({ round }: { round: Round }) {
  return <details className="rounded-xl border bg-card p-5">
    <summary className="cursor-pointer"><span className="font-medium"><span>验证轮次</span><span>{` ${round.number}`}</span></span><span className="ml-3 text-sm text-muted-foreground">{round.status === "ended" ? "已结束" : "本轮已归档"}</span></summary>
    <div className="flex flex-col gap-5 pt-5">
      <p className="text-sm text-muted-foreground" data-no-translate>{round.completedAt ? new Date(round.completedAt).toLocaleString("zh-CN", { hour12: false }) : ""}</p>
      <div className="flex flex-col gap-2"><h3 className="font-medium">当初的期待</h3>{round.expectations.map((item) => <p key={item.id} data-no-translate className="text-sm leading-relaxed">{item.text}</p>)}<p data-no-translate className="text-sm text-muted-foreground">{round.mainline}</p></div>
      {round.experiment && <div className="flex flex-col gap-2"><h3 className="font-medium">这一轮原本要做的验证</h3><p data-no-translate className="text-sm leading-relaxed">{round.experiment.action}</p><p data-no-translate className="text-sm text-muted-foreground">{round.experiment.criterion}</p></div>}
      <EvidencePanel round={round} onChange={() => {}} readOnly />
      <div className="flex flex-col gap-2"><h3 className="font-medium">未知的信息</h3>{round.unknowns.length ? round.unknowns.map((item, index) => <p key={index} data-no-translate className="text-sm leading-relaxed">{item}</p>) : <p className="text-sm text-muted-foreground">尚未补充未知，不代表已经确定。</p>}</div>
      {round.nextDecision && <div className="flex flex-col gap-2"><h3 className="font-medium">所以决定先</h3><p data-no-translate className="text-sm leading-relaxed">{round.nextDecision.action}</p><p data-no-translate className="text-sm text-muted-foreground">{round.nextDecision.criterion}</p></div>}
      {round.nextCheckpoint && <div className="flex flex-col gap-2"><h3 className="font-medium">当时约定的下一节点</h3><p data-no-translate className="text-sm text-muted-foreground">{checkpointLabel(round.nextCheckpoint)}</p></div>}
      {round.changes.length > 0 && <details><summary className="cursor-pointer text-sm text-muted-foreground">查看本轮节点变更</summary><ul className="flex flex-col gap-2 pt-3">{round.changes.map((change, index) => <li key={index} className="text-sm"><span>{change.action}</span><p data-no-translate className="text-muted-foreground">{`${change.at} · ${checkpointLabel(change.checkpoint)}${change.reason ? ` · ${change.reason}` : ""}`}</p></li>)}</ul></details>}
      {round.conclusion && <p data-no-translate className="text-sm leading-relaxed">{round.conclusion}</p>}
      {round.mainlineChangeReason && <div><h3 className="font-medium">主线变化原因</h3><p data-no-translate className="text-sm leading-relaxed">{round.mainlineChangeReason}</p></div>}
      <p data-no-translate className="text-sm text-muted-foreground">{checkpointLabel(round.checkpoint)}</p>
    </div>
  </details>
}

export function ReviewHistory({ topic }: { topic: ReviewTopic }) {
  const rounds = topic.current.status === "ended" ? [...topic.history, topic.current] : topic.history
  return <section className="flex flex-col gap-5">
    <header className="flex flex-wrap items-start justify-between gap-3"><div className="flex flex-col gap-2"><h2 className="text-2xl font-semibold">我的判断怎样改变了</h2><p className="text-sm leading-relaxed text-muted-foreground">每次保留期待、依据、未知与决定，不用今天的结论改写过去。</p></div><Button variant="outline" type="button" onClick={() => downloadPreview(topic)}><Download data-icon="inline-start" />导出预览记录</Button></header>
    {!rounds.length ? <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6"><History className="size-5 text-muted-foreground" aria-hidden="true" /><h3 className="font-medium">还没有已完成的回访轮次</h3><p className="text-sm leading-relaxed text-muted-foreground">先完成一次判断。约好日期，不等于已经完成验证。</p></div> : [...rounds].reverse().map((round) => <RoundHistory key={round.number} round={round} />)}
    {topic.current.changes.length > 0 && <section className="flex flex-col gap-3"><h3 className="font-medium">本轮节点变更记录</h3><ul className="flex flex-col gap-3">{topic.current.changes.map((item, index) => <li key={index} className="flex flex-col gap-1 rounded-lg border p-3 text-sm"><p>{item.action}</p><p data-no-translate className="text-muted-foreground">{`${new Date(item.at).toLocaleString("zh-CN", { hour12: false })} → ${checkpointLabel(item.checkpoint)}`}</p>{item.reason && <p data-no-translate>{item.reason}</p>}</li>)}</ul></section>}
    <p className="text-sm leading-relaxed text-muted-foreground">这里仅是本次预览的历史，不是数据库中的个人档案。导出也不代表已设置提醒。</p>
  </section>
}
