import type { EntertainmentAssessment, EntertainmentReflection, EntertainmentSession } from "@/lib/db/schema"

const typeLabels: Record<string, string> = { gaming: "游戏", video: "影视/短视频", social: "社交娱乐", dining: "餐饮娱乐", reading: "休闲阅读", other: "其他" }

export function calculateRisk(input: { entertainmentType: string; latestEndAt?: Date | null; plannedMinutes: number; previousStopDifficulty?: number }) {
  let points = input.plannedMinutes > 120 ? 2 : input.plannedMinutes > 60 ? 1 : 0
  if (["video", "gaming"].includes(input.entertainmentType)) points += 1
  if (input.latestEndAt && input.latestEndAt.getHours() >= 21) points += 1
  if ((input.previousStopDifficulty ?? 0) >= 7) points += 2
  const riskLevel = points >= 4 ? "high" : points >= 2 ? "medium" : "low"
  return { riskLevel, reminderLevel: riskLevel === "high" ? "strict" : riskLevel === "medium" ? "normal" : "light" }
}

export function buildTickTick(input: { title: string; entertainmentType: string; plannedMinutes: number; plannedBudgetCny: number; plannedQuantity?: number | null; quantityUnit?: string | null; latestEndAt?: Date | null; boundaryNote?: string | null; nextAction?: string | null; riskLevel: string }) {
  const labels = ["娱乐边界", typeLabels[input.entertainmentType] || "其他", input.riskLevel === "high" ? "严格限时" : null].filter(Boolean).slice(0, 3)
  const quantity = input.plannedQuantity ? `，最多 ${input.plannedQuantity}${input.quantityUnit || "个"}` : ""
  const end = input.latestEndAt ? input.latestEndAt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }) : "按计划停止"
  const title = `[娱乐] ${input.title} · ${input.plannedMinutes} 分钟${quantity}`
  const checklist = [`- [ ] 开始前确认目的和边界`, `- [ ] ${end} 前停止，不自动续播`, `- [ ] 预算不超过 ¥${input.plannedBudgetCny}`, `- [ ] 结束后执行：${input.nextAction || "完成 10 分钟主线动作"}`, `- [ ] 回到系统填写结果记录`].join("\n")
  const body = [`目标：${input.title}`, `标签：${labels.map((label) => `#${label}`).join(" ")}`, `时长：${input.plannedMinutes} 分钟${quantity}`, `停止边界：${input.boundaryNote || end}`, `结束后唯一动作：${input.nextAction || "完成 10 分钟主线动作"}`, "", checklist].join("\n")
  return { title, body, checklist }
}

export function conversionResult(input: { nextActionStarted: boolean; nextActionStartedAt?: Date | null; actualEndedAt?: Date | null; sleepImpact?: string | null }) {
  if (input.sleepImpact === "转入睡眠") return "sleep"
  if (!input.nextActionStarted) return "none"
  if (!input.nextActionStartedAt || !input.actualEndedAt) return "delayed"
  return input.nextActionStartedAt.getTime() - input.actualEndedAt.getTime() <= 15 * 60_000 ? "immediate" : "delayed"
}

export function buildGptPrompt(session: EntertainmentSession, assessment: EntertainmentAssessment) {
  return `你是一个克制的娱乐复盘助手。只基于以下事实分析，不替我做决定，不进行心理诊断。\n\n【计划】\n内容：${session.title}\n类型：${typeLabels[session.entertainmentType] || session.entertainmentType}\n目的：${session.purpose || "未填写"}\n服务主线：${session.mainline || "未填写"}\n计划：${session.plannedMinutes} 分钟 / ¥${session.plannedBudgetCny}\n边界：${session.boundaryNote || "未填写"}\n结束后动作：${session.nextAction || "未填写"}\n\n【实际】\n时长：${assessment.actualMinutes} 分钟，超时 ${assessment.overtimeMinutes} 分钟\n花费：¥${assessment.actualCostCny}\n恢复感：${assessment.recoveredEnergy}/10，后悔度：${assessment.regretLevel}/10\n停止难度：${assessment.stopDifficulty}/10，自动续播：${assessment.autoplayOccurred ? "是" : "否"}\n主线帮助：${assessment.mainlineHelpScore}/5，转化：${assessment.conversionResult || "未记录"}\n合理化理由：${assessment.rationalization || "无"}\n\n请输出：1. 事实摘要；2. 这次属于有效恢复/部分有效/净消耗；3. 失控节点；4. 真实需求；5. 新的自我认识；6. 下一次最小调整；7. 一条候选拦截规则。明确区分事实和推断。`
}

export function buildEntertainmentMarkdown(session: EntertainmentSession, assessment: EntertainmentAssessment, reflection: Partial<EntertainmentReflection>) {
  return `# 娱乐复盘：${session.title}\n\n## 计划与边界\n- 类型：${typeLabels[session.entertainmentType] || session.entertainmentType}\n- 目的：${session.purpose || "未填写"}\n- 服务主线：${session.mainline || "未填写"}\n- 计划时长：${session.plannedMinutes} 分钟\n- 预算：¥${session.plannedBudgetCny}\n- 停止边界：${session.boundaryNote || "未填写"}\n- 结束后动作：${session.nextAction || "未填写"}\n\n## 实际结果\n- 实际时长：${assessment.actualMinutes} 分钟（超时 ${assessment.overtimeMinutes} 分钟）\n- 实际花费：¥${assessment.actualCostCny}\n- 恢复感：${assessment.recoveredEnergy}/10\n- 后悔度：${assessment.regretLevel}/10\n- 停止难度：${assessment.stopDifficulty}/10\n- 满意度均值：${assessment.satisfactionAverage}/10\n- 主线帮助：${assessment.mainlineHelpScore}/5\n- 转化结果：${assessment.conversionResult || "未记录"}\n\n## GPT 分析（用户态度：${reflection.gptResultStatus || "pending"}）\n${reflection.gptReviewResult || "未回填"}\n\n## 用户确认\n- 事实：${reflection.factSummary || "未填写"}\n- 教训：${reflection.lesson || "未填写"}\n- 原则：${reflection.principle || "未填写"}\n- 候选规则：${reflection.candidateRule || "未填写"}\n- 下一次最小调整：${reflection.nextMinimalAdjustment || "未填写"}\n`
}
