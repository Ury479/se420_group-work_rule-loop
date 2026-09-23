"use client"

// 复盘任务:三步 stepper(风险信号 → 决策点 → 下次行动)
// 第 3 步 = 最小行动 + 主要阻碍(四组两级选择) + 已有规则实时匹配 + 关联/新建双分支
import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen,
  Brain,
  Building2,
  Check,
  CircleAlert,
  Clock,
  FilePlus2,
  Heart,
  Link2,
  Scale,
  Target,
  Zap,
} from "lucide-react"
import { submitMiniReview } from "@/app/actions/event-library"
import { matchRuleForReview, type RuleMatchResult } from "@/app/actions/rules"
import { ROOT_CAUSES } from "@/lib/event-library-types"
import { cn } from "@/lib/utils"

type Props = {
  eventId: number
  eventTitle?: string
  impactLevel?: string
  eventCreatedAt?: string
}

const STEPS = ["风险信号", "决策点", "下次行动"] as const

// 四组主要阻碍 → 组内具体根因(两级选择,保留既有枚举精度)
const OBSTACLE_GROUPS: Array<{ key: string; label: string; icon: typeof BookOpen; causes: string[] }> = [
  { key: "knowledge", label: "知识", icon: BookOpen, causes: ["no_exit_checklist", "incomplete_confirmation", "over_confidence"] },
  {
    key: "execution",
    label: "执行",
    icon: Zap,
    causes: ["leaving_without_checking", "temporary_placement", "task_switching", "attention_switching", "working_memory_failure", "context_switching"],
  },
  { key: "emotion", label: "情绪", icon: Heart, causes: ["rushing", "time_pressure", "fatigue", "stress"] },
  { key: "environment", label: "环境", icon: Building2, causes: ["environmental_distraction"] },
]

function causeLabel(value: string) {
  return ROOT_CAUSES.find((r) => r.value === value)?.label ?? value
}

export function MiniReviewForm({ eventId, eventTitle, impactLevel, eventCreatedAt }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(0)

  // 第 1 步:风险信号
  const [whatHappened, setWhatHappened] = useState("")
  const [whyNotDiscovered, setWhyNotDiscovered] = useState("")
  // 第 2 步:决策点
  const [prevention, setPrevention] = useState("")
  // 第 3 步:下次行动
  const [minAction, setMinAction] = useState("")
  const [obstacle, setObstacle] = useState<string>("execution")
  const [rootCause, setRootCause] = useState<string>("leaving_without_checking")
  const [match, setMatch] = useState<RuleMatchResult | null>(null)
  const [matchChecked, setMatchChecked] = useState(false)
  const [branch, setBranch] = useState<"link" | "create">("link")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeGroup = OBSTACLE_GROUPS.find((g) => g.key === obstacle) ?? OBSTACLE_GROUPS[1]

  // 最小行动文本变化时,400ms 防抖做已有规则关键词匹配(无 AI)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (minAction.trim().length < 4) {
      setMatch(null)
      setMatchChecked(false)
      return
    }
    const text = `${minAction} ${whatHappened}`.trim()
    debounceRef.current = setTimeout(() => {
      matchRuleForReview(text)
        .then((res) => {
          setMatch(res)
          setMatchChecked(true)
          setBranch(res ? "link" : "create")
        })
        .catch(() => setMatchChecked(true))
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [minAction, whatHappened])

  const stepValid = [whatHappened.trim().length > 0, prevention.trim().length > 0, minAction.trim().length > 0]

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await submitMiniReview({
        eventId,
        whatHappened: whatHappened.trim(),
        whyNotDiscovered: whyNotDiscovered.trim() || null,
        rootCause,
        prevention: prevention.trim() || null,
        systemRule: minAction.trim() || null,
        linkedRuleId: branch === "link" && match ? match.ruleId : null,
        newRuleText: branch === "create" ? minAction.trim() : null,
      })
      if ("error" in result && result.error) {
        setError(String(result.error))
        return
      }
      // 完成后回到事件详情,可看到复盘记录与关联规则
      router.push(`/event-library/${eventId}`)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 三步 stepper */}
      <ol className="flex items-start">
        {STEPS.map((label, i) => {
          const done = i < step
          const active = i === step
          return (
            <li key={label} className="flex min-w-0 flex-1 items-start">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                    done && "border-success bg-success/15 text-success",
                    active && "border-warning bg-warning/15 text-warning",
                    !done && !active && "border-border bg-card text-muted-foreground",
                  )}
                  aria-label={`第 ${i + 1} 步:${label}`}
                >
                  {done ? <Check className="size-5" aria-hidden /> : i + 1}
                </button>
                <span className={cn("text-center text-sm font-medium leading-tight", active && "text-warning", done && "text-success")}>
                  {`${i + 1} ${label}`}
                </span>
                <span className={cn("text-xs", done ? "text-success" : active ? "text-warning" : "text-muted-foreground")}>
                  {done ? "已完成" : active ? "进行中" : "未开始"}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div aria-hidden className={cn("mt-5 h-0.5 w-full shrink basis-10 rounded", i < step ? "bg-success" : "bg-border")} />
              )}
            </li>
          )
        })}
      </ol>

      {/* 来源事件卡 */}
      {eventTitle && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-card p-4 shadow-card",
            impactLevel === "high" && "border-l-2 border-l-destructive/50",
          )}
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-destructive/40 bg-destructive/10 text-destructive">
            <CircleAlert className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {eventTitle}
              {impactLevel === "high" && <span className="ml-2 text-xs font-medium text-destructive">高影响</span>}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {`来源事件: evt-${eventId}`}
              {eventCreatedAt ? ` · ${eventCreatedAt}` : ""}
            </p>
          </div>
        </div>
      )}

      {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {/* 第 1 步:风险信号 */}
      {step === 0 && (
        <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-card">
          <div>
            <label htmlFor="what-happened" className="text-sm font-semibold">
              发生了什么?
            </label>
            <p className="mt-0.5 text-xs text-muted-foreground">只写事实,不写评价。</p>
            <textarea
              id="what-happened"
              value={whatHappened}
              onChange={(e) => setWhatHappened(e.target.value)}
              maxLength={2000}
              rows={4}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="why-not" className="text-sm font-semibold">
              事发前有什么信号?为什么没提前发现?
              <span className="ml-1 font-normal text-muted-foreground">(选填)</span>
            </label>
            <textarea
              id="why-not"
              value={whyNotDiscovered}
              onChange={(e) => setWhyNotDiscovered(e.target.value)}
              maxLength={2000}
              rows={3}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </section>
      )}

      {/* 第 2 步:决策点 */}
      {step === 1 && (
        <section className="rounded-xl border bg-card p-4 shadow-card">
          <label htmlFor="prevention" className="text-sm font-semibold">
            哪个瞬间本可以做出不同决定?
          </label>
          <p className="mt-0.5 text-xs text-muted-foreground">找到那个决策点,写下当时可以怎么做。</p>
          <textarea
            id="prevention"
            value={prevention}
            onChange={(e) => setPrevention(e.target.value)}
            maxLength={2000}
            rows={4}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </section>
      )}

      {/* 第 3 步:下次行动 */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Target className="size-5 text-warning" aria-hidden />
            下次看到同一信号时,最小能做什么?
          </h2>

          <section className="rounded-xl border bg-card p-4 shadow-card">
            <label htmlFor="min-action" className="flex items-center gap-2 text-sm font-semibold text-accent">
              <Brain className="size-4" aria-hidden />
              最小行动
            </label>
            <textarea
              id="min-action"
              value={minAction}
              onChange={(e) => setMinAction(e.target.value)}
              maxLength={120}
              rows={3}
              placeholder="一句话,30 秒内可以完成的动作"
              className="mt-2 w-full rounded-lg border border-accent/40 bg-background px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden />
                30 秒内可以完成
              </span>
              <span>{`${minAction.length}/120`}</span>
            </p>
          </section>

          <section className="rounded-xl border bg-card p-4 shadow-card">
            <p className="text-sm font-semibold">主要阻碍</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {OBSTACLE_GROUPS.map((g) => {
                const GIcon = g.icon
                const selected = obstacle === g.key
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => {
                      setObstacle(g.key)
                      setRootCause(g.causes[0])
                    }}
                    aria-pressed={selected}
                    className={cn(
                      "flex min-h-12 items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-sm transition-colors",
                      selected
                        ? "border-accent bg-accent/15 font-semibold text-accent"
                        : "border-border bg-background text-muted-foreground hover:border-accent/40",
                    )}
                  >
                    <GIcon className="size-4" aria-hidden />
                    {g.label}
                  </button>
                )
              })}
            </div>
            {/* 组内具体根因 */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {activeGroup.causes.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setRootCause(c)}
                  aria-pressed={rootCause === c}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    rootCause === c
                      ? "border-accent bg-accent/15 font-medium text-accent"
                      : "border-border bg-background text-muted-foreground hover:border-accent/40",
                  )}
                >
                  {causeLabel(c)}
                </button>
              ))}
            </div>
          </section>

          {/* 已有规则匹配 */}
          {match && (
            <section className="rounded-xl border border-accent/40 bg-accent/5 p-4 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Scale className="size-4 text-accent" aria-hidden />
                  已有规则匹配
                  <span className="text-base font-bold text-accent">{`${match.matchPercent}%`}</span>
                </p>
                {match.matchPercent >= 60 && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">匹配度高</span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed">{match.ruleText}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {`证据状态: 验证 ${match.validatedCount} 次`}
                {match.validatedCount < 3 ? " · 待观察" : " · 已验证"}
              </p>
            </section>
          )}
          {matchChecked && !match && (
            <p className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
              没有找到相似的已有规则,建议创建新规则。
            </p>
          )}

          {/* 关联 / 新建 双分支 */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setBranch("link")}
              disabled={!match}
              aria-pressed={branch === "link"}
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                branch === "link" && match ? "border-accent bg-accent/15 text-accent" : "border-border bg-card text-muted-foreground",
              )}
            >
              <Link2 className="size-4" aria-hidden />
              关联已有规则
              {branch === "link" && match && <Check className="size-4" aria-hidden />}
            </button>
            <button
              type="button"
              onClick={() => setBranch("create")}
              aria-pressed={branch === "create"}
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
                branch === "create" ? "border-accent bg-accent/15 text-accent" : "border-border bg-card text-muted-foreground",
              )}
            >
              <FilePlus2 className="size-4" aria-hidden />
              创建新规则
            </button>
          </div>
        </div>
      )}

      {/* 底部操作 */}
      <div className="flex flex-col gap-2">
        {step < 2 ? (
          <button
            type="button"
            onClick={() => stepValid[step] && setStep(step + 1)}
            disabled={!stepValid[step]}
            className="hud-cta flex min-h-13 items-center justify-center gap-2 rounded-lg px-5 text-base font-bold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            下一步
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={isPending || !stepValid[2]}
            className="hud-cta flex min-h-13 items-center justify-center gap-2 rounded-lg px-5 text-base font-bold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check className="size-5" aria-hidden />
            {isPending ? "提交中…" : branch === "link" && match ? "完成复盘并关联" : "完成复盘并建规则"}
          </button>
        )}
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="min-h-10 rounded-lg text-sm font-medium text-accent transition-colors hover:bg-accent/10"
          >
            返回上一步
          </button>
        )}
      </div>
    </div>
  )
}
