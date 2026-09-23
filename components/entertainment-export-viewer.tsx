"use client"

import { useState, useTransition } from "react"
import { Check, Copy, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { markTickTickCopied } from "@/app/actions/entertainment"

export function CopyBlock({ label, value, sessionId, recordCopy = false }: { label: string; value: string; sessionId?: number; recordCopy?: boolean }) {
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    if (recordCopy && sessionId) startTransition(async () => { await markTickTickCopied(sessionId) })
    window.setTimeout(() => setCopied(false), 1800)
  }
  return <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">{label}</p><Button type="button" size="sm" variant="outline" onClick={copy} disabled={pending}>{copied ? <Check /> : <Copy />}{copied ? "已复制" : "复制"}</Button></div><pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-muted-foreground">{value}</pre></div>
}

export function MarkdownViewer({ value, title }: { value: string; title: string }) {
  const download = () => {
    const blob = new Blob([value], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${title.replace(/[^\w\u4e00-\u9fff-]+/g, "-")}.md`
    anchor.click()
    URL.revokeObjectURL(url)
  }
  return <div className="flex flex-col gap-3"><CopyBlock label="Markdown 快照" value={value} /><Button type="button" variant="outline" onClick={download}><Download />下载 Markdown</Button></div>
}
