"use client"

import { useState } from "react"
import Link from "next/link"
import { runBoundaryCheck } from "@/app/actions/boundaries"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { CircleCheck, TriangleAlert } from "lucide-react"

// 分步检查:一次只回答一个问题,降低压力
type BoolKey =
  | "reachedMinimum"
  | "evidenceCreated"
  | "crowdingOut"
  | "emotionDriven"
  | "infoInsufficient"

const QUESTIONS: { key: BoolKey; text: string; hint?: string }[] = [
  { key: "reachedMinimum", text: "我是否已经达到最低可用标准?" },
  { key: "evidenceCreated", text: "是否已经产生完成证据?", hint: "截图、提交记录、可运行的结果都算" },
  { key: "crowdingOut", text: "我是否正在挤占更重要的任务?" },
  { key: "emotionDriven", text: "我是否因为兴奋、贪多或完美主义在继续做?" },
  { key: "infoInsufficient", text: "当前是否信息不足?" },
]

const DECISION_LABELS: Record<string, string> = {
  continue: "继续推进",
  validate_small: "小步验证",
  pause: "暂停",
  backlog: "放入 Backlog",
  stop: "停止",
}

type Verdict = { recommendation: string; isOverExecution: boolean; reasons: string[] }

export function BoundaryCheckFlow({
  boundaryId,
  timeboxMinutes,
}: {
  boundaryId: number
  timeboxMinutes: number
}) {
  const [step, setStep] = useState(0) // 0 = 时间投入,1..N = 问题,N+1 = 补充,done
  const [timeSpent, setTimeSpent] = useState<string>("")
  const [answers, setAnswers] = useState<Record<BoolKey, boolean | null>>({
    reachedMinimum: null,
    evidenceCreated: null,
    crowdingOut: null,
    emotionDriven: null,
    infoInsufficient: null,
  })
  const [crowdedOut, setCrowdedOut] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)

  const totalSteps = 1 + QUESTIONS.length + 1 // 时间 + 5 问 + 补充

  function answer(key: BoolKey, value: boolean) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
    setStep((s) => s + 1)
  }

  async function submit() {
    if (pending) return
    setError(null)
    setPending(true)
    const result = await runBoundaryCheck({
      boundaryId,
      timeSpentMinutes: Math.max(0, Number(timeSpent) || 0),
      evidenceCreated: answers.evidenceCreated ?? false,
      reachedMinimum: answers.reachedMinimum ?? false,
      crowdingOut: answers.crowdingOut ?? false,
      emotionDriven: answers.emotionDriven ?? false,
      infoInsufficient: answers.infoInsufficient ?? false,
      whatIsBeingCrowdedOut: crowdedOut.trim() || null,
    })
    setPending(false)
    if ("error" in result && result.error) {
      setError(result.error)
      return
    }
    if ("verdict" in result && result.verdict) {
      setVerdict(result.verdict)
    }
  }

  // 结果页
  if (verdict) {
    const isCalm = verdict.recommendation === "continue"
    return (
      <div className="flex flex-col gap-4">
        <div
          className={cn(
            "flex flex-col gap-3 rounded-lg border p-5",
            isCalm ? "bg-card" : "border-destructive/30 bg-destructive/5"
          )}
        >
          <div className="flex items-center gap-2">
            {isCalm ? (
              <CircleCheck className="size-5 text-primary" aria-hidden="true" />
            ) : (
              <TriangleAlert className="size-5 text-destructive" aria-hidden="true" />
            )}
            <p className="text-lg font-semibold">
              推荐动作:{DECISION_LABELS[verdict.recommendation] ?? verdict.recommendation}
            </p>
          </div>
          {verdict.isOverExecution && (
            <p className="text-sm font-medium text-destructive">已构成过度执行,稳定高于一切,先停下来。</p>
          )}
          <ul className="flex flex-col gap-1.5">
            {verdict.reasons.map((r, i) => (
              <li key={i} className="text-sm leading-relaxed text-muted-foreground text-pretty">
                {r}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href={`/boundaries/${boundaryId}`} />}>
            返回边界卡
          </Button>
          {verdict.isOverExecution && (
            <Button nativeButton={false} render={<Link href="/ash-memos/new" />}>
              沉淀为灰烬备忘录
            </Button>
          )}
        </div>
      </div>
    )
  }

  // 进度点
  const progress = (
    <div className="flex items-center gap-2" aria-label="检查进度">
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span
            key={i}
            className={cn("size-2 rounded-full", i < step ? "bg-primary" : i === step ? "bg-primary/40" : "bg-muted")}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {Math.min(step + 1, totalSteps)}/{totalSteps}
      </span>
    </div>
  )

  // 第 0 步:时间投入
  if (step === 0) {
    return (
      <div className="flex flex-col gap-5">
        {progress}
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-5">
          <Label htmlFor="timeSpent" className="text-base">
            这件事到现在一共投入了多少分钟?
          </Label>
          <p className="text-xs text-muted-foreground">时间盒是 {timeboxMinutes} 分钟,估个大概就行。</p>
          <Input
            id="timeSpent"
            type="number"
            inputMode="numeric"
            min={0}
            value={timeSpent}
            onChange={(e) => setTimeSpent(e.target.value)}
            placeholder="例如:45"
            className="max-w-40"
          />
        </div>
        <Button onClick={() => setStep(1)} disabled={timeSpent.trim() === ""} className="self-start">
          下一个
        </Button>
      </div>
    )
  }

  // 中间问题
  const qIndex = step - 1
  if (qIndex < QUESTIONS.length) {
    const q = QUESTIONS[qIndex]
    return (
      <div className="flex flex-col gap-5">
        {progress}
        <div className="flex flex-col gap-2 rounded-lg border bg-card p-5">
          <p className="text-base font-medium leading-relaxed text-pretty">{q.text}</p>
          {q.hint && <p className="text-xs text-muted-foreground">{q.hint}</p>}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => answer(q.key, true)} className="flex-1 sm:flex-none sm:px-10">
            是
          </Button>
          <Button variant="outline" onClick={() => answer(q.key, false)} className="flex-1 sm:flex-none sm:px-10">
            否
          </Button>
        </div>
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            上一个
          </button>
        )}
      </div>
    )
  }

  // 最后一步:被挤占任务(选填)+ 提交
  return (
    <div className="flex flex-col gap-5">
      {progress}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-5">
        <Label htmlFor="crowdedOut" className="text-base">
          如果在挤占任务,被挤占的是什么?(选填)
        </Label>
        <Textarea
          id="crowdedOut"
          rows={2}
          value={crowdedOut}
          onChange={(e) => setCrowdedOut(e.target.value)}
          placeholder="例如:课程复习、P0 数据库迁移"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={submit} disabled={pending}>
          {pending ? "分析中…" : "得出建议"}
        </Button>
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          上一个
        </button>
      </div>
    </div>
  )
}
