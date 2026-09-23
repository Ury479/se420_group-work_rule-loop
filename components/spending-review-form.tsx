"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  SPENDING_CATEGORIES,
  CURRENT_STATES,
  FUNDING_SOURCES,
  QUICK_QUESTIONS,
  getTimeRisk,
} from "@/lib/spending-review-types"
import { createSpendingReview, type SpendingReviewInput } from "@/app/actions/spending-review"
import { EquivalenceCards } from "@/components/equivalence-cards"
import type { SpendingAnchor } from "@/lib/db/schema"

function SectionCard({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <section className="shadow-card flex flex-col gap-4 rounded-xl border bg-card p-4 md:p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
        <span className="flex size-5 items-center justify-center rounded-full bg-secondary text-xs text-secondary-foreground">
          {step}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function BoolChip({
  label,
  value,
  onChange,
  danger,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={value}
      onClick={() => onChange(!value)}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        value
          ? danger
            ? "border-destructive/50 bg-destructive/10 text-destructive"
            : "border-foreground bg-foreground text-background"
          : "border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground"
      )}
    >
      {label}
    </button>
  )
}

export function SpendingReviewForm({ anchors = [] }: { anchors?: SpendingAnchor[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // 基础信息
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("other")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState<"CNY" | "USD">("CNY")
  const [isSubscription, setIsSubscription] = useState(false)
  const [billingCycle, setBillingCycle] = useState("")
  const [autoRenew, setAutoRenew] = useState(false)
  const [refundable, setRefundable] = useState<boolean | null>(null)
  const [reversible, setReversible] = useState<boolean | null>(null)

  // 当前状态
  const [states, setStates] = useState<string[]>([])
  const [impulseLevel, setImpulseLevel] = useState(0)
  const [sleepStatus, setSleepStatus] = useState<string>("")

  // 资金来源
  const [fundingSource, setFundingSource] = useState("budget")
  const [budgetRemaining, setBudgetRemaining] = useState("")
  const [usesLivingExpense, setUsesLivingExpense] = useState(false)
  const [usesHealthBudget, setUsesHealthBudget] = useState(false)
  const [usesTuition, setUsesTuition] = useState(false)
  const [usesEmergencyFund, setUsesEmergencyFund] = useState(false)
  const [usesCredit, setUsesCredit] = useState(false)

  // 需求拆解
  const [realNeed, setRealNeed] = useState("")
  const [problemToSolve, setProblemToSolve] = useState("")
  const [consequenceIfNotBuy, setConsequenceIfNotBuy] = useState("")
  const [emotionalRelief, setEmotionalRelief] = useState(false)
  const [taskAvoidance, setTaskAvoidance] = useState(false)
  const [alternatives, setAlternatives] = useState("")

  // 主线核对
  const [currentMainline, setCurrentMainline] = useState("")
  const [affects, setAffects] = useState({
    sleep: false,
    course: false,
    dashboard: false,
    algorithm: false,
    aiCourse: false,
    pmLearning: false,
    training: false,
    budget: false,
  })

  // 工具专项
  const isToolCategory = ["ai_tool", "software", "course"].includes(category)
  const [toolName, setToolName] = useState("")
  const [useCase7d, setUseCase7d] = useState("")
  const [usageCount, setUsageCount] = useState("")
  const [existingTools, setExistingTools] = useState("")
  const [overlapDesc, setOverlapDesc] = useState("")
  const [quotaRemaining, setQuotaRemaining] = useState("")
  const [expectedOutput, setExpectedOutput] = useState("")
  const [canContinue, setCanContinue] = useState<boolean | null>(null)
  const [anxietyDriven, setAnxietyDriven] = useState(false)

  const timeRisk = useMemo(() => getTimeRisk(new Date()), [])
  const amountNum = Number.parseInt(amount, 10) || 0
  // 风险阈值以人民币为基准;美元按近似汇率折算后比较
  const amountCny = currency === "USD" ? Math.round(amountNum * 7.3) : amountNum
  const isL1 = amountCny > 0 && amountCny < 300

  function toggleState(v: string) {
    setStates((prev) => {
      if (v === "normal") return prev.includes("normal") ? [] : ["normal"]
      const next = prev.filter((s) => s !== "normal")
      return next.includes(v) ? next.filter((s) => s !== v) : [...next, v]
    })
  }

  function submit() {
    setError(null)
    if (!title.trim()) {
      setError("请填写支出名称")
      return
    }
    const input: SpendingReviewInput = {
      title: title.trim(),
      category,
      amount: amountNum,
      currency,
      isSubscription,
      billingCycle: billingCycle || null,
      autoRenew,
      refundable,
      reversible,
      currentStates: states,
      impulseLevel,
      sleepStatus: sleepStatus || null,
      fundingSource,
      monthlyBudgetRemaining: budgetRemaining ? Number.parseInt(budgetRemaining, 10) : null,
      usesLivingExpense,
      usesHealthBudget,
      usesTuition,
      usesEmergencyFund,
      usesCredit,
      realNeed: realNeed || null,
      problemToSolve: problemToSolve || null,
      consequenceIfNotBuy: consequenceIfNotBuy || null,
      emotionalRelief,
      taskAvoidance,
      alternatives: alternatives || null,
      currentMainline: currentMainline || null,
      affectsSleep: affects.sleep,
      affectsCourse: affects.course,
      affectsDashboard: affects.dashboard,
      affectsAlgorithm: affects.algorithm,
      affectsAiCourse: affects.aiCourse,
      affectsPmLearning: affects.pmLearning,
      affectsTraining: affects.training,
      affectsBudget: affects.budget,
      toolCheck: isToolCategory
        ? {
            toolName: toolName || null,
            useCaseNext7Days: useCase7d || null,
            expectedUsageCount: usageCount ? Number.parseInt(usageCount, 10) : null,
            existingTools: existingTools || null,
            overlapDescription: overlapDesc || null,
            currentQuotaRemaining: quotaRemaining || null,
            expectedOutput: expectedOutput || null,
            canContinueWithoutPurchase: canContinue,
            anxietyDriven,
          }
        : null,
    }
    startTransition(async () => {
      const res = await createSpendingReview(input)
      if ("error" in res && res.error) {
        setError(res.error)
        return
      }
      if ("review" in res && res.review) {
        router.push(`/spending-review/${res.review.id}`)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {timeRisk.bump > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          <p className="leading-relaxed text-pretty">
            当前处于高风险决策时间窗口({timeRisk.label})。本时段不完成最终付款确认,只允许保存草稿、生成 Markdown
            和进入冷静期。明显疲惫或困倦时,优先睡觉。
          </p>
        </div>
      )}

      <SectionCard step="1" title="基础信息">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sr-title">支出名称 *</Label>
            <Input
              id="sr-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如:某 AI ��具年度会员"
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>支出类别</Label>
            <div className="flex flex-wrap gap-1.5">
              {SPENDING_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={category === c.value}
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    category === c.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground"
                  )}
                >
                  {c.label}
                  {c.strict && <span className="sr-only">(严格审查类别)</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sr-amount">预计金额({currency === "USD" ? "美元" : "元"})</Label>
              <div className="flex items-center gap-1.5">
                <Input
                  id="sr-amount"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="min-w-0 flex-1"
                />
                <div role="group" aria-label="币种" className="flex shrink-0 rounded-lg border border-border">
                  {(["CNY", "USD"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={currency === c}
                      onClick={() => setCurrency(c)}
                      className={cn(
                        "px-2.5 py-2 text-xs font-medium transition-colors first:rounded-l-[7px] last:rounded-r-[7px]",
                        currency === c
                          ? "bg-foreground text-background"
                          : "bg-card text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {c === "CNY" ? "¥" : "$"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sr-cycle">付款周期</Label>
              <Input
                id="sr-cycle"
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value)}
                placeholder="一次性 / 月付 / 年付"
              />
            </div>
          </div>
          {amountCny >= 300 && (
            <p className="text-xs text-destructive">
              单笔达到或超过 300 元{currency === "USD" ? "(按汇率折算)" : ""},将自动进入完整审核与冷静期。
            </p>
          )}
          <EquivalenceCards amountCny={amountCny} anchors={anchors} />
          <div className="flex flex-wrap gap-1.5">
            <BoolChip label="是订阅" value={isSubscription} onChange={setIsSubscription} />
            <BoolChip label="自动续费" value={autoRenew} onChange={setAutoRenew} />
            <BoolChip label="可退款" value={refundable === true} onChange={(v) => setRefundable(v ? true : null)} />
            <BoolChip
              label="不可撤销"
              value={reversible === false}
              onChange={(v) => setReversible(v ? false : null)}
              danger
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard step="2" title="状态识别">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>当前状态(可多选)</Label>
            <div className="flex flex-wrap gap-1.5">
              {CURRENT_STATES.map((s) => (
                <BoolChip
                  key={s.value}
                  label={s.label}
                  value={states.includes(s.value)}
                  onChange={() => toggleState(s.value)}
                  danger={s.negative}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sr-impulse">冲动强度:{impulseLevel} / 10</Label>
            <input
              id="sr-impulse"
              type="range"
              min={0}
              max={10}
              value={impulseLevel}
              onChange={(e) => setImpulseLevel(Number.parseInt(e.target.value, 10))}
              className="w-full accent-foreground"
            />
            <p className="text-xs text-muted-foreground">1–3 轻度,4–6 中度,7–8 高度,9–10 极高</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>睡眠是否充足</Label>
            <div className="flex gap-1.5">
              <BoolChip label="充足" value={sleepStatus === "enough"} onChange={(v) => setSleepStatus(v ? "enough" : "")} />
              <BoolChip
                label="不足"
                value={sleepStatus === "not_enough"}
                onChange={(v) => setSleepStatus(v ? "not_enough" : "")}
                danger
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard step="3" title="资金安全">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>资金来源</Label>
            <div className="flex flex-wrap gap-1.5">
              {FUNDING_SOURCES.map((f) => (
                <BoolChip
                  key={f.value}
                  label={f.label}
                  value={fundingSource === f.value}
                  onChange={() => setFundingSource(f.value)}
                  danger={!f.safe}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sr-budget">本月剩余预算(元,可选)</Label>
            <Input
              id="sr-budget"
              type="number"
              inputMode="numeric"
              value={budgetRemaining}
              onChange={(e) => setBudgetRemaining(e.target.value)}
              placeholder="不确定可留空"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>是否动用以下资金(触发财务底线)</Label>
            <div className="flex flex-wrap gap-1.5">
              <BoolChip label="生活费" value={usesLivingExpense} onChange={setUsesLivingExpense} danger />
              <BoolChip label="健康预算" value={usesHealthBudget} onChange={setUsesHealthBudget} danger />
              <BoolChip label="学费" value={usesTuition} onChange={setUsesTuition} danger />
              <BoolChip label="应急资金" value={usesEmergencyFund} onChange={setUsesEmergencyFund} danger />
              <BoolChip label="借款/信用额度" value={usesCredit} onChange={setUsesCredit} danger />
            </div>
            {(usesLivingExpense || usesHealthBudget || usesTuition || usesEmergencyFund || usesCredit) && (
              <p className="text-xs text-destructive">
                已触发财务底线:该支出不进入正常付款流程,系统将建议取消。
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard step="4" title="真实需求拆解">
        <div className="flex flex-col gap-3">
          {isL1 && (
            <div className="flex flex-col gap-1 rounded-lg bg-accent/60 p-3 text-xs text-accent-foreground">
              <p className="font-medium">快速三问</p>
              {QUICK_QUESTIONS.map((q, i) => (
                <p key={q}>
                  {i + 1}. {q}
                </p>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sr-need">我真正想得到什么</Label>
            <Textarea id="sr-need" value={realNeed} onChange={(e) => setRealNeed(e.target.value)} rows={2} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sr-problem">这个支出解决的具体问题</Label>
            <Textarea
              id="sr-problem"
              value={problemToSolve}
              onChange={(e) => setProblemToSolve(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sr-consequence">如果不购买会发生什么</Label>
            <Textarea
              id="sr-consequence"
              value={consequenceIfNotBuy}
              onChange={(e) => setConsequenceIfNotBuy(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <BoolChip label="属于情绪缓解" value={emotionalRelief} onChange={setEmotionalRelief} danger />
            <BoolChip label="属于逃避任务" value={taskAvoidance} onChange={setTaskAvoidance} danger />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sr-alt">更低成本方案 / 已有同类资源</Label>
            <Textarea id="sr-alt" value={alternatives} onChange={(e) => setAlternatives(e.target.value)} rows={2} />
          </div>
        </div>
      </SectionCard>

      <SectionCard step="5" title="主线核对">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sr-mainline">当前最紧急硬任务</Label>
            <Input
              id="sr-mainline"
              value={currentMainline}
              onChange={(e) => setCurrentMainline(e.target.value)}
              placeholder="例如:完成算法课作业"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>这笔支出是否影响以下主线</Label>
            <div className="flex flex-wrap gap-1.5">
              <BoolChip label="睡眠" value={affects.sleep} onChange={(v) => setAffects((a) => ({ ...a, sleep: v }))} danger />
              <BoolChip label="课程出勤" value={affects.course} onChange={(v) => setAffects((a) => ({ ...a, course: v }))} danger />
              <BoolChip label="仪表盘开发" value={affects.dashboard} onChange={(v) => setAffects((a) => ({ ...a, dashboard: v }))} danger />
              <BoolChip label="算法学习" value={affects.algorithm} onChange={(v) => setAffects((a) => ({ ...a, algorithm: v }))} danger />
              <BoolChip label="AI 课程" value={affects.aiCourse} onChange={(v) => setAffects((a) => ({ ...a, aiCourse: v }))} danger />
              <BoolChip label="产品经理学习" value={affects.pmLearning} onChange={(v) => setAffects((a) => ({ ...a, pmLearning: v }))} danger />
              <BoolChip label="训练" value={affects.training} onChange={(v) => setAffects((a) => ({ ...a, training: v }))} danger />
              <BoolChip label="本周预算" value={affects.budget} onChange={(v) => setAffects((a) => ({ ...a, budget: v }))} danger />
            </div>
          </div>
        </div>
      </SectionCard>

      {isToolCategory && (
        <SectionCard step="6" title="工具与订阅专项审查">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tool-name">工具名称</Label>
              <Input id="tool-name" value={toolName} onChange={(e) => setToolName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tool-usecase">未来七天用于什么任务 *</Label>
              <Textarea
                id="tool-usecase"
                value={useCase7d}
                onChange={(e) => setUseCase7d(e.target.value)}
                rows={2}
                placeholder="必须证明未来七天内会实际使用"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tool-count">预计使用次数</Label>
                <Input
                  id="tool-count"
                  type="number"
                  inputMode="numeric"
                  value={usageCount}
                  onChange={(e) => setUsageCount(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tool-quota">现有额度是否用完</Label>
                <Input
                  id="tool-quota"
                  value={quotaRemaining}
                  onChange={(e) => setQuotaRemaining(e.target.value)}
                  placeholder="例如:还剩 40%"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tool-existing">现有工具有哪些</Label>
              <Textarea id="tool-existing" value={existingTools} onChange={(e) => setExistingTools(e.target.value)} rows={2} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tool-overlap">功能是否重叠</Label>
              <Textarea id="tool-overlap" value={overlapDesc} onChange={(e) => setOverlapDesc(e.target.value)} rows={2} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tool-output">购买后留下什么成果</Label>
              <Textarea id="tool-output" value={expectedOutput} onChange={(e) => setExpectedOutput(e.target.value)} rows={2} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <BoolChip
                label="不买仍能继续任务"
                value={canContinue === true}
                onChange={(v) => setCanContinue(v ? true : null)}
              />
              <BoolChip label="只是因为焦虑购买" value={anxietyDriven} onChange={setAnxietyDriven} danger />
            </div>
          </div>
        </SectionCard>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button onClick={submit} disabled={isPending} className="flex-1">
          {isPending ? "计算风险中..." : "提交并计算风险等级"}
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        提交后系统将自动计算风险等级、触发规则与冷静期,不会自动付款。
      </p>
    </div>
  )
}
