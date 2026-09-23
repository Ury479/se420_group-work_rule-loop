import type { CommunicationPlan, PersonResource, PersonNeedHypothesis } from "@/lib/db/schema"
import {
  relationshipTypeLabel,
  relationshipStageLabel,
  communicationTypeLabel,
  communicationChannelLabel,
  investmentNatureLabel,
  needTypeLabel,
  confidenceLabel,
  needsBottomLineCheck,
} from "@/lib/resource-types"

function fmt(d: Date | null | undefined) {
  if (!d) return "未设置"
  return new Date(d).toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" })
}

const v = (s: string | null | undefined) => s?.trim() || "未填写"

export function generateCommunicationPlanMarkdown(
  plan: CommunicationPlan,
  person: PersonResource,
  hypotheses: PersonNeedHypothesis[]
): string {
  const activeHypotheses = hypotheses.filter((h) => h.status === "active")
  const lines: string[] = [
    "# 人际沟通计划",
    "",
    "## 一、沟通对象",
    `- 对方:${person.personName}`,
    `- 关系类型:${relationshipTypeLabel(person.relationshipType)}`,
    `- 当前关系阶段:${relationshipStageLabel(person.relationshipStage)}`,
    `- 上次互动:${fmt(person.lastContactAt)}`,
    "",
    "## 二、本次目标",
    `- 当前需要解决的问题:${v(plan.communicationGoal)}`,
    `- 本次沟通目标:${v(plan.communicationGoal)}`,
    `- 本次最多推进到:${v(plan.maxProgressGoal)}`,
    `- 希望对方采取的下一步:${v(plan.expectedNextAction)}`,
    "",
    "## 三、已有准备",
    `- 我已经尝试:${v(plan.triedAlready)}`,
    `- 已准备的材料:${v(plan.materialsPrepared)}`,
    `- 现有资料为什么无法解决:${v(plan.whyMustAsk)}`,
    `- 预计占用对方时间:${plan.estimatedMinutes ? `约 ${plan.estimatedMinutes} 分钟` : "未估算"}`,
    "",
    "## 四、对方核心诉求假设(待验证,非事实)",
  ]

  if (activeHypotheses.length === 0) {
    lines.push("- 暂无记录的诉求假设")
  } else {
    for (const h of activeHypotheses) {
      lines.push(
        `- 假设:${h.hypothesis}(类型:${needTypeLabel(h.needType)},置信度:${confidenceLabel(h.confidence)})`,
        `  - 当前证据:${v(h.evidence)}`,
        `  - 本次需要验证的问题:${v(h.validationQuestion)}`
      )
    }
  }

  lines.push(
    "",
    "## 五、沟通策略",
    `- 沟通类型:${communicationTypeLabel(plan.communicationType)}`,
    `- 沟通方式:${communicationChannelLabel(plan.communicationChannel)}`,
    `- 核心表达:${v(plan.coreMessage)}`,
    `- 先说:${v(plan.firstMessage)}`,
    `- 后说:${v(plan.laterMessage)}`,
    `- 暂不讨论:${v(plan.topicsToAvoid)}`,
    `- 可公开信息:${v(plan.informationToShare)}`,
    `- 暂不公开信息:${v(plan.informationToWithhold)}`,
    `- 备选方案:${v(plan.backupPlan)}`,
    "",
    "## 六、我的资源投入",
    `- 本次投入:${v(plan.resourcesToInvest)}`,
    `- 投入性质:${investmentNatureLabel(plan.investmentNature)}`,
    `- 预计时间:${plan.estimatedMinutes ? `${plan.estimatedMinutes} 分钟` : "未估算"}`,
    `- 最大投入上限:${v(plan.investmentLimit)}`,
    `- 我能提供的价值:${v(plan.valueToOffer)}`,
    `- 我不能承诺的事项:${v(plan.unavailableResources)}`,
    `- 是否影响当前主线:${v(plan.mainlineImpact)}`,
    "",
    "## 七、沟通节奏",
    `- 本次联系时间:${fmt(plan.contactAt)}`,
    `- 等待回复期限:${fmt(plan.replyWaitUntil)}`,
    `- 下一次跟进时间:${fmt(plan.nextFollowUpAt)}`,
    `- 最多主动跟进次数:${plan.followUpLimit}`,
    `- 进入下一阶段条件:${v(plan.advanceCondition)}`,
    `- 暂缓联系条件:${v(plan.pauseCondition)}`,
    "",
    "## 八、底线检查",
    `- 是否存在讨好型投入:${plan.investmentNature === "people_pleasing_risk" ? "是(高风险)" : "否"}`,
    `- 是否超出承受范围:${plan.investmentNature === "over_capacity" ? "是(高风险)" : "否"}`,
    `- 是否需要底线五问:${needsBottomLineCheck(plan.investmentNature) ? "是" : "否"}`,
    `- 是否损害课程、项目、健康或财务:${v(plan.mainlineImpact)}`,
    `- 是否需要先回复「我确认后再答复」:${needsBottomLineCheck(plan.investmentNature) ? "建议是" : "视情况"}`,
    "",
    "---",
    `生成时间:${new Date().toLocaleString("zh-CN")}`,
    "说明:本文档由个人仪表盘生成,对方诉求均为待验证假设,不代表事实。"
  )

  return lines.join("\n")
}
