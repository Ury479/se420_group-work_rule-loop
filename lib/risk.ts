import type { CreateConfirmationInput } from "./validation"
import type { CurrentState, FinalActionType, RiskLevel } from "./types"
import { KEY_PERSON_KEYWORDS } from "./types"

// 不可逆动作:命中即高风险倾向
const IRREVERSIBLE_ACTIONS: FinalActionType[] = [
  "submit",
  "pay",
  "send",
  "depart",
  "confirm",
  "book",
  "delete",
]

const UNSTABLE_STATES: CurrentState[] = [
  "rushed",
  "want_to_finish_fast",
  "overloaded",
  "tired",
  "sleep_deprived",
  "emotional",
]

/**
 * 稳定模式风险升级规则:
 * 1. 状态不稳 → 至少 medium
 * 2. 状态不稳 + 曾出错 → high
 * 3. 不可逆动作 + high → 触发高风险确认流程(由调用方判断)
 */
export function escalateByState(
  base: RiskLevel,
  currentState: CurrentState,
  mistakeHistory: boolean
): RiskLevel {
  if (currentState === "normal") return base
  if (UNSTABLE_STATES.includes(currentState)) {
    if (mistakeHistory) return "high"
    if (base === "low") return "medium"
  }
  return base
}

/** 是否属于不可逆动作 */
export function isIrreversibleAction(action: FinalActionType): boolean {
  return IRREVERSIBLE_ACTIONS.includes(action)
}

/** 人际沟通:对象命中关键人物即高风险 */
export function isKeyPerson(targetPerson?: string | null): boolean {
  if (!targetPerson) return false
  return KEY_PERSON_KEYWORDS.some((k) => targetPerson.includes(k))
}

const HIGH_RISK_KEYWORDS = [
  "成绩",
  "出勤",
  "签证",
  "金钱",
  "钱",
  "老师",
  "导员",
  "合作方",
  "不可退款",
  "不能退款",
  "不可重交",
  "不能重交",
  "不可撤销",
  "自动续费",
  "年付",
]

const STUDY_HIGH_RISK = ["作业", "提交", "考试", "出勤"]
const RELATIONSHIP_HIGH_RISK = ["老师", "导员", "合作方", "解释", "道歉"]
const PURCHASE_HIGH_RISK = ["年付", "自动续费", "不可退款", "不能退款"]

/**
 * 高风险判断逻辑:满足任一条件即建议 high。
 */
export function suggestRiskLevel(input: CreateConfirmationInput): RiskLevel {
  if (input.riskLevel === "high") return "high"

  // 状态不稳 + 曾出错 → 直接 high
  if (
    input.currentState &&
    input.currentState !== "normal" &&
    input.mistakeHistory
  ) {
    return "high"
  }

  // 不可逆动作 → 高风险倾向
  if (
    input.finalActionType &&
    input.finalActionType !== "custom" &&
    isIrreversibleAction(input.finalActionType)
  ) {
    return "high"
  }

  // 人际:关键对象自动高风险
  if (input.domain === "relationship" && isKeyPerson(input.targetPerson)) {
    return "high"
  }

  const textPool = [
    input.title,
    input.costIfFailed ?? "",
    input.likelyMistake ?? "",
    input.scenario ?? "",
    input.notes ?? "",
  ].join(" ")

  // 1. 失败代价包含关键词
  if (HIGH_RISK_KEYWORDS.some((k) => textPool.includes(k))) return "high"

  // 2. 截止时间小于 24 小时
  if (input.deadline) {
    const deadline = new Date(input.deadline).getTime()
    if (!Number.isNaN(deadline)) {
      const hoursLeft = (deadline - Date.now()) / (1000 * 60 * 60)
      if (hoursLeft > 0 && hoursLeft < 24) return "high"
    }
  }

  // 3. 曾经类似出错
  if (input.mistakeHistory) return "high"

  // 4. 需要证据
  if (input.evidenceRequired) return "high"

  // 5-7. 各领域高风险场景
  if (
    input.domain === "purchase" &&
    PURCHASE_HIGH_RISK.some((k) => textPool.includes(k))
  ) {
    return "high"
  }
  if (
    input.domain === "relationship" &&
    RELATIONSHIP_HIGH_RISK.some((k) => textPool.includes(k))
  ) {
    return "high"
  }
  if (
    input.domain === "study" &&
    STUDY_HIGH_RISK.some((k) => textPool.includes(k))
  ) {
    return "high"
  }

  // 兜底:状态不稳至少 medium
  return escalateByState(
    input.riskLevel,
    input.currentState ?? "normal",
    input.mistakeHistory ?? false
  )
}
