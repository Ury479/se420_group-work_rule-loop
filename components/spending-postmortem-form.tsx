"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createSpendingPostmortem } from "@/app/actions/spending-review"

const steps = [
  { number: 1, label: "哪里出错了？", name: "ignoredRisk", value: "将包含敏感信息的文件误提交到公共仓库。" },
  { number: 2, label: "为什么会发生？", name: "lesson", value: "未进行最终检查，且忽略了提交前的安全清单。" },
  { number: 3, label: "影响是什么？", name: "affectedMainline", value: "需要紧急删除记录并轮换密钥，影响团队 2 小时。" },
]

export function SpendingPostmortemForm({ reviewId }: { reviewId: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const data = new FormData(event.currentTarget)
    data.set("regretLevel", "5")
    data.set("writeToAsh", "1")
    startTransition(async () => {
      const result = await createSpendingPostmortem(reviewId, data)
      if (result?.error) return setError(result.error)
      router.push(`/spending-review/${reviewId}`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-[52rem] px-6 pb-10">
      <div className="relative mx-auto max-w-[43rem]">
        <span className="absolute bottom-20 left-7 top-7 w-px bg-border" aria-hidden="true" />
        <div className="flex flex-col gap-8">
          {steps.map((step) => (
            <label key={step.number} className="relative flex items-start gap-6">
              <span className="z-10 flex size-14 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xl font-medium">{step.number}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-3 pt-0.5">
                <span className="text-xl font-medium">{step.label}</span>
                <textarea name={step.name} defaultValue={step.value} rows={3} className="min-h-24 resize-none rounded-lg border border-border bg-card px-5 py-4 text-lg leading-relaxed outline-none transition-shadow focus:ring-2 focus:ring-primary/30" />
              </span>
            </label>
          ))}
        </div>
      </div>

      <section className="mt-10 border-t border-border pt-7" aria-labelledby="rule-title">
        <h2 id="rule-title" className="font-serif text-2xl">关联规则 <span className="font-sans text-lg text-muted-foreground">（草稿）</span></h2>
        <div className="mt-4 flex items-start gap-5 rounded-xl border border-border border-l-[6px] border-l-success bg-card px-6 py-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success text-2xl font-semibold text-success-foreground">✓</span>
          <label className="min-w-0 flex-1">
            <span className="sr-only">关联规则内容</span>
            <textarea name="interceptionRule" defaultValue="提交前执行最终检查清单，确认无敏感信息。" rows={2} className="w-full resize-none bg-transparent text-xl leading-relaxed outline-none" />
            <span className="mt-1 block text-base text-muted-foreground">等待复盘完成后确认</span>
          </label>
        </div>
      </section>

      <input type="hidden" name="principle" value="提交前必须完成安全检查" />
      <input type="hidden" name="actualUsage" value="" />
      {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
      <button type="submit" disabled={isPending} className="mt-5 flex min-h-16 w-full items-center justify-center rounded-xl bg-success px-5 text-2xl font-semibold text-success-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
        {isPending ? "保存中…" : "完成复盘"}
      </button>
    </form>
  )
}
