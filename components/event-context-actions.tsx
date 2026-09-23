"use client"

import { useState, useTransition } from "react"
import { generateGptContext, generateDailySummary } from "@/app/actions/event-library"
import { Button } from "@/components/ui/button"
import { Sparkles, CalendarCheck, Copy, Check } from "lucide-react"

// GPT Context / Daily Review 摘要生成:只生成结构化文本,不调用任何模型
export function EventContextActions({ eventId }: { eventId: number }) {
  const [isPending, startTransition] = useTransition()
  const [output, setOutput] = useState<string | null>(null)
  const [outputTitle, setOutputTitle] = useState("")
  const [copied, setCopied] = useState(false)

  function run(kind: "gpt" | "daily") {
    startTransition(async () => {
      const text =
        kind === "gpt" ? await generateGptContext(eventId) : await generateDailySummary(eventId)
      if (text) {
        setOutput(text)
        setOutputTitle(kind === "gpt" ? "GPT 分析 Context" : "Daily Review 摘要")
        setCopied(false)
      }
    })
  }

  async function copy() {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => run("gpt")} disabled={isPending}>
          <Sparkles className="size-4" aria-hidden="true" />
          用 GPT 分析
        </Button>
        <Button variant="outline" size="sm" onClick={() => run("daily")} disabled={isPending} className="bg-card">
          <CalendarCheck className="size-4" aria-hidden="true" />
          加入 Daily Review
        </Button>
      </div>
      {output && (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{outputTitle}</span>
            <Button variant="ghost" size="sm" onClick={copy}>
              {copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {copied ? "已复制" : "复制"}
            </Button>
          </div>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">
            {output}
          </pre>
        </div>
      )}
    </div>
  )
}
