// 资源配置与资产转化系统:枚举、文案与纯规则(不依赖 AI)

export const RESOURCE_TYPES = [
  { value: "content", label: "内容资源" },
  { value: "tool", label: "工具资源" },
  { value: "time", label: "时间资源" },
  { value: "finance", label: "财务资源" },
  { value: "cognitive_asset", label: "认知资产" },
] as const

export const RESOURCE_DOMAINS = [
  { value: "academic", label: "学业" },
  { value: "algorithm", label: "算法" },
  { value: "dashboard", label: "个人仪表盘" },
  { value: "ai_programming", label: "AI 与编程" },
  { value: "product_manager", label: "产品经理" },
  { value: "ielts_english", label: "雅思与英语" },
  { value: "emotion_relation", label: "情感与关系" },
  { value: "health_training", label: "健康与训练" },
  { value: "finance", label: "财务" },
  { value: "project_career", label: "项目与职业" },
  { value: "other", label: "其他" },
] as const

export const RESOURCE_STATUSES = [
  { value: "active", label: "激活" },
  { value: "trial", label: "待验证" },
  { value: "frozen", label: "冻结" },
  { value: "archived", label: "归档" },
  { value: "removal_pending", label: "待清理" },
  { value: "removed", label: "已清理" },
  { value: "exhausted", label: "已耗尽" },
  { value: "pending_review", label: "待复审" },
] as const

export const MAINLINES = [
  { value: "safety", label: "身体与财务安全" },
  { value: "course", label: "课程和学业保底" },
  { value: "algorithm", label: "算法学习" },
  { value: "dashboard", label: "个人仪表盘开发" },
  { value: "ai_course", label: "AI 课程学习" },
  { value: "pm_learning", label: "产品经理思维学习" },
  { value: "ielts", label: "雅思阶段性推进" },
  { value: "long_term", label: "其他长期兴趣" },
] as const

export const CONVERSION_LEVELS = [
  { value: 0, label: "L0 库存", desc: "资源只存在,没有被实际打开" },
  { value: 1, label: "L1 接触", desc: "已打开或观看,但没有留下内容" },
  { value: 2, label: "L2 理解", desc: "留下摘要、概念解释或结构化笔记" },
  { value: 3, label: "L3 练习", desc: "完成题目、代码、案例或实际应用" },
  { value: 4, label: "L4 产出", desc: "形成可查看成果" },
  { value: 5, label: "L5 复用", desc: "成果在另一个任务或项目中再次使用" },
] as const

export const EVIDENCE_TYPES = [
  { value: "note", label: "笔记" },
  { value: "article", label: "文章" },
  { value: "solution", label: "题解" },
  { value: "code", label: "代码" },
  { value: "demo", label: "Demo" },
  { value: "prd", label: "需求文档" },
  { value: "report", label: "报告" },
  { value: "feature", label: "项目功能" },
  { value: "recording", label: "录音" },
  { value: "presentation", label: "演示" },
] as const

export const LINKED_TYPES = [
  { value: "task", label: "任务" },
  { value: "course", label: "课程" },
  { value: "okr", label: "OKR" },
  { value: "model_tree_note", label: "模型树日记" },
  { value: "obsidian_note", label: "Obsidian 笔记" },
  { value: "flomo_note", label: "Flomo 灵感" },
  { value: "ash_memo", label: "灰烬备忘录" },
  { value: "growth_archive", label: "成长档案" },
  { value: "project", label: "项目" },
  { value: "custom", label: "自定义" },
] as const

// ── 人脉 ──

export const RELATIONSHIP_TYPES = [
  { value: "mentor", label: "专业指导者" },
  { value: "teacher", label: "教授或老师" },
  { value: "study_partner", label: "学习伙伴" },
  { value: "tech_mentor", label: "技术导师" },
  { value: "collaborator", label: "项目协作者" },
  { value: "info_provider", label: "信息提供者" },
  { value: "connector", label: "机会连接者" },
  { value: "long_term", label: "长期关系" },
  { value: "other", label: "其他" },
] as const

export const RELATIONSHIP_STAGES = [
  { value: "initial_contact", label: "初次接触" },
  { value: "building_trust", label: "建立基本信任" },
  { value: "need_exploration", label: "需求探索" },
  { value: "value_exchange", label: "价值交换" },
  { value: "small_cooperation", label: "小范围合作" },
  { value: "stable_cooperation", label: "稳定合作" },
  { value: "long_term_maintain", label: "长期维护" },
  { value: "cautious_observe", label: "谨慎观察" },
  { value: "boundary_management", label: "边界管理" },
  { value: "paused", label: "暂缓互动" },
] as const

export const INTERACTION_STATUSES = [
  { value: "normal", label: "可正常联系" },
  { value: "need_preparation", label: "需要准备后再联系" },
  { value: "recent_asks", label: "近期已多次求助" },
  { value: "awaiting_reply", label: "等待对方反馈" },
  { value: "awaiting_my_action", label: "等待我方执行" },
  { value: "owe_feedback", label: "应先提供回馈" },
  { value: "do_not_disturb", label: "暂缓打扰" },
  { value: "needs_maintenance", label: "关系需要维护" },
  { value: "boundary_reset", label: "需要重新确认边界" },
] as const

export const COMMUNICATION_TYPES = [
  { value: "establish", label: "建立联系" },
  { value: "explore_need", label: "了解需求" },
  { value: "ask_help", label: "请求帮助" },
  { value: "sync_progress", label: "同步进展" },
  { value: "provide_resource", label: "提供资源" },
  { value: "advance_cooperation", label: "推进合作" },
  { value: "confirm_boundary", label: "确认边界" },
  { value: "handle_disagreement", label: "处理分歧" },
  { value: "express_thanks", label: "表达感谢" },
  { value: "maintain", label: "关系维护" },
  { value: "result_feedback", label: "结果反馈" },
] as const

export const COMMUNICATION_CHANNELS = [
  { value: "wechat_text", label: "微信文字" },
  { value: "voice", label: "语音" },
  { value: "phone", label: "电话" },
  { value: "email", label: "正式邮件" },
  { value: "in_person", label: "线下面谈" },
  { value: "group", label: "小组沟通" },
  { value: "short_then_appoint", label: "先发简短消息再预约" },
  { value: "other", label: "其他" },
] as const

export const NEED_TYPES = [
  { value: "efficiency", label: "效率" },
  { value: "clear_result", label: "明确结果" },
  { value: "economic", label: "经济收益" },
  { value: "risk_reduction", label: "降低风险" },
  { value: "recognition", label: "获得认可" },
  { value: "emotional_support", label: "情绪支持" },
  { value: "tech_solution", label: "技术方案" },
  { value: "info_resource", label: "信息与资源" },
  { value: "cooperation", label: "合作机会" },
  { value: "stability", label: "关系稳定" },
  { value: "time_saving", label: "节省时间" },
  { value: "clear_duty", label: "责任明确" },
  { value: "growth", label: "个人成长" },
  { value: "other", label: "其他" },
] as const

export const INVESTMENT_NATURES = [
  { value: "reciprocal", label: "正常互惠" },
  { value: "proactive_value", label: "主动提供价值" },
  { value: "long_term_maintain", label: "长期关系维护" },
  { value: "strategic", label: "阶段性战略投入" },
  { value: "info_exchange", label: "信息交换" },
  { value: "one_way_help", label: "单向帮助" },
  { value: "people_pleasing_risk", label: "讨好型投入风险", danger: true },
  { value: "over_capacity", label: "超出承受范围", danger: true },
] as const

export const OUTCOME_STATUSES = [
  { value: "achieved", label: "目标达成" },
  { value: "partial", label: "部分达成" },
  { value: "key_info", label: "获得重要信息" },
  { value: "excluded_direction", label: "排除错误方向" },
  { value: "awaiting_reply", label: "等待对方反馈" },
  { value: "need_materials", label: "需要补充材料" },
  { value: "adjust_strategy", label: "需要调整策略" },
  { value: "paused", label: "暂缓推进" },
  { value: "stop_investing", label: "停止继续投入" },
] as const

export const CONFIDENCE_LEVELS = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
] as const

// ── label 工具 ──

function labelOf(list: readonly { value: string | number; label: string }[], v: string | number | null | undefined) {
  if (v === null || v === undefined) return "未设置"
  return list.find((x) => x.value === v)?.label ?? String(v)
}

export const resourceTypeLabel = (v: string) => labelOf(RESOURCE_TYPES, v)
export const domainLabel = (v: string | null) => labelOf(RESOURCE_DOMAINS, v)
export const resourceStatusLabel = (v: string) => labelOf(RESOURCE_STATUSES, v)
export const mainlineLabel = (v: string | null) => labelOf(MAINLINES, v)
export const conversionLabel = (v: number) => labelOf(CONVERSION_LEVELS, v)
export const evidenceTypeLabel = (v: string) => labelOf(EVIDENCE_TYPES, v)
export const linkedTypeLabel = (v: string) => labelOf(LINKED_TYPES, v)
export const relationshipTypeLabel = (v: string | null) => labelOf(RELATIONSHIP_TYPES, v)
export const relationshipStageLabel = (v: string) => labelOf(RELATIONSHIP_STAGES, v)
export const interactionStatusLabel = (v: string) => labelOf(INTERACTION_STATUSES, v)
export const communicationTypeLabel = (v: string | null) => labelOf(COMMUNICATION_TYPES, v)
export const communicationChannelLabel = (v: string | null) => labelOf(COMMUNICATION_CHANNELS, v)
export const needTypeLabel = (v: string | null) => labelOf(NEED_TYPES, v)
export const investmentNatureLabel = (v: string | null) => labelOf(INVESTMENT_NATURES, v)
export const outcomeStatusLabel = (v: string | null) => labelOf(OUTCOME_STATUSES, v)
export const confidenceLabel = (v: string) => labelOf(CONFIDENCE_LEVELS, v)

// ── 程序化规则(纯函数) ──

/** 规则 1:同一领域激活的内容/工具资源上限 */
export const DOMAIN_ACTIVE_LIMIT = 3

/** 规则 2:激活三要素 —— 缺任一项不得激活 */
export function activationMissing(input: {
  mainline: string | null
  nextAction: string | null
  expectedOutput: string | null
}): string[] {
  const missing: string[] = []
  if (!input.mainline) missing.push("服务主线")
  if (!input.nextAction?.trim()) missing.push("下一次使用动作")
  if (!input.expectedOutput?.trim()) missing.push("预期成果")
  return missing
}

/** 规则 6:人脉调用前检查 —— 三项不明确,不建议立即联系 */
export function contactReadinessMissing(input: {
  triedAlready: string | null
  communicationGoal: string | null
  expectedNextAction: string | null
}): string[] {
  const missing: string[] = []
  if (!input.triedAlready?.trim()) missing.push("我已经尝试了什么")
  if (!input.communicationGoal?.trim()) missing.push("本次要解决的具体问题")
  if (!input.expectedNextAction?.trim()) missing.push("希望对方采取的下一步")
  return missing
}

/** 规则 8:投入性质触发底线检查 */
export function needsBottomLineCheck(nature: string | null): boolean {
  return nature === "people_pleasing_risk" || nature === "over_capacity"
}

/** 底线检查五问 */
export const BOTTOM_LINE_QUESTIONS = [
  "是否会影响课程、项目、健康或财务?",
  "是否为了维持关系而超额承诺?",
  "如果对方没有回应,我是否仍能承担?",
  "是否可以缩小范围?",
  "是否应先回复「我确认后再答复」?",
] as const

/** 调用前四问 */
export const BEFORE_USE_QUESTIONS = [
  "当前主线是什么?",
  "我已经拥有哪些相关资源?",
  "当前只需要调用哪一个?",
  "使用后必须留下什么?",
] as const
