"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Copy, Download, Check, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { markSubmittedToGpt } from "@/app/actions/spending-review"

export function SpendingMarkdownViewer({
  markdown,
  exportId,
  submitted,
  title,
}: {
  markdown: string
  exportId: number
  submitted: boolean
  title: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)

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
    a.download = `支出审核-${title.slice(0, 20)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  function markSubmitted() {
    startTransition(async () => {
      await markSubmittedToGpt(exportId)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={copy}>
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? "已复制" : "复制全文"}
        </Button>
        <Button variant="outline" size="sm" onClick={download} className="bg-card">
          <Download className="size-4" aria-hidden="true" />
          下载 .md
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={markSubmitted}
          disabled={isPending || submitted}
          className="bg-card"
        >
          <Send className="size-4" aria-hidden="true" />
          {submitted ? "已提交给 GPT" : "标记已提交给 GPT"}
        </Button>
      </div>
      <pre className="scrollbar-none shadow-card overflow-x-auto whitespace-pre-wrap rounded-xl border bg-card p-4 font-mono text-xs leading-relaxed md:p-5">
        {markdown}
      </pre>
    </div>
  )
}
