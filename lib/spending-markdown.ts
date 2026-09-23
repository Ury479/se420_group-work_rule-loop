// 高额支出决策审核 Markdown 文档生成器(需求文档第十三节)
// 纯程序化拼接,不调用任何 AI。

import type { SpendingReview, ToolPurchaseCheck } from "@/lib/db/schema"
import {
  categoryLabel,
  fundingSourceLabel,
  riskLevelLabel,
  recommendationLabel,
  statesLabels,
  triggerLabel,
  isNightWindow,
} from "@/lib/spending-review-types"

const yn = (v: boolean | null | undefined) => (v === true ? "是" : v === false ? "否" : "未填写")
const text = (v: string | null | undefined) => (v && v.trim() ? v.trim() : "未填写")
const num = (v: number | null | undefined) => (v === null || v === undefined ? "未填写" : String(v))

export function generateReviewMarkdown(r: SpendingReview, tool?: ToolPurchaseCheck | null): string {
  const decisionTime = r.decisionTime ?? r.createdAt
  const night = isNightWindow(new Date(decisionTime))
  const states = statesLabels(r.currentStates)
  const triggers = (r.riskTriggers ?? "")
    .split(",")
    .filter(Boolean)
    .map((t) => triggerLabel(t.trim()))

  const lines: string[] = [
    "# 高额支出决策审核申请",
    "",
    "## 一、基本信息",
    `- 支出名称:${r.title}`,
    `- 支出类别:${categoryLabel(r.category)}`,
    `- 预计金额:${r.amount} ${r.currency}`,
    `- 决策时间:${new Date(decisionTime).toLocaleString("zh-CN")}`,
    `- 是否订阅:${yn(r.isSubscription)}`,
    `- 是否自动续费:${yn(r.autoRenew)}`,
    `- 是否可退款:${yn(r.refundable)}`,
    `- 是否可撤销:${yn(r.reversible)}`,
    "",
    "## 二、当前状态",
    `- 当前状态:${states.length ? states.join("、") : "未填写"}`,
    `- 冲动强度:${r.impulseLevel} / 10`,
    `- 睡眠情况:${r.sleepStatus === "enough" ? "充足" : r.sleepStatus === "not_enough" ? "不足" : "未填写"}`,
    `- 是否疲惫:${states.includes("疲惫") ? "是" : "否"}`,
    `- 是否孤独:${states.includes("孤独") ? "是" : "否"}`,
    `- 是否焦虑:${states.includes("焦虑") ? "是" : "否"}`,
    `- 是否害怕错过:${states.includes("害怕错过") ? "是" : "否"}`,
    `- 是否想快速获得结果:${states.includes("想快速获得结果") ? "是" : "否"}`,
    "",
    "## 三、风险时间窗口",
    `- 当前是否处于 20:00–04:00:${night ? "是" : "否"}`,
    `- 时间风险等级:${r.timeRiskLevel === "severe" ? "极高(凌晨)" : r.timeRiskLevel === "elevated" ? "提升(夜间)" : "正常"}`,
    `- 是否建议延期到第二天:${night ? "是" : "否"}`,
    "",
    "## 四、资金安全",
    `- 资金来源:${fundingSourceLabel(r.fundingSource)}`,
    `- 本月剩余预算:${num(r.monthlyBudgetRemaining)}`,
    `- 是否动用生活费:${yn(r.usesLivingExpense)}`,
    `- 是否动用健康预算:${yn(r.usesHealthBudget)}`,
    `- 是否动用学费:${yn(r.usesTuition)}`,
    `- 是否动用应急资金:${yn(r.usesEmergencyFund)}`,
    `- 是否使用借款或信用额度:${yn(r.usesCredit)}`,
    `- 是否触发财务底线:${
      r.usesLivingExpense || r.usesHealthBudget || r.usesTuition || r.usesEmergencyFund || r.usesCredit ? "是" : "否"
    }`,
    "",
    "## 五、真实需求拆解",
    `- 我真正想得到什么:${text(r.realNeed)}`,
    `- 当前具体问题:${text(r.problemToSolve)}`,
    `- 这笔支出如何解决问题:${text(r.problemToSolve)}`,
    `- 不购买会发生什么:${text(r.consequenceIfNotBuy)}`,
    `- 是否属于情绪缓解:${yn(r.emotionalRelief)}`,
    `- 是否属于逃避当前任务:${yn(r.taskAvoidance)}`,
    `- 是否存在更低成本替代:${text(r.alternatives)}`,
    "",
    "## 六、当前主线",
    `- 当前最紧急硬任务:${text(r.currentMainline)}`,
    `- 是否影响课程:${yn(r.affectsCourse)}`,
    `- 是否影响睡眠:${yn(r.affectsSleep)}`,
    `- 是否影响个人仪表盘:${yn(r.affectsDashboard)}`,
    `- 是否影响算法学习:${yn(r.affectsAlgorithm)}`,
    `- 是否影响 AI 课程:${yn(r.affectsAiCourse)}`,
    `- 是否影响产品经理学习:${yn(r.affectsPmLearning)}`,
    `- 是否影响训练:${yn(r.affectsTraining)}`,
    `- 是否影响本周预算:${yn(r.affectsBudget)}`,
    "",
    "## 七、工具与资源检查",
    `- 已有工具:${text(tool?.existingTools)}`,
    `- 是否存在功能重叠:${text(tool?.overlapDescription)}`,
    `- 现有额度是否已经用完:${text(tool?.currentQuotaRemaining)}`,
    `- 未来七天使用任务:${text(tool?.useCaseNext7Days)}`,
    `- 预计使用次数:${num(tool?.expectedUsageCount)}`,
    `- 购买后形成的成果:${text(tool?.expectedOutput)}`,
    `- 不购买是否仍能继续:${yn(tool?.canContinueWithoutPurchase)}`,
    "",
    "## 八、替代方案",
    `1. 不购买:${text(r.consequenceIfNotBuy)}`,
    "2. 延迟:延迟到明天或 24 小时后重新审核",
    "3. 缩减预算:降低预算、选择月付或试用",
    `4. 使用现有工具:${text(tool?.existingTools)}`,
    "5. 保留现金:保留现金即保留选择权",
    `6. 其他方案:${text(r.alternatives)}`,
    "",
    "## 九、最佳状态决策协议对照",
    "- 我状态最好时会怎么处理:先分析,再拆解,再行动;先使用已有工具;不依赖情绪作出不可逆决策",
    `- 当前行为与最佳状态的差距:${states.filter((s) => s !== "状态正常").join("、") || "无明显差距"}`,
    `- 是否违反财务底线:${
      r.usesLivingExpense || r.usesHealthBudget || r.usesTuition || r.usesEmergencyFund || r.usesCredit ? "是" : "否"
    }`,
    `- 是否违反拒绝熬夜原则:${night ? "是(处于夜间风险窗口)" : "否"}`,
    `- 是否违反拒绝冲动消费原则:${r.impulseLevel >= 7 ? "是(冲动强度 " + r.impulseLevel + ")" : "否"}`,
    `- 是否影响课程和长期主线:${
      r.affectsCourse || r.affectsDashboard || r.affectsAlgorithm || r.affectsAiCourse || r.affectsPmLearning
        ? "是"
        : "否"
    }`,
    "",
    "## 十、系统风险结论",
    `- 风险等级:${riskLevelLabel(r.riskLevel)}`,
    `- 触发规则:${triggers.length ? triggers.join("、") : "无"}`,
    `- 建议冷静期:${r.coolingUntil ? "至 " + new Date(r.coolingUntil).toLocaleString("zh-CN") : "无"}`,
    `- 是否必须 GPT 审核:${r.riskLevel === "high" || r.riskLevel === "critical" || r.amount >= 300 ? "是" : "否"}`,
    `- 系统建议:${recommendationLabel(r.systemRecommendation)}`,
    "",
    "## 十一、请 GPT 审核",
    "请基于以上事实进行严格审核,并回答:",
    "1. 这笔支出是否突破财务安全底线?",
    "2. 当前决策是否被疲惫、孤独、焦虑或冲动驱动?",
    "3. 真实需求是什么?",
    "4. 这笔支出是否真的能解决需求?",
    "5. 是否存在更低成本替代方案?",
    "6. 是否影响课程、睡眠和长期主线?",
    "7. 即使属于 AI 或学习投入,是否存在闲置和功能重叠风险?",
    "8. 建议取消、延迟、缩减替代,还是进入最终人工确认?",
    "9. 请指出最重要的风险证据。",
    "10. 请给出一个最小主线回归动作。",
  ]

  return lines.join("\n")
}
