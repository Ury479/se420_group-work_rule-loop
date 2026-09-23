export type RelationshipSignalInput = { id: number; signalKind: string; direction: string; strength: number; verificationStatus: string }

export const STAGES = ["initial_contact", "getting_to_know", "stable_contact", "mutual_trust", "boundary_review"] as const
export type RelationshipStage = (typeof STAGES)[number]
export type PlanStatus = "draft" | "ready" | "sent" | "cancelled" | "expired" | "reviewed"

export function suggestRelationshipStage(signals: RelationshipSignalInput[]) {
  const facts = signals.filter((s) => s.signalKind === "fact" && s.verificationStatus === "verified")
  const positive = facts.filter((s) => s.direction === "positive").reduce((n, s) => n + s.strength, 0)
  const risks = facts.filter((s) => s.direction === "risk" || s.direction === "boundary").reduce((n, s) => n + s.strength, 0)
  const supportingSignalIds = facts.filter((s) => s.direction === "positive").map((s) => s.id)
  const counterSignalIds = facts.filter((s) => s.direction === "risk" || s.direction === "boundary").map((s) => s.id)
  if (!facts.length) return { suggestedStage: "initial_contact" as RelationshipStage, confidence: 0, rationale: "已验证事实不足，暂不做进阶判断。", supportingSignalIds, counterSignalIds }
  const confidence = Math.min(90, 25 + facts.length * 8 + Math.min(25, Math.abs(positive - risks) * 2))
  if (risks >= 7) return { suggestedStage: "boundary_review" as RelationshipStage, confidence, rationale: "已验证的风险或边界信号较强，建议先检查边界。", supportingSignalIds, counterSignalIds }
  if (positive >= 15 && facts.length >= 4) return { suggestedStage: "mutual_trust" as RelationshipStage, confidence, rationale: "存在多项持续、已验证的正向事实，但仍需用户确认。", supportingSignalIds, counterSignalIds }
  if (positive >= 8 && facts.length >= 3) return { suggestedStage: "stable_contact" as RelationshipStage, confidence, rationale: "正向事实已形成一定稳定性。", supportingSignalIds, counterSignalIds }
  if (positive >= 3) return { suggestedStage: "getting_to_know" as RelationshipStage, confidence, rationale: "存在初步正向事实，适合继续低风险了解。", supportingSignalIds, counterSignalIds }
  return { suggestedStage: "initial_contact" as RelationshipStage, confidence, rationale: "事实信号仍少或方向不明确，保持初步观察。", supportingSignalIds, counterSignalIds }
}

export function assessCommunicationRisk(input: { intensity?: number; actionReadiness?: string; signals: RelationshipSignalInput[] }) {
  const strongRisk = input.signals.some((s) => s.signalKind === "fact" && (s.direction === "risk" || s.direction === "boundary") && s.strength >= 4 && s.verificationStatus === "verified")
  if ((input.intensity ?? 0) >= 8 || input.actionReadiness === "not_ready" || strongRisk) return { riskLevel: "high" as const, blocked: true, reason: "当前情绪或边界风险较高，先暂停或降低沟通强度。" }
  if ((input.intensity ?? 0) >= 6 || input.actionReadiness === "cautious") return { riskLevel: "medium" as const, blocked: false, reason: "建议使用最小请求，并在发送前复核边界。" }
  return { riskLevel: "low" as const, blocked: false, reason: "当前未发现强阻断条件，仍需按计划沟通。" }
}

const transitions: Record<PlanStatus, PlanStatus[]> = { draft: ["ready", "cancelled", "expired"], ready: ["sent", "cancelled", "expired"], sent: ["reviewed"], cancelled: [], expired: [], reviewed: [] }
export function canTransitionPlan(from: PlanStatus, to: PlanStatus) { return transitions[from].includes(to) }

export function assessRelationshipResource(input: { credibility: number; manipulationRisk: number; stigmaRisk: number; absolutismRisk: number }) {
  const maxRisk = Math.max(input.manipulationRisk, input.stigmaRisk, input.absolutismRisk)
  if (input.credibility <= 3 || maxRisk >= 8) return "rejected" as const
  if (input.credibility <= 6 || maxRisk >= 5) return "caution" as const
  return "healthy" as const
}
