export const RULE_STATUSES = ["draft", "active", "paused", "archived"] as const
export const SESSION_STATUSES = ["matched", "decided", "awaiting_validation", "validated", "expired"] as const

export type RuleStatus = (typeof RULE_STATUSES)[number]
export type SessionStatus = (typeof SESSION_STATUSES)[number]
export type RuleChoice = "proceed" | "adjust" | "postpone" | "cancel"

export type MatchableRule = {
  id: number
  ruleText: string
  triggerText: string | null
  recommendedAction: string | null
  status: string
  severity: string
  domain: string
  scenario: string | null
  triggerCondition: string | null
  likelyMistakeKeywords: string | null
  currentVersion: number
  validatedCount: number
  helpfulCount: number
  rulePriority: number
}

const transitions: Record<RuleStatus, readonly RuleStatus[]> = {
  draft: ["active", "archived"], active: ["paused", "archived"],
  paused: ["active", "archived"], archived: [],
}

const sessionTransitions: Record<SessionStatus, readonly SessionStatus[]> = {
  matched: ["decided", "expired"], decided: ["awaiting_validation", "expired"],
  awaiting_validation: ["validated", "expired"], validated: [], expired: [],
}

export function canTransitionRule(from: RuleStatus, to: RuleStatus) {
  return transitions[from].includes(to)
}

export function canTransitionSession(from: SessionStatus, to: SessionStatus) {
  return sessionTransitions[from].includes(to)
}

export function selectMatchingRules(rules: MatchableRule[], input: { sceneType: string; summary: string }) {
  const normalized = `${input.sceneType} ${input.summary}`.toLowerCase()
  const severity = { high: 3, medium: 2, low: 1 } as const
  return rules.filter((rule) => {
    if (rule.status !== "active") return false
    const terms = [rule.domain, rule.scenario, rule.triggerCondition, rule.likelyMistakeKeywords]
      .filter((value): value is string => Boolean(value)).flatMap((value) => value.toLowerCase().split(/[,，\s]+/)).filter(Boolean)
    return rule.domain === input.sceneType || terms.some((term) => normalized.includes(term))
  }).sort((a, b) => {
    const severityDelta = (severity[b.severity as keyof typeof severity] ?? 0) - (severity[a.severity as keyof typeof severity] ?? 0)
    if (severityDelta) return severityDelta
    const aHelpful = a.validatedCount ? a.helpfulCount / a.validatedCount : 0
    const bHelpful = b.validatedCount ? b.helpfulCount / b.validatedCount : 0
    return bHelpful - aHelpful || b.rulePriority - a.rulePriority
  }).slice(0, 3)
}

export function parseIdSnapshot(value: string): number[] {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) && parsed.every(Number.isInteger) ? parsed : []
  } catch { return [] }
}
