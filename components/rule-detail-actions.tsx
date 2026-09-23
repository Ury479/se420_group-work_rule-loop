"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Copy, PauseCircle, Pencil, PlayCircle } from "lucide-react"
import { setRuleActive } from "@/app/actions/rules"

/**
 * 规则详情页底部操作条:编辑 / 复制 / 暂停(启用)。
 * 暂停直接调 server action 切换状态;复制把规则文案写入剪贴板。
 */
export function RuleDetailActions({ ruleId, ruleText, isActive }: { ruleId: number; ruleText: string; isActive: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleActive() {
    setError(null)
    startTransition(async () => {
      const res = await setRuleActive(ruleId, !isActive)
      if (res && "error" in res && res.error) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  async function copyRule() {
    try {
      await navigator.clipboard.writeText(ruleText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("复制失败,请手动复制")
    }
  }

  const itemClass =
    "flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm transition-colors hover:border-primary/50 disabled:opacity-40"

  return (
    <div className="flex flex-col gap-2">
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <Link href={`/rules/${ruleId}/confirm`} className={itemClass}>
          <Pencil className="size-4" aria-hidden="true" />
          编辑
        </Link>
        <button type="button" onClick={copyRule} className={itemClass}>
          <Copy className="size-4" aria-hidden="true" />
          {copied ? "已复制" : "复制"}
        </button>
        <button type="button" onClick={toggleActive} disabled={isPending} className={itemClass}>
          {isActive ? <PauseCircle className="size-4" aria-hidden="true" /> : <PlayCircle className="size-4" aria-hidden="true" />}
          {isPending ? "处理中…" : isActive ? "暂停" : "启用"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
