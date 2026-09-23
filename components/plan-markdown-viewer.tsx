"use client"

import { useState } from "react"
import { Copy, Download, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PlanMarkdownViewer({ markdown, title }: { markdown: string; title: string }) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function download() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `沟通计划-${title.slice(0, 20)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={copy}>
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? "已复制" : "复制 Markdown"}
        </Button>
        <Button variant="outline" size="sm" onClick={download} className="bg-card">
          <Download className="size-4" aria-hidden="true" />
          下载 .md
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "收起预览" : "展开预览"}
        </Button>
      </div>
      {open && (
        <pre className="scrollbar-none shadow-card overflow-x-auto whitespace-pre-wrap rounded-xl border bg-card p-4 font-mono text-xs leading-relaxed md:p-5">
          {markdown}
        </pre>
      )}
    </div>
  )
}
