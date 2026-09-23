export type Domain = "study" | "purchase" | "relationship" | "custom"
export type RiskLevel = "low" | "medium" | "high"
export type ConfirmationStatus =
  | "pending"
  | "armed"
  | "checking"
  | "confirmed"
  | "failed"
  | "reviewed"
export type EvidenceType =
  | "screenshot"
  | "text"
  | "file_name"
  | "order_id"
  | "message_draft"
  | "note"
export type StateWhenError =
  | "tired"
  | "rushed"
  | "overloaded"
  | "emotional"
  | "unclear"
  | "other"
export type UsageScene =
  | "requirement"
  | "homework"
  | "message"
  | "review"
  | "prompt"
  | "custom"
export type Tone = "formal" | "concise" | "academic" | "developer"
export type FinalActionType =
  | "submit"
  | "pay"
  | "send"
  | "depart"
  | "confirm"
  | "book"
  | "delete"
  | "custom"
export type CurrentState =
  | "normal"
  | "rushed"
  | "want_to_finish_fast"
  | "overloaded"
  | "tired"
  | "sleep_deprived"
  | "emotional"

export const DOMAIN_LABELS: Record<Domain, string> = {
  study: "学业",
  purchase: "消费",
  relationship: "人际",
  custom: "自定义",
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
}

export const STATUS_LABELS: Record<ConfirmationStatus, string> = {
  pending: "待布防",
  armed: "已布防",
  checking: "检查中",
  confirmed: "已确认",
  failed: "已出错",
  reviewed: "已复盘",
}

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  screenshot: "截图",
  text: "文字说明",
  file_name: "最终文件名",
  order_id: "订单号",
  message_draft: "消息草稿",
  note: "备注",
}

export const STATE_LABELS: Record<StateWhenError, string> = {
  tired: "熬夜后",
  rushed: "着急赶时间",
  overloaded: "任务太多",
  emotional: "情绪不好",
  unclear: "状态不清楚",
  other: "其他",
}

export const USAGE_SCENE_LABELS: Record<UsageScene, string> = {
  requirement: "功能需求",
  homework: "作业说明",
  message: "沟通消息",
  review: "复盘规则",
  prompt: "项目提示词",
  custom: "自定义",
}

export const TONE_LABELS: Record<Tone, string> = {
  formal: "正式",
  concise: "简洁",
  academic: "学术",
  developer: "开发者",
}

export const FINAL_ACTION_LABELS: Record<FinalActionType, string> = {
  submit: "提交",
  pay: "付款",
  send: "发送",
  depart: "出发",
  confirm: "确认",
  book: "预约 / 订票",
  delete: "删除",
  custom: "自定义",
}

export const CURRENT_STATE_LABELS: Record<CurrentState, string> = {
  normal: "正常",
  rushed: "有点急",
  want_to_finish_fast: "想快点结束",
  overloaded: "任务太多",
  tired: "身体疲惫",
  sleep_deprived: "熬夜后",
  emotional: "情绪波动",
}

// 关键对象:人际沟通中命中即自动高风险
export const KEY_PERSON_KEYWORDS = [
  "老师",
  "导员",
  "签证",
  "合作方",
  "老板",
  "项目负责人",
  "小组负责人",
  "教授",
]
