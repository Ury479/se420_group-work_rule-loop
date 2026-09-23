"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createHypothesis,
  updateHypothesisStatus,
  createCommunicationPlan,
  deletePerson,
} from "@/app/actions/people-resources"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  NEED_TYPES,
  COMMUNICATION_TYPES,
  COMMUNICATION_CHANNELS,
  INVESTMENT_NATURES,
  BOTTOM_LINE_QUESTIONS,
  contactReadinessMissing,
  needsBottomLineCheck,
} from "@/lib/resource-types"

function Pills({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly { value: string; label: string; danger?: boolean }[]
  value: string | null
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div role="group" aria-label={label} className="scrollbar-none flex gap-1.5 overflow-x-auto py-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              value === o.value && o.danger
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : value === o.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── 诉求假设 ──

export function AddHypothesisForm({ personId }: { personId: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needType, setNeedType] = useState<string | null>(null)
  const [hypothesis, setHypothesis] = useState("")
  const [evidence, setEvidence] = useState("")
  const [validationQuestion, setValidationQuestion] = useState("")

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await createHypothesis({
        personId,
        needType,
        hypothesis: hypothesis.trim(),
        evidence: evidence.trim() || null,
        confidence: "low",
        validationQuestion: validationQuestion.trim() || null,
      })
      if (res && "error" in res && res.error) {
        setError(res.error)
        return
      }
      setHypothesis("")
      setEvidence("")
      setValidationQuestion("")
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="w-fit bg-card">
        添加诉求假设
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">诉求以假设记录,默认低置信度,需在沟通中验证。</p>
      <Pills label="诉求类型" options={NEED_TYPES} value={needType} onChange={setNeedType} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="h-text">
          假设内容 <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="h-text"
          value={hypothesis}
          onChange={(e) => setHypothesis(e.target.value)}
          placeholder="例:对方可能更在意学生是否自己先尝试过"
          className="min-h-16"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="h-evidence">当前证据</Label>
        <Input id="h-evidence" value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="支持这个假设的观察" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="h-question">用什么问题验证</Label>
        <Input
          id="h-question"
          value={validationQuestion}
          onChange={(e) => setValidationQuestion(e.target.value)}
          placeholder="下次沟通时用于验证的问题"
        />
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={isPending || !hypothesis.trim()}>
          {isPending ? "保存中…" : "保存假设"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
          取消
        </Button>
      </div>
    </div>
  )
}

export function HypothesisActions({ id }: { id: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function act(status: "active" | "revised" | "removed", confidence?: "low" | "medium" | "high") {
    startTransition(async () => {
      await updateHypothesisStatus(id, status, confidence)
      router.refresh()
    })
  }

  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        disabled={isPending}
        onClick={() => act("active", "high")}
        className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground disabled:opacity-50"
      >
        已验证
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => act("removed")}
        className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
      >
        推翻
      </button>
    </div>
  )
}

// ── 沟通计划 ──

export function AddPlanForm({ personId }: { personId: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [communicationGoal, setCommunicationGoal] = useState("")
  const [expectedNextAction, setExpectedNextAction] = useState("")
  const [triedAlready, setTriedAlready] = useState("")
  const [communicationType, setCommunicationType] = useState<string | null>(null)
  const [communicationChannel, setCommunicationChannel] = useState<string | null>(null)
  const [coreMessage, setCoreMessage] = useState("")
  const [investmentNature, setInvestmentNature] = useState<string | null>(null)
  const [investmentLimit, setInvestmentLimit] = useState("")
  const [valueToOffer, setValueToOffer] = useState("")

  const missing = contactReadinessMissing({
    triedAlready,
    communicationGoal,
    expectedNextAction,
  })
  const showBottomLine = needsBottomLineCheck(investmentNature)

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await createCommunicationPlan({
        personId,
        communicationGoal: communicationGoal.trim(),
        expectedNextAction: expectedNextAction.trim() || null,
        triedAlready: triedAlready.trim() || null,
        communicationType,
        communicationChannel,
        coreMessage: coreMessage.trim() || null,
        investmentNature,
        investmentLimit: investmentLimit.trim() || null,
        valueToOffer: valueToOffer.trim() || null,
        followUpLimit: 1,
      })
      if (res && "error" in res && res.error) {
        setError(res.error)
        return
      }
      if (res && "plan" in res && res.plan) {
        router.push(`/resources/plans/${res.plan.id}`)
      }
    })
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)} className="w-fit">
        新建沟通计划
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      {/* 调用前检查 */}
      <div
        className={cn(
          "rounded-lg border px-3 py-2.5 text-xs leading-relaxed",
          missing.length > 0
            ? "border-warning/40 bg-warning/10 text-warning-foreground"
            : "border-accent/40 bg-accent/50 text-accent-foreground"
        )}
      >
        {missing.length > 0 ? (
          <>调用前检查未通过,还需明确:{missing.join("、")}。三项不明确,不建议立即联系。</>
        ) : (
          <>调用前检查已通过,可以继续制定计划。</>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cp-goal">
          本次要解决的具体问题 <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="cp-goal"
          value={communicationGoal}
          onChange={(e) => setCommunicationGoal(e.target.value)}
          placeholder="例:确认论文选题方向是否可行"
          className="min-h-16"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cp-tried">我已经尝试了什么</Label>
        <Textarea
          id="cp-tried"
          value={triedAlready}
          onChange={(e) => setTriedAlready(e.target.value)}
          placeholder="例:查阅了 3 篇文献,列出了 2 个备选方向"
          className="min-h-16"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cp-next">希望对方采取的下一步</Label>
        <Input
          id="cp-next"
          value={expectedNextAction}
          onChange={(e) => setExpectedNextAction(e.target.value)}
          placeholder="例:对两个方向给出倾向性意见"
        />
      </div>

      <Pills label="沟通类型" options={COMMUNICATION_TYPES} value={communicationType} onChange={setCommunicationType} />
      <Pills label="沟通方式" options={COMMUNICATION_CHANNELS} value={communicationChannel} onChange={setCommunicationChannel} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cp-core">核心表达(一句话)</Label>
        <Input
          id="cp-core"
          value={coreMessage}
          onChange={(e) => setCoreMessage(e.target.value)}
          placeholder="本次沟通最想传达的一句话"
        />
      </div>

      <Pills label="投入性质" options={INVESTMENT_NATURES} value={investmentNature} onChange={setInvestmentNature} />

      {showBottomLine && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
          <p className="mb-1.5 text-xs font-medium text-destructive">投入性质触发底线检查,先回答:</p>
          <ul className="flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground">
            {BOTTOM_LINE_QUESTIONS.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cp-limit">最大投入上限</Label>
        <Input
          id="cp-limit"
          value={investmentLimit}
          onChange={(e) => setInvestmentLimit(e.target.value)}
          placeholder="例:最多 2 小时;不代写代码"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cp-value">我能提供的价值</Label>
        <Input
          id="cp-value"
          value={valueToOffer}
          onChange={(e) => setValueToOffer(e.target.value)}
          placeholder="例:整理讨论纪要并同步结论"
        />
      </div>

      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={isPending || !communicationGoal.trim()}>
          {isPending ? "保存中…" : "保存计划并查看"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
          取消
        </Button>
      </div>
    </div>
  )
}

export function DeletePersonButton({ personId }: { personId: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function remove() {
    if (!window.confirm("确定删除该联系人及其全部诉求假设?沟通计划记录将保留。")) return
    startTransition(async () => {
      await deletePerson(personId)
      router.push("/resources/people")
    })
  }

  return (
    <Button variant="ghost" size="sm" onClick={remove} disabled={isPending} className="text-muted-foreground hover:text-destructive">
      删除联系人
    </Button>
  )
}
