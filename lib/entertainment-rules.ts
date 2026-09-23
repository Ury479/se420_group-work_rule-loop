export const ENTERTAINMENT_TYPES = [
  ["gaming", "游戏"],
  ["video", "影视 / 短视频"],
  ["social", "社交娱乐"],
  ["dining", "餐饮娱乐"],
  ["reading", "休闲阅读"],
  ["other", "其他"],
] as const

export const SESSION_STATUSES = ["active", "ended", "assessed", "reviewed", "abandoned"] as const
export type SessionStatus = (typeof SESSION_STATUSES)[number]
export type EntertainmentResultLevel = "healthy" | "mixed" | "harmful"

export const ALLOWED_SESSION_TRANSITIONS: Record<SessionStatus, readonly SessionStatus[]> = {
  active: ["ended", "abandoned"],
  ended: ["assessed"],
  assessed: ["reviewed"],
  reviewed: [],
  abandoned: [],
}

export function canTransitionSession(from: SessionStatus, to: SessionStatus) {
  return ALLOWED_SESSION_TRANSITIONS[from].includes(to)
}

export type AssessmentRuleInput = {
  plannedMinutes: number
  plannedBudgetCny: number
  actualMinutes: number
  actualCostCny: number
  recoveredEnergy: number
  emotionAfter: number
  didStopOnTime: boolean
  didStayInBudget: boolean
  delayedMainline: boolean
  regretLevel: number
}

export type AssessmentRuleResult = {
  score: number
  resultLevel: EntertainmentResultLevel
  flags: string[]
  nextStep: string
}

export function evaluateEntertainment(input: AssessmentRuleInput): AssessmentRuleResult {
  let score = 50
  const flags: string[] = []

  score += input.recoveredEnergy * 3
  score += Math.max(0, input.emotionAfter - 5) * 2
  score -= input.regretLevel * 3

  if (input.didStopOnTime) score += 8
  else {
    score -= 15
    flags.push("超出计划时长")
  }

  if (input.didStayInBudget) score += 6
  else {
    score -= 12
    flags.push("超出预算边界")
  }

  if (input.delayedMainline) {
    score -= 20
    flags.push("影响主线任务")
  }

  if (input.actualMinutes > input.plannedMinutes * 1.5) {
    score -= 8
    if (!flags.includes("超出计划时长")) flags.push("时长明显超限")
  }

  if (input.actualCostCny > input.plannedBudgetCny && input.plannedBudgetCny > 0) {
    score -= 5
  }

  score = Math.max(0, Math.min(100, Math.round(score)))
  const resultLevel: EntertainmentResultLevel = score >= 70 ? "healthy" : score >= 45 ? "mixed" : "harmful"

  const nextStep =
    resultLevel === "healthy"
      ? "保留这次边界设置，下次继续按同样方式开始。"
      : resultLevel === "mixed"
        ? "先完成一个 10 分钟主线恢复动作，再决定是否继续娱乐。"
        : "停止追加投入，完成复盘并至少冷静到明天再开始新会话。"

  return { score, resultLevel, flags, nextStep }
}

export const RESULT_META: Record<EntertainmentResultLevel, { label: string; description: string }> = {
  healthy: { label: "有效恢复", description: "娱乐带来了恢复，且主要边界被守住。" },
  mixed: { label: "部分有效", description: "有一定收益，但已经出现边界或主线代价。" },
  harmful: { label: "净消耗", description: "代价大于恢复，需要停止追加并复盘。" },
}
