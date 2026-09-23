import type { CurrentState, FinalActionType } from "./types"
import { KEY_PERSON_KEYWORDS } from "./types"

// ── 系统座右铭 ──────────────────────────────
export const SYSTEM_MOTTO = "稳就是一切,远离贪婪就是远离贫穷。"

// ── 6 类核心短板 ──────────────────────────────
export type WeaknessKey =
  | "scope_greed"
  | "rush_finish"
  | "careless_jump"
  | "people_pleasing"
  | "impulsive_spending"
  | "scattered_focus"

export type Severity = "low" | "medium" | "high"

export const WEAKNESS_LABELS: Record<WeaknessKey, string> = {
  scope_greed: "贪多扩张",
  rush_finish: "急着结束",
  careless_jump: "跳步粗心",
  people_pleasing: "讨好失边界",
  impulsive_spending: "冲动消费",
  scattered_focus: "多线分散",
}

export const WEAKNESS_DESCRIPTIONS: Record<WeaknessKey, string> = {
  scope_greed: "新增需求太多,P0 未完成又继续加 P1/P2。",
  rush_finish: "任务快完成时想跳过检查。",
  careless_jump: "提交错文件、看错入口、漏看要求。",
  people_pleasing: "为了满足别人情绪而承诺超出能力范围的事情。",
  impulsive_spending: "工具、课程、会员、大额消费冲动。",
  scattered_focus: "同时推进太多方向,主线被稀释。",
}

// 推荐拦截模块:标签 + 跳转路径
export const WEAKNESS_INTERVENTIONS: Record<
  WeaknessKey,
  { label: string; href: string; advice: string }
> = {
  scope_greed: {
    label: "P0 锁定 / 需求 Backlog",
    href: "/demands",
    advice: "先完成一个关键因,新增需求进入 Backlog。",
  },
  rush_finish: {
    label: "稳定模式 / 90% 检查",
    href: "/quick-check",
    advice: "先停 10 秒,进入 90% 快速检查再执行。",
  },
  careless_jump: {
    label: "不可逆动作拦截 / 必要证据",
    href: "/quick-check",
    advice: "提交前重新打开要求和最终文件,留下最小证据。",
  },
  people_pleasing: {
    label: "底线防护 / 沟通前检查",
    href: "/relationships",
    advice: "先不即时承诺,使用「我需要确认一下再回复」。",
  },
  impulsive_spending: {
    label: "消费冷静 / 90% 检查",
    href: "/quick-check?action=pay",
    advice: "确认付款周期、自动续费、未来 7 天用途和替代方案。",
  },
  scattered_focus: {
    label: "今日三件事 / P0 聚焦",
    href: "/demands",
    advice: "收敛为今日三件事,关键因优先。",
  },
}

// 每类短板的默认兜底规则(种子规则)
export const WEAKNESS_SEED_RULES: Record<WeaknessKey, string> = {
  scope_greed: "P0 未完成前,新增需求默认进入 Backlog。",
  rush_finish: "想快点结束时,必须进入 90% 检查。",
  careless_jump: "提交前必须重新打开要求和最终文件。",
  people_pleasing:
    "涉及承诺时间、金钱、项目资源或情绪安抚时,必须先进入底线防护检查。",
  impulsive_spending:
    "大额消费前必须确认付款周期、自动续费、未来 7 天用途和替代方案。",
  scattered_focus: "今日主线超过 3 个时,必须收敛为今日三件事。",
}

// 灰烬备忘录升级:系统失效原因
export const WHY_SYSTEM_FAILED_LABELS: Record<string, string> = {
  not_armed: "没有布防",
  not_opened: "没打开系统",
  checks_too_light: "检查项太轻",
  skipped_confirm: "用户跳过确认",
  rule_missed: "规则没有命中",
  other: "其他",
}

// 灰烬备忘录升级:下次拦截点
export const NEXT_INTERCEPTION_POINT_LABELS: Record<string, string> = {
  arm_80: "80% 布防",
  check_90: "90% 检查",
  before_pay: "付款前",
  before_send: "发送前",
  before_submit: "提交前",
  before_depart: "出发前",
  before_commitment: "人际承诺前",
}

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: "低",
  medium: "中",
  high: "高",
}

// ── 检测引擎(纯规则,不依赖 AI) ──────────────────────────────

export interface DetectionInput {
  // 需求 / P0 数据
  todayNewDemandCount: number
  todayCompletedKeyFactorCount: number
  hasUnfinishedP0: boolean
  activeDemandCount: number // 今日 active P0/P1 数
  // 拦截台数据
  currentState?: CurrentState | null
  finalActionType?: FinalActionType | null
  targetPerson?: string | null
  domain?: string | null
  mistakeHistory?: boolean
  // 近 7 天灰烬中出现的短板标签
  recentWeaknessTags?: string[]
}

export interface DetectedWeakness {
  weaknessKey: WeaknessKey
  severity: Severity
  triggerReason: string
  recommendedIntervention: string
}

/** P0 锁定判定:新增需求过快或存在未完成 P0 */
export function shouldLockP0(input: {
  todayNewDemandCount: number
  todayCompletedKeyFactorCount: number
  hasUnfinishedP0: boolean
}): boolean {
  if (input.hasUnfinishedP0) return true
  return (
    input.todayNewDemandCount >
    input.todayCompletedKeyFactorCount * 2 + 1
  )
}

const UNSTABLE_FOR_RUSH: CurrentState[] = ["rushed", "want_to_finish_fast"]
const CARELESS_ACTIONS: FinalActionType[] = ["submit", "confirm", "depart"]

/** 规则检测:返回今日命中的短板列表(按严重度排序) */
export function detectWeaknesses(input: DetectionInput): DetectedWeakness[] {
  const hits: DetectedWeakness[] = []
  const recent = input.recentWeaknessTags ?? []

  // 1. scope_greed:新增需求 > 完成关键因 × 2 + 1
  if (
    input.todayNewDemandCount >
    input.todayCompletedKeyFactorCount * 2 + 1
  ) {
    hits.push({
      weaknessKey: "scope_greed",
      severity: input.hasUnfinishedP0 ? "high" : "medium",
      triggerReason: `今天新增需求 ${input.todayNewDemandCount} 条,完成关键因 ${input.todayCompletedKeyFactorCount} 个${input.hasUnfinishedP0 ? ",且 P0 尚未完成" : ""}`,
      recommendedIntervention: WEAKNESS_INTERVENTIONS.scope_greed.advice,
    })
  }

  // 2. rush_finish:当前状态急躁
  if (input.currentState && UNSTABLE_FOR_RUSH.includes(input.currentState)) {
    hits.push({
      weaknessKey: "rush_finish",
      severity: input.mistakeHistory ? "high" : "medium",
      triggerReason: "当前状态为「有点急 / 想快点结束」",
      recommendedIntervention: WEAKNESS_INTERVENTIONS.rush_finish.advice,
    })
  }

  // 3. careless_jump:不可逆动作 + 历史类似错误
  if (
    input.finalActionType &&
    CARELESS_ACTIONS.includes(input.finalActionType) &&
    (input.mistakeHistory || recent.includes("careless_jump"))
  ) {
    hits.push({
      weaknessKey: "careless_jump",
      severity: "high",
      triggerReason: "即将执行提交 / 确认 / 出发类动作,且历史出现过类似错误",
      recommendedIntervention: WEAKNESS_INTERVENTIONS.careless_jump.advice,
    })
  }

  // 4. people_pleasing:发送给关键对象
  if (
    input.finalActionType === "send" &&
    input.targetPerson &&
    KEY_PERSON_KEYWORDS.some((k) => input.targetPerson!.includes(k))
  ) {
    hits.push({
      weaknessKey: "people_pleasing",
      severity: "high",
      triggerReason: `即将发送给关键对象「${input.targetPerson}」,可能涉及承诺或请求`,
      recommendedIntervention: WEAKNESS_INTERVENTIONS.people_pleasing.advice,
    })
  }

  // 5. impulsive_spending:消费场景
  if (input.domain === "purchase" || input.finalActionType === "pay") {
    hits.push({
      weaknessKey: "impulsive_spending",
      severity: recent.includes("impulsive_spending") ? "high" : "medium",
      triggerReason: "存在进行中的消费 / 付款动作",
      recommendedIntervention: WEAKNESS_INTERVENTIONS.impulsive_spending.advice,
    })
  }

  // 6. scattered_focus:今日 active P0/P1 超过 3 个
  if (input.activeDemandCount > 3) {
    hits.push({
      weaknessKey: "scattered_focus",
      severity: "medium",
      triggerReason: `今日进行中的主线任务有 ${input.activeDemandCount} 个,超过 3 个`,
      recommendedIntervention: WEAKNESS_INTERVENTIONS.scattered_focus.advice,
    })
  }

  // 近 7 天灰烬里反复出现的短板,提升为今日关注
  for (const tag of recent) {
    if (
      (Object.keys(WEAKNESS_LABELS) as WeaknessKey[]).includes(
        tag as WeaknessKey
      ) &&
      !hits.some((h) => h.weaknessKey === tag)
    ) {
      hits.push({
        weaknessKey: tag as WeaknessKey,
        severity: "low",
        triggerReason: "近 7 天的灰烬备忘录中出现过这个短板",
        recommendedIntervention:
          WEAKNESS_INTERVENTIONS[tag as WeaknessKey].advice,
      })
    }
  }

  const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 }
  return hits.sort((a, b) => order[a.severity] - order[b.severity])
}

/** P0 锁定提醒文案 */
export const P0_LOCK_MESSAGE =
  "你正在用新增需求替代执行。当前 P0 未完成,本需求先进入 Backlog。"
