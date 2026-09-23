// 事件案例库统一枚举配置。
// 新增事件类型/场景/根因时只需在此扩展,页面结构无需改动。

export const EVENT_TYPES = [
  { value: "lost_item", label: "丢失物品" },
  { value: "almost_lost", label: "差点丢失" },
  { value: "decision", label: "决策失误" },
  { value: "consumption", label: "消费" },
  { value: "relationship", label: "人际关系" },
  { value: "project", label: "项目" },
  { value: "study", label: "学业" },
  { value: "sleep", label: "睡眠" },
  { value: "health", label: "健康" },
  { value: "custom", label: "自定义" },
] as const

export const EVENT_SCENES = [
  { value: "transportation", label: "交通工具" },
  { value: "gym", label: "健身房" },
  { value: "restaurant", label: "餐厅" },
  { value: "classroom", label: "教室" },
  { value: "library", label: "图书馆" },
  { value: "home", label: "家" },
  { value: "hotel", label: "酒店" },
  { value: "muay_thai", label: "泰拳馆" },
  { value: "custom", label: "其他" },
] as const

export const EVENT_STATUSES = [
  { value: "searching", label: "寻找中" },
  { value: "solved", label: "已解决" },
  { value: "found", label: "已找回" },
  { value: "lost", label: "确认丢失" },
  { value: "closed", label: "已关闭" },
] as const

// Root Cause 分类:只能由用户在复盘时选择,AI 不得自行推断
export const ROOT_CAUSES = [
  { value: "attention_switching", label: "注意力切换" },
  { value: "task_switching", label: "任务切换" },
  { value: "temporary_placement", label: "临时放置" },
  { value: "working_memory_failure", label: "工作记忆失效" },
  { value: "leaving_without_checking", label: "离开时未检查" },
  { value: "no_exit_checklist", label: "没有离场清单" },
  { value: "rushing", label: "赶时间" },
  { value: "incomplete_confirmation", label: "确认不完整" },
  { value: "over_confidence", label: "过度自信" },
  { value: "environmental_distraction", label: "环境干扰" },
  { value: "time_pressure", label: "时间压力" },
  { value: "fatigue", label: "疲劳" },
  { value: "stress", label: "压力" },
  { value: "context_switching", label: "情境切换" },
] as const

export const RULE_STATUSES = [
  { value: "candidate", label: "候选" },
  { value: "active", label: "生效中" },
  { value: "archived", label: "已归档" },
  { value: "rejected", label: "已拒绝" },
] as const

export type EventTypeValue = (typeof EVENT_TYPES)[number]["value"]
export type EventSceneValue = (typeof EVENT_SCENES)[number]["value"]
export type EventStatusValue = (typeof EVENT_STATUSES)[number]["value"]
export type RootCauseValue = (typeof ROOT_CAUSES)[number]["value"]
export type RuleStatusValue = (typeof RULE_STATUSES)[number]["value"]

export function eventTypeLabel(value: string): string {
  return EVENT_TYPES.find((t) => t.value === value)?.label ?? value
}
export function sceneLabel(value: string): string {
  return EVENT_SCENES.find((s) => s.value === value)?.label ?? value
}
export function statusLabel(value: string): string {
  return EVENT_STATUSES.find((s) => s.value === value)?.label ?? value
}
export function rootCauseLabel(value: string): string {
  return ROOT_CAUSES.find((r) => r.value === value)?.label ?? value
}
export function ruleStatusLabel(value: string): string {
  return RULE_STATUSES.find((r) => r.value === value)?.label ?? value
}
