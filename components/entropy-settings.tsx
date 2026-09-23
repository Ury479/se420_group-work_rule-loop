"use client"

import { useState, useTransition } from "react"
import { saveBirthDate, saveModelTreeUrl } from "@/app/actions/lifespan"

// 设置页:熵减系统配置(生日 + 模型树 URL)
export function EntropySettings({
  initialBirthDate,
  initialModelTreeUrl,
}: {
  initialBirthDate: string | null
  initialModelTreeUrl: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [birthDate, setBirthDate] = useState(initialBirthDate ?? "")
  const [modelTreeUrl, setModelTreeUrl] = useState(initialModelTreeUrl ?? "https://www.moxingshu.cn/article")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <section aria-labelledby="entropy-settings-title" className="rounded-lg border border-border bg-card p-5 shadow-card">
      <h2 id="entropy-settings-title" className="font-serif text-lg">
        熵减系统
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        寿命倒计时与夜间供给渠道的基础配置。
      </p>
      <form
        className="mt-4 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          setMessage(null)
          setError(null)
          startTransition(async () => {
            if (birthDate) {
              const res = await saveBirthDate(birthDate)
              if (!res.ok) {
                setError(res.error ?? "生日保存失败")
                return
              }
            }
            const res2 = await saveModelTreeUrl(modelTreeUrl)
            if (!res2.ok) {
              setError(res2.error ?? "链接保存失败")
              return
            }
            setMessage("已保存")
          })
        }}
      >
        <div>
          <label htmlFor="entropy-birth" className="text-sm font-medium">
            出生日期(寿命倒计时基准)
          </label>
          <input
            id="entropy-birth"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label htmlFor="entropy-model-tree" className="text-sm font-medium">
            模型树链接(夜间供给渠道)
          </label>
          <input
            id="entropy-model-tree"
            type="url"
            placeholder="https://…"
            value={modelTreeUrl}
            onChange={(e) => setModelTreeUrl(e.target.value)}
            className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "保存中…" : "保存配置"}
        </button>
        {message ? (
          <p role="status" className="text-sm text-primary">
            {message}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </form>
    </section>
  )
}
