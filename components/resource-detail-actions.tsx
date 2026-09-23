"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  updateResourceStatus,
  addResourceEvidence,
  addResourceLink,
  deleteResource,
} from "@/app/actions/resources"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { RESOURCE_STATUSES, EVIDENCE_TYPES, LINKED_TYPES, CONVERSION_LEVELS } from "@/lib/resource-types"

export function ResourceStatusPills({ resourceId, status }: { resourceId: number; status: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function setStatus(next: string) {
    setError(null)
    startTransition(async () => {
      const res = await updateResourceStatus({ id: resourceId, status: next })
      if (res && "error" in res && res.error) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  function remove() {
    if (!window.confirm("确定删除该资源及其全部证据、关联与复盘记录?此操作不可撤销。")) return
    startTransition(async () => {
      await deleteResource(resourceId)
      router.push("/resources")
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div
          role="group"
          aria-label="资源状态"
          className="scrollbar-none flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5"
        >
          {RESOURCE_STATUSES.map((s) => {
            const selected = status === s.value
            const danger = ["removal_pending", "removed", "exhausted"].includes(s.value)
            return (
              <button
                key={s.value}
                type="button"
                disabled={isPending}
                aria-pressed={selected}
                onClick={() => setStatus(s.value)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
                  selected && danger
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground"
                )}
              >
                {s.label}
              </button>
            )
          })}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={remove}
          disabled={isPending}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          删除
        </Button>
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs leading-relaxed text-warning-foreground">
          {error}
        </p>
      )}
    </div>
  )
}

export function AddEvidenceForm({ resourceId }: { resourceId: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [evidenceType, setEvidenceType] = useState("note")
  const [level, setLevel] = useState(2)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")

  function submit() {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const res = await addResourceEvidence({
        resourceId,
        evidenceType,
        title: title.trim() || null,
        content: content.trim() || null,
        externalUrl: null,
        conversionLevel: level,
      })
      if (res && "error" in res && res.error) {
        setError(res.error)
        return
      }
      if (res && "cappedToL2" in res && res.cappedToL2) {
        setNotice("笔记类证据属于理解层,最多推进到 L2。要达到 L3+,请提交练习、代码或产出类证据。")
      }
      setTitle("")
      setContent("")
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="w-fit bg-card">
          添加成果证据
        </Button>
        {notice && <p className="text-xs leading-relaxed text-warning-foreground">{notice}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-1.5">
        <Label>证据类型</Label>
        <div role="group" aria-label="证据类型" className="scrollbar-none flex gap-1.5 overflow-x-auto py-0.5">
          {EVIDENCE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={evidenceType === t.value}
              onClick={() => setEvidenceType(t.value)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                evidenceType === t.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>对应转化层级</Label>
        <div role="group" aria-label="转化层级" className="flex gap-1.5">
          {CONVERSION_LEVELS.filter((l) => l.value >= 1).map((l) => (
            <button
              key={l.value}
              type="button"
              aria-pressed={level === l.value}
              onClick={() => setLevel(l.value)}
              title={l.desc}
              className={cn(
                "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                level === l.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              L{l.value}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ev-title">标题</Label>
        <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例:第 3 章二分查找题解" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ev-content">内容摘要</Label>
        <Textarea
          id="ev-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="记录本次产出的核心内容"
          className="min-h-20"
        />
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={isPending}>
          {isPending ? "保存中…" : "保存证据"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
          取消
        </Button>
      </div>
    </div>
  )
}

export function AddLinkForm({ resourceId }: { resourceId: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkedType, setLinkedType] = useState("obsidian_note")
  const [externalTitle, setExternalTitle] = useState("")
  const [keywords, setKeywords] = useState("")
  const [externalUrl, setExternalUrl] = useState("")

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await addResourceLink({
        resourceId,
        linkedType,
        externalTitle: externalTitle.trim() || null,
        externalPlatform: null,
        externalUrl: externalUrl.trim() || null,
        keywords: keywords.trim() || null,
        linkReason: null,
      })
      if (res && "error" in res && res.error) {
        setError(res.error)
        return
      }
      setExternalTitle("")
      setKeywords("")
      setExternalUrl("")
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="w-fit bg-card">
        关联外部笔记 / 任务
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-1.5">
        <Label>关联类型</Label>
        <div role="group" aria-label="关联类型" className="scrollbar-none flex gap-1.5 overflow-x-auto py-0.5">
          {LINKED_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={linkedType === t.value}
              onClick={() => setLinkedType(t.value)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                linkedType === t.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lk-title">标题</Label>
        <Input
          id="lk-title"
          value={externalTitle}
          onChange={(e) => setExternalTitle(e.target.value)}
          placeholder="例:Obsidian「动态规划模型」笔记"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lk-keywords">关键词(逗号分隔)</Label>
        <Input
          id="lk-keywords"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="例:算法,动态规划"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lk-url">链接(可选)</Label>
        <Input id="lk-url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://…" />
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={isPending}>
          {isPending ? "保存中…" : "保存关联"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
          取消
        </Button>
      </div>
    </div>
  )
}
