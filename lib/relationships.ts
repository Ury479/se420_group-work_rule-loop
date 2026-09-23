// 人际关系筛查台:类型、标签、状态判定与推测模板
// 核心方法论:广泛社交,广泛筛选,精准维护,守住底线。
// 系统只输出关系状态,不评价对方人格;所有推测必须标注为推测。

export type RelationshipType =
  | "teacher"
  | "classmate"
  | "friend"
  | "partner"
  | "boss"
  | "advisor"
  | "family"
  | "other"

export type RelationshipStatus =
  | "long_term_maintain"
  | "normal_contact"
  | "observe_carefully"
  | "boundary_needed"

export type NetImpact = "positive" | "neutral" | "negative" | "uncertain"

export type ReciprocityLevel = "one_way" | "balanced" | "mutual_support"

export type NextAction = "maintain" | "get_closer" | "observe" | "set_boundary" | "pause"

export type EnergyAfter = "supported" | "calm" | "drained" | "confused" | "anxious"

export type SignalType =
  | "support_signal"
  | "risk_signal"
  | "boundary_signal"
  | "opportunity_signal"
  | "unclear"

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  teacher: "老师",
  classmate: "同学",
  friend: "朋友",
  partner: "合作方",
  boss: "老板",
  advisor: "导员",
  family: "家人",
  other: "其他",
}

export const RELATIONSHIP_STATUS_LABELS: Record<RelationshipStatus, string> = {
  long_term_maintain: "值得长期维系",
  normal_contact: "正常相处",
  observe_carefully: "需要谨慎观察",
  boundary_needed: "需要边界管理",
}

export const NET_IMPACT_LABELS: Record<NetImpact, string> = {
  positive: "净影响偏正",
  neutral: "净影响中性",
  negative: "净影响偏负",
  uncertain: "尚不确定",
}

export const RECIPROCITY_LABELS: Record<ReciprocityLevel, string> = {
  one_way: "单向索取",
  balanced: "基本平衡",
  mutual_support: "互相支持",
}

export const NEXT_ACTION_LABELS: Record<NextAction, string> = {
  maintain: "保持维系",
  get_closer: "适度靠近",
  observe: "继续观察",
  set_boundary: "设定边界",
  pause: "暂缓投入",
}

export const ENERGY_AFTER_LABELS: Record<EnergyAfter, string> = {
  supported: "被支持",
  calm: "平稳",
  drained: "被消耗",
  confused: "困惑",
  anxious: "焦虑",
}

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  support_signal: "支持信号",
  risk_signal: "风险信号",
  boundary_signal: "边界信号",
  opportunity_signal: "机会信号",
  unclear: "信号不明",
}

// 关键关系类型:发送消息时自动高风险
export const KEY_RELATIONSHIP_TYPES: RelationshipType[] = [
  "teacher",
  "advisor",
  "partner",
  "boss",
]

// 各状态的建议动作(基于需求文档第九节)
export const STATUS_SUGGESTIONS: Record<RelationshipStatus, string[]> = {
  long_term_maintain: [
    "定期联系,保持关系温度",
    "表达感谢,同步关键进展",
    "在合适时机提供价值",
  ],
  normal_contact: ["正常礼貌相处", "保持基本联系", "不过度投入"],
  observe_carefully: [
    "减少即时承诺,继续记录事实",
    "重要沟通前走确认流程",
    "不急着投入大量资源,不急着下结论",
  ],
  boundary_needed: [
    "降低投入,明确边界",
    "延迟回复,避免深夜沟通",
    "不做超出底线的承诺,使用「我需要确认一下再回复」",
  ],
}

/**
 * 基于事实的关系状态初判。
 * 注意:这是对关系状态的评估,不是对人的评价;结论仅供参考,鼓励继续观察。
 */
export function suggestRelationshipStatus(input: {
  energyAfter: EnergyAfter
  reciprocityLevel?: ReciprocityLevel | null
  didIPeoplePlease?: boolean
  didICrossBoundary?: boolean
  netImpact?: NetImpact | null
  signalType?: SignalType | null
}): RelationshipStatus {
  const {
    energyAfter,
    reciprocityLevel,
    didIPeoplePlease,
    didICrossBoundary,
    netImpact,
    signalType,
  } = input

  // 底线受损 / 讨好 + 消耗 → 边界管理
  if (didICrossBoundary) return "boundary_needed"
  if (
    (energyAfter === "drained" || energyAfter === "anxious") &&
    (didIPeoplePlease || reciprocityLevel === "one_way" || netImpact === "negative")
  ) {
    return "boundary_needed"
  }

  // 信号不稳 / 消耗但原因不明 → 谨慎观察
  if (
    energyAfter === "drained" ||
    energyAfter === "anxious" ||
    energyAfter === "confused" ||
    signalType === "risk_signal" ||
    signalType === "boundary_signal" ||
    netImpact === "uncertain" ||
    reciprocityLevel === "one_way"
  ) {
    return "observe_carefully"
  }

  // 稳定互惠 + 正向 → 长期维系
  if (
    energyAfter === "supported" &&
    (reciprocityLevel === "mutual_support" || netImpact === "positive")
  ) {
    return "long_term_maintain"
  }

  return "normal_contact"
}

/** 净影响初判(基于能量与互惠,不打人格分) */
export function suggestNetImpact(input: {
  energyAfter: EnergyAfter
  reciprocityLevel?: ReciprocityLevel | null
}): NetImpact {
  const { energyAfter, reciprocityLevel } = input
  if (energyAfter === "supported" && reciprocityLevel !== "one_way") return "positive"
  if (energyAfter === "drained" || energyAfter === "anxious") {
    return reciprocityLevel === "one_way" ? "negative" : "uncertain"
  }
  if (energyAfter === "calm") return "neutral"
  return "uncertain"
}

/** 各状态的下一步建议 */
export function suggestNextAction(status: RelationshipStatus): NextAction {
  switch (status) {
    case "long_term_maintain":
      return "maintain"
    case "normal_contact":
      return "observe"
    case "observe_carefully":
      return "observe"
    case "boundary_needed":
      return "set_boundary"
  }
}

// 沟通前 5 维检查(对象 / 目的 / 语气 / 证据 / 时机)
export const COMMUNICATION_CHECK_ITEMS = [
  "对象:我确认发给正确的人。",
  "目的:我确认我要表达的核心目的。",
  "语气:我确认语气礼貌、清楚、不带情绪。",
  "证据:我确认是否需要截图、文件、时间线。",
  "时机:我确认现在是合适的发送时机。",
]

// 底线防护 5 问
export const BOUNDARY_CHECK_ITEMS = [
  "我是不是为了讨好对方而承诺了超出能力范围的事情?",
  "我是不是为了满足对方情绪而牺牲自己的学业、项目、健康或金钱?",
  "我是不是没有确认自己的底线就答应了?",
  "这件事是否会损害我的长期主线?",
  "我是否可以用更稳健的方式表达拒绝或延迟?",
]

// 底线防护建议动作
export const BOUNDARY_SUGGESTIONS = [
  "先不即时承诺",
  "使用「我需要确认一下再回复」",
  "延迟 10 分钟或 24 小时",
  "先写草稿,不直接发送",
]

// 高风险沟通提示文案
export const HIGH_RISK_COMM_COPY =
  "稳就是快。先保存草稿,确认对象、目的、语气、证据和时机,再发送。"

// 推测输出模板(所有内容标注为推测)
export const HYPOTHESIS_DISCLAIMER =
  "以上均为基于事实的推测,不是确定结论。继续观察,不要急着贴标签。"

export const CORE_NEED_OPTIONS = ["效率", "尊重", "资源", "情绪支持", "结果", "确定性"]

export const SENSITIVE_POINT_OPTIONS = [
  "时间",
  "责任",
  "面子",
  "边界",
  "利益分配",
  "被质疑",
]

export const LANDMINE_DEFAULTS = [
  "避免在信息不完整时直接判断",
  "避免越级承诺",
  "避免情绪化表达",
  "避免深夜发送复杂消息",
]

// 核心文案
export const METHODOLOGY_COPY = "广泛社交,广泛筛选,精准维护,守住底线。"
export const STEADY_COPY = "稳就是快。先稳住,再表达。先确认事实,再判断关系。"
