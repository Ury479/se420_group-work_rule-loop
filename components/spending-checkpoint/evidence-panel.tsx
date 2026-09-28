"use client"

import { useState, type FormEvent } from "react"
import { Plus, Link2, Pencil, Check, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, ReviewSelect } from "./fields"
import { isSafeSource, type Evidence, type Round } from "@/lib/spending-checkpoint-preview"

const kindLabels = { self_report: "用户自述", material: "可查看材料", candidate: "待确认候选" }
const relationLabels = { related: "有关联", uncertain: "关联待确认", context: "仅作背景" }

export function EvidencePanel({ round, onChange, readOnly = false }: { round: Round; onChange: (items: Evidence[]) => void; readOnly?: boolean }) {
  const [editing, setEditing] = useState<Evidence | "new" | null>(null)
  const [error, setError] = useState("")
  const [kind, setKind] = useState<Evidence["kind"]>("self_report")
  const [materialMode, setMaterialMode] = useState(false)
  const entries = [...round.evidence].sort((a, b) => Number(b.relation === "related") - Number(a.relation === "related"))
  const selected = typeof editing === "object" ? editing : null

  function open(item: Evidence | "new", material = false) {
    setEditing(item); setError(""); setMaterialMode(material)
    setKind(typeof item === "object" ? item.kind : material ? "material" : "self_report")
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fd = new FormData(event.currentTarget)
    const content = String(fd.get("content") ?? "").trim()
    const source = String(fd.get("source") ?? "").trim()
    if (!content) return setError("请写下一条实际结果，或取消后保留未知。")
    if (kind === "material" && !isSafeSource(source)) return setError("材料请提供有效的 http 或 https 来源链接；无链接可选用户自述。")
    const item: Evidence = {
      id: selected?.id ?? crypto.randomUUID(), content, source, kind,
      occurredOn: String(fd.get("occurredOn") ?? ""), confirmed: fd.get("confirmed") === "on",
      expectationId: String(fd.get("expectationId") ?? ""), relation: fd.get("relation") as Evidence["relation"],
    }
    onChange(selected ? round.evidence.map((entry) => entry.id === selected.id ? item : entry) : [...round.evidence, item])
    setEditing(null)
  }

  return <div className="flex flex-col gap-4">
    <div className="flex flex-col gap-1"><h2 className="text-lg font-semibold">你验证的结果</h2><p className="text-sm leading-relaxed text-muted-foreground">自述也是依据，但不是独立核验；候选内容必须由你确认。</p></div>
    {entries.length ? <ul className="flex flex-col gap-3">{entries.map((entry) => <li key={entry.id} className="rounded-lg border border-border bg-background/40 p-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><span>{kindLabels[entry.kind]}</span><span aria-hidden="true">·</span><span>{entry.confirmed ? "用户已确认" : "尚待确认"}</span></div>
        <p data-no-translate className="whitespace-pre-wrap break-words text-base leading-relaxed">{entry.content}</p>
        <p className="text-sm text-muted-foreground"><span>{relationLabels[entry.relation]}</span>{entry.expectationId && <span data-no-translate>{` · ${round.expectations.find((item) => item.id === entry.expectationId)?.text ?? ""}`}</span>}</p>
        <p className="text-sm text-muted-foreground"><span>{entry.occurredOn ? "发生日期" : "发生日期未提供"}</span>{entry.occurredOn && <span data-no-translate>{` · ${entry.occurredOn}`}</span>}</p>
        {isSafeSource(entry.source) ? <a href={entry.source} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1 text-sm text-primary underline"><Link2 className="size-4" aria-hidden="true" />查看来源</a> : entry.source && <p data-no-translate className="break-words text-sm text-muted-foreground">{entry.source}</p>}
        {entry.kind === "material" && <p className="text-sm text-muted-foreground">链接未自动核验；无法访问时，请在未知中注明。</p>}
        {!readOnly && <div className="flex flex-wrap gap-2">
          {!entry.confirmed && <Button variant="outline" type="button" onClick={() => onChange(round.evidence.map((item) => item.id === entry.id ? { ...item, confirmed: true } : item))}><Check data-icon="inline-start" />确认这条结果</Button>}
          <Button variant="ghost" type="button" onClick={() => open(entry)}><Pencil data-icon="inline-start" />修正</Button>
          <Button variant="ghost" type="button" aria-label={`移除结果 ${entry.content}`} onClick={() => onChange(round.evidence.filter((item) => item.id !== entry.id))}><Trash2 data-icon="inline-start" />移除</Button>
        </div>}
      </div>
    </li>)}</ul> : <p className="rounded-lg border border-dashed p-4 text-sm leading-relaxed text-muted-foreground">尚未关联材料。没有记录不等于没有进展，可以保留“我还不知道”。</p>}
    {!readOnly && <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => open("new")}><Plus data-icon="inline-start" />补充一句结果</Button><Button type="button" variant="ghost" onClick={() => open("new", true)}>粘贴已有材料</Button></div>}
    {editing && !readOnly && <form key={selected?.id ?? (materialMode ? "material" : "new")} onSubmit={save} className="rounded-xl border border-primary/40 bg-card p-4">
      <FieldGroup>
        <Field id="evidence-content" label={materialMode ? "粘贴材料摘要" : "实际发生了什么"}><Textarea id="evidence-content" name="content" defaultValue={selected?.content} required maxLength={3000} rows={4} /></Field>
        <Field id="evidence-kind" label="依据类型"><ReviewSelect id="evidence-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as Evidence["kind"])}><option value="self_report">用户自述</option><option value="material">可查看材料</option><option value="candidate">待确认候选</option></ReviewSelect></Field>
        <Field id="evidence-source" label="来源说明或链接" hint="不会自动读取笔记、聊天或链接内容。"><Input id="evidence-source" name="source" defaultValue={selected?.source} maxLength={1000} /></Field>
        <Field id="evidence-date" label="发生日期（可选）"><Input id="evidence-date" name="occurredOn" type="date" defaultValue={selected?.occurredOn} /></Field>
        <Field id="evidence-expectation" label="回应哪条期待"><ReviewSelect id="evidence-expectation" name="expectationId" defaultValue={selected?.expectationId ?? round.expectations[0]?.id}><option value="">暂不关联</option>{round.expectations.map((item) => <option key={item.id} value={item.id}>{item.text}</option>)}</ReviewSelect></Field>
        <Field id="evidence-relation" label="与期待的关系"><ReviewSelect id="evidence-relation" name="relation" defaultValue={selected?.relation ?? "uncertain"}><option value="related">有关联</option><option value="uncertain">关联待确认</option><option value="context">仅作背景</option></ReviewSelect></Field>
        <label className="flex items-start gap-3 text-sm leading-relaxed"><input name="confirmed" type="checkbox" defaultChecked={selected?.confirmed ?? false} className="mt-1 size-4 accent-primary" /><span>我已核对这条内容，愿意将其确认为本轮依据。</span></label>
        {error && <p role="alert" className="text-sm text-primary">{error}</p>}
        <div className="flex flex-wrap gap-2"><Button type="submit" variant="secondary">保存结果到本次预览</Button><Button type="button" variant="ghost" onClick={() => setEditing(null)}>取消编辑</Button></div>
      </FieldGroup>
    </form>}
  </div>
}
