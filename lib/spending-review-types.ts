// 决策拦截台统一枚举配置与风险计算引擎。
// 规则驱动、纯程序化执行,不调用任何 AI。

export const SPENDING_CATEGORIES = [
  { value: "entertainment", label: "娱乐", strict: true },
  { value: "emotional", label: "情感消费", strict: true },
  { value: "intimacy", label: "亲密相关", strict: true },
  { value: "ai_tool", label: "AI 工具", strict: true },
  { value: "software", label: "软件", strict: true },
  { value: "course", label: "课程学习", strict: true },
  { value: "dining", label: "高消费餐饮", strict: true },
  { value: "travel", label: "旅行", strict: true },
  { value: "shopping", label: "购物", strict: true },
  { value: "subscription", label: "新增订阅", strict: true },
  { value: "necessity", label: "必要开支", strict: false },
  { value: "other", label: "其他", strict: false },
] as const

export const CURRENT_STATES = [
  { value: "normal", label: "状态正常", negative: false },
  { value: "tired", label: "疲惫", negative: true },
  { value: "sleep_deprived", label: "睡眠不足", negative: true },
  { value: "lonely", label: "孤独", negative: true },
  { value: "anxious", label: "焦虑", negative: true },
  { value: "confused", label: "迷茫", negative: true },
  { value: "emotionally_unstable", label: "情绪波动", negative: true },
  { value: "strong_impulse", label: "强烈冲动", negative: true },
  { value: "want_fast_result", label: "想快速获得结果", negative: true },
  { value: "fear_of_missing_out", label: "害怕错过", negative: true },
  { value: "want_to_escape_task", label: "想逃避任务", negative: true },
  { value: "overloaded", label: "任务过多", negative: true },
] as const

export const FUNDING_SOURCES = [
  { value: "budget", label: "预算内可支配资金", safe: true },
  { value: "living_expense", label: "生活费", safe: false },
  { value: "health_budget", label: "健康预算", safe: false },
  { value: "tuition", label: "学费", safe: false },
  { value: "emergency_fund", label: "应急资金", safe: false },
  { value: "credit", label: "借款或信用额度", safe: false },
  { value: "other_person", label: "他人提供资金", safe: true },
  { value: "unknown", label: "未知", safe: false },
] as const

export const DECISION_STATUSES = [
  { value: "draft", label: "草稿" },
  { value: "cooling", label: "冷静期" },
  { value: "awaiting_gpt", label: "待 GPT 审核" },
  { value: "awaiting_final", label: "待人工确认" },
  { value: "cancelled", label: "已取消" },
  { value: "delayed", label: "已延迟" },
  { value: "reduced", label: "已缩减替代" },
  { value: "confirmed", label: "已确认" },
  { value: "paid", label: "已付款" },
] as const

export const RISK_LEVELS = [
  { value: "low", label: "低风险" },
  { value: "medium", label: "中风险" },
  { value: "high", label: "高风险" },
  { value: "critical", label: "极高风险" },
] as const

export const SYSTEM_RECOMMENDATIONS = [
  { value: "record_only", label: "正常记录" },
  { value: "cancel", label: "建议取消" },
  { value: "delay", label: "建议延迟" },
  { value: "reduce_or_replace", label: "建议缩减或替代" },
  { value: "manual_confirmation", label: "进入最终人工确认" },
] as const

export const GPT_CONCLUSIONS = [
  { value: "cancel", label: "建议取消" },
  { value: "delay", label: "建议延迟" },
  { value: "reduce_or_replace", label: "建议缩减或替代" },
  { value: "manual_confirmation", label: "进入最终人工确认" },
] as const

export const FINAL_DECISIONS = [
  { value: "cancel", label: "取消" },
  { value: "delay", label: "延迟" },
  { value: "reduce_or_replace", label: "缩减或替代" },
  { value: "confirm_pay", label: "确认付款" },
] as const

export const MAINLINE_TYPES = [
  { value: "dashboard", label: "个人仪表盘开发" },
  { value: "algorithm", label: "算法学习" },
  { value: "ai_course", label: "AI 课程" },
  { value: "pm_learning", label: "产品经理学习" },
  { value: "body_recovery", label: "身体恢复" },
] as const

// 程序化状态回归策略:状态 → 推荐最小动作
export const RECOVERY_SUGGESTIONS: Record<
  string,
  { mainlineType: string; actionTitle: string; actionDescription: string }
> = {
  dashboard: {
    mainlineType: "dashboard",
    actionTitle: "写下今天最影响主线的一个问题,并整理成一句功能目标",
    actionDescription: "一条明确的问题描述 + 一句功能目标,即为最小完成证据。",
  },
  algorithm: {
    mainlineType: "algorithm",
    actionTitle: "学习一个算法知识点,并开始一道算法题",
    actionDescription: "低能量模式:写出一个知识点的核心理解;正常模式:完成一道题或形成完整解题思路。",
  },
  ai_course: {
    mainlineType: "ai_course",
    actionTitle: "看完一个完整小节,并记录一个能用于当前项目的知识点",
    actionDescription: "一条课程笔记 + 一个可应用场景。",
  },
  pm_learning: {
    mainlineType: "pm_learning",
    actionTitle: "观看一集教程,记录一个产品判断",
    actionDescription: "一个产品判断或一条需求分析原则即可。知识库导入不属于最低启动门槛。",
  },
  body_recovery: {
    mainlineType: "body_recovery",
    actionTitle: "咏春基础练习、补水、洗漱,或直接准备睡觉",
    actionDescription: "明显困倦时:停止学习和开发,不喝咖啡,直接准备睡觉。",
  },
}

// ── 标签辅助函数 ──

function labelOf(list: readonly { value: string; label: string }[], value: string | null | undefined) {
  return list.find((i) => i.value === value)?.label ?? value ?? "—"
}

export const categoryLabel = (v: string | null | undefined) => labelOf(SPENDING_CATEGORIES, v)
export const stateLabel = (v: string | null | undefined) => labelOf(CURRENT_STATES, v)
export const fundingSourceLabel = (v: string | null | undefined) => labelOf(FUNDING_SOURCES, v)
export const decisionStatusLabel = (v: string | null | undefined) => labelOf(DECISION_STATUSES, v)
export const riskLevelLabel = (v: string | null | undefined) => labelOf(RISK_LEVELS, v)
export const recommendationLabel = (v: string | null | undefined) => labelOf(SYSTEM_RECOMMENDATIONS, v)
export const gptConclusionLabel = (v: string | null | undefined) => labelOf(GPT_CONCLUSIONS, v)
export const finalDecisionLabel = (v: string | null | undefined) => labelOf(FINAL_DECISIONS, v)
export const mainlineLabel = (v: string | null | undefined) => labelOf(MAINLINE_TYPES, v)

export function statesLabels(csv: string | null | undefined): string[] {
  if (!csv) return []
  return csv
    .split(",")
    .filter(Boolean)
    .map((s) => stateLabel(s.trim()))
}

// 触发规则中文说明
export const TRIGGER_LABELS: Record<string, string> = {
  amount_ge_1000: "金额达到或超过 1000 元",
  amount_ge_300: "金额达到或超过 300 元",
  amount_ge_100: "金额达到或超过 100 元",
  strict_category: "属于严格审查类别",
  negative_state: "当前存在负面状态",
  night_risk_window: "处于 20:00–24:00 风险窗口",
  late_night_risk_window: "处于 00:00–04:00 高危窗口",
  financial_safety_violation: "动用财务安全资金(底线)",
  mainline_impact: "影响硬任务或主线",
  high_impulse: "冲动强度达到 7 以上",
  subscription: "新增订阅",
  irreversible: "付款不可撤销",
}

export const triggerLabel = (t: string) => TRIGGER_LABELS[t] ?? t

// ── 时间窗口判断 ──

export type TimeRisk = { level: "normal" | "elevated" | "severe"; label: string; bump: number }

export function getTimeRisk(date: Date): TimeRisk {
  const h = date.getHours()
  if (h >= 20) return { level: "elevated", label: "20:00–24:00 风险提升一级", bump: 1 }
  if (h < 4) return { level: "severe", label: "00:00–04:00 风险提升两级", bump: 2 }
  return { level: "normal", label: "正常判断时段", bump: 0 }
}

export const isNightWindow = (date: Date) => getTimeRisk(date).bump > 0

// ── 风险计算引擎(需求文档第二十一节) ──

export interface RiskInput {
  amount: number
  category: string
  currentStates: string[]
  impulseLevel: number
  isSubscription: boolean
  reversible: boolean | null
  decisionTime: Date
  usesLivingExpense: boolean
  usesHealthBudget: boolean
  usesTuition: boolean
  usesEmergencyFund: boolean
  usesCredit: boolean
  affectsSleep: boolean
  affectsCourse: boolean
  affectsDashboard: boolean
  affectsAlgorithm: boolean
  affectsAiCourse: boolean
  affectsPmLearning: boolean
}

export interface RiskResult {
  riskLevel: "low" | "medium" | "high" | "critical"
  score: number
  triggers: string[]
  timeRisk: TimeRisk
  financialViolation: boolean
  recommendation: string
  coolingHours: number
  forceDelay: boolean
}

const NEGATIVE_STATES: string[] = CURRENT_STATES.filter((s) => s.negative).map((s) => s.value)
const STRICT_CATEGORIES: string[] = SPENDING_CATEGORIES.filter((c) => c.strict).map((c) => c.value)

export function calculateDecisionRisk(input: RiskInput): RiskResult {
  let score = 0
  const triggers: string[] = []

  // 金额风险
  if (input.amount >= 1000) {
    score += 4
    triggers.push("amount_ge_1000")
  } else if (input.amount >= 300) {
    score += 3
    triggers.push("amount_ge_300")
  } else if (input.amount >= 100) {
    score += 1
    triggers.push("amount_ge_100")
  }

  // 类别风险
  if (STRICT_CATEGORIES.includes(input.category)) {
    score += 2
    triggers.push("strict_category")
  }

  // 状态风险
  const hasNegativeState = input.currentStates.some((s) => NEGATIVE_STATES.includes(s))
  if (hasNegativeState) {
    score += 3
    triggers.push("negative_state")
  }

  // 冲动强度
  if (input.impulseLevel >= 7) {
    score += 2
    triggers.push("high_impulse")
  }

  // 时间窗口风险
  const timeRisk = getTimeRisk(input.decisionTime)
  if (timeRisk.level === "elevated") {
    score += 2
    triggers.push("night_risk_window")
  } else if (timeRisk.level === "severe") {
    score += 4
    triggers.push("late_night_risk_window")
  }

  // 资金来源风险(财务底线)
  const financialViolation =
    input.usesLivingExpense ||
    input.usesHealthBudget ||
    input.usesTuition ||
    input.usesEmergencyFund ||
    input.usesCredit
  if (financialViolation) {
    score += 5
    triggers.push("financial_safety_violation")
  }

  // 主线影响风险
  if (
    input.affectsSleep ||
    input.affectsCourse ||
    input.affectsDashboard ||
    input.affectsAlgorithm ||
    input.affectsAiCourse ||
    input.affectsPmLearning
  ) {
    score += 2
    triggers.push("mainline_impact")
  }

  // 订阅与不可逆
  if (input.isSubscription) {
    score += 1
    triggers.push("subscription")
  }
  if (input.reversible === false) {
    score += 1
    triggers.push("irreversible")
  }

  const riskLevel = score >= 10 ? "critical" : score >= 7 ? "high" : score >= 4 ? "medium" : "low"

  // L3 强制延期判定
  const forceDelay =
    financialViolation ||
    (timeRisk.bump > 0 && hasNegativeState) ||
    input.amount >= 1000 ||
    (input.reversible === false && riskLevel !== "low") ||
    (["emotional", "intimacy"].includes(input.category) && input.amount >= 300)

  // 冷静期(需求文档第十五节)
  let coolingHours = 0
  if (input.amount >= 1000) coolingHours = 72
  else if (input.amount >= 300) coolingHours = 24
  else if (input.amount >= 100 && riskLevel !== "low") coolingHours = 0.5
  if (input.isSubscription) coolingHours = Math.max(coolingHours, 24)
  if (["emotional", "intimacy"].includes(input.category) && riskLevel !== "low")
    coolingHours = Math.max(coolingHours, 24)
  if (timeRisk.bump > 0 && hasNegativeState) coolingHours = Math.max(coolingHours, 12) // 延迟到第二天

  // 系统建议
  let recommendation = "record_only"
  if (financialViolation) recommendation = "cancel"
  else if (forceDelay || riskLevel === "critical") recommendation = "delay"
  else if (riskLevel === "high") recommendation = "reduce_or_replace"
  else if (riskLevel === "medium") recommendation = "manual_confirmation"

  return { riskLevel, score, triggers, timeRisk, financialViolation, recommendation, coolingHours, forceDelay }
}

// 快速三问(L1)
export const QUICK_QUESTIONS = [
  "我真正需要的是什么?",
  "不买会发生什么真实损失?",
  "明天清醒后我还会买吗?",
] as const

// 最佳状态决策协议默认内容
export const DEFAULT_BASELINE = {
  title: "最佳状态决策协议",
  coreAbilities:
    "心流反应和思辨能力强;能够将不同线索串联起来;能够识别因果关系、风险和机会成本;能够使用大模型开拓认知;面对困难具备抗压和执行能力;能够迎难而上;优先使用 AI 工具拆解问题,再采取行动;不依赖情绪作出不可逆决策。",
  financialRules:
    "不因焦虑、迷茫、困顿和情感需求突破财务底线;不动用生活费、健康预算、学费、应急资金;不使用借款、透支或信用额度进行冲动消费;单笔达到或超过 300 元的非必要支出必须进入完整审核;保留现金和未来选择权。",
  healthRules: "优先保证情感健康和人身安全;拒绝熬夜;晚上不喝咖啡;明显疲惫或困倦时,优先睡觉。",
  mainlineRules:
    "课程和长期主线优先于娱乐;先形成可验证结果,再增加投入;忽略课程和项目时,回到当前最紧急硬任务;任务太大想逃避时,拆成一个最小动作。",
  sleepRules: "拒绝熬夜;20:00 后不做复杂消费和新增订阅;凌晨只保存草稿和明日入口;想熬夜继续开发时,停止高刺激任务并准备睡觉。",
  toolPurchaseRules:
    "先使用已有工具,再购买新工具;购买 AI 工具前先检查七天任务和已有工具;必须证明未来七天内会实际使用;不允许通过投资自己包装新的冲动消费。",
  decisionProcess: "先分析,再拆解,再行动;先拆解真实需求;害怕错过的,第二天仍需要再决定;想靠购买获得突破的,先完成一个最小结果。",
}

// 当前状态 → 最佳状态对照表(需求文档 9.3)
export const BASELINE_CONTRAST = [
  { current: "想立即付款", baseline: "先拆解真实需求" },
  { current: "因焦虑购买工具", baseline: "先验证现有工具缺口" },
  { current: "因孤独产生高额支出", baseline: "先保护财务与情感安全" },
  { current: "害怕错过", baseline: "第二天仍需要再决定" },
  { current: "想靠购买获得突破", baseline: "先完成一个最小结果" },
  { current: "深夜继续消费", baseline: "保存草稿,停止付款" },
  { current: "忽略课程和项目", baseline: "回到当前最紧急硬任务" },
  { current: "任务太大想逃避", baseline: "拆成一个最小动作" },
  { current: "想熬夜继续开发", baseline: "停止高刺激任务并准备睡觉" },
] as const
