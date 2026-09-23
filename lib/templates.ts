import type { Domain, FinalActionType } from "./types"

export interface TemplateItem {
  text: string
  round: 1 | 2 | 3
  required: boolean
}

// 第一轮:确认关键事实(所有任务都显示)
const ROUND1: Record<Domain, string[]> = {
  study: [
    "我确认今天是否有这个学业事件",
    "我确认时间正确",
    "我确认地点 / 平台正确",
    "我确认要求 / 文件 / 入口正确",
    "我确认已经开始行动或已经完成最终提交",
  ],
  purchase: [
    "我确认金额和币种",
    "我确认付款周期:月付 / 年付 / 一次性",
    "我确认是否自动续费",
    "我确认是否可退款",
    "我确认未来 7 天会使用,且没有低成本替代",
  ],
  relationship: [
    "我确认沟通对象正确",
    "我确认我要表达的核心目的",
    "我确认语气不会造成误解",
    "我确认是否需要证据或截图",
    "我确认现在是合适的发送时机",
  ],
  custom: [
    "我确认这件事错了会造成什么代价",
    "我确认最容易错的是哪一步",
    "我确认最后确认时必须看的内容",
    "我确认是否需要留下最小证据",
    "我确认如果不确定时的备用路径",
  ],
}

// 第二轮:确认最终动作(仅高风险)
const ROUND2: Record<Domain, string[]> = {
  study: ["我重新看了老师要求", "我确认提交的是最终文件"],
  purchase: ["我再次确认是否自动续费、是否可退款"],
  relationship: ["我确认语气和目的清楚,不会情绪化发送"],
  custom: ["我确认最终动作的对象和内容无误"],
}

// 第三轮:确认最小证据(仅高风险)
const ROUND3: Record<Domain, string[]> = {
  study: ["我确认已经看到 Submit 成功页面,并留下截图"],
  purchase: ["我确认未来 7 天会使用,并保存付款前截图"],
  relationship: ["我确认发送后不会造成误解,必要时保存草稿"],
  custom: ["我确认已留下最小证据(截图 / 备注 / 单号)"],
}

// 不可逆动作专属检查项(第 1 轮,优先于场景通用项)
export const ACTION_CHECK_ITEMS: Record<FinalActionType, string[]> = {
  submit: [
    "我重新看了一遍要求",
    "我确认文件是最终版本",
    "我确认平台 / 课程 / 标题正确",
    "我确认已看到提交成功",
  ],
  pay: [
    "我确认金额和币种",
    "我确认付款周期和自动续费",
    "我确认是否可退款",
    "我确认未来 7 天会使用",
  ],
  send: [
    "我确认对象正确",
    "我确认目的清楚",
    "我确认语气稳健",
    "我确认现在是合适时机",
  ],
  depart: [
    "我确认日期和时间正确",
    "我确认地点 / 机场 / 教室正确",
    "我确认路线和提前量足够",
    "我确认必要证件 / 材料已准备",
  ],
  confirm: [
    "我确认关键信息正确",
    "我确认这一步是否可撤销",
    "我确认如果出错是否能补救",
    "我确认必要时已留下证据",
  ],
  book: [
    "我确认日期、时间、地点正确",
    "我确认取消 / 改签政策",
    "我确认名字和证件信息无误",
    "我确认已保存预订凭证",
  ],
  delete: [
    "我确认删除的对象正确",
    "我确认这个删除是否可恢复",
    "我确认已备份必要内容",
    "我确认没有其他人依赖它",
  ],
  custom: [
    "我确认这件事错了会造成什么代价",
    "我确认最容易错的是哪一步",
    "我确认最后确认时必须看的内容",
    "我确认是否需要留下最小证据",
  ],
}

// 默认备用方案库:按场景提供替代路径
export const BACKUP_PATH_LIBRARY: Record<Domain, string[]> = {
  study: [
    "重新打开老师要求",
    "问同学",
    "查 Moodle / Teams / 邮箱",
    "检查 Teams Calendar 和课程群",
    "暂停提交,先保存草稿",
  ],
  purchase: [
    "延迟 24 小时",
    "使用已有工具替代",
    "先买月付,不买年付",
    "先截图,不付款",
  ],
  relationship: [
    "先存草稿",
    "10 分钟后再发",
    "先检查语气",
    "先问中性问题,不直接表达强判断",
  ],
  custom: [
    "先暂停,列出还不确定的信息",
    "找一条能验证事实的备用渠道",
    "问一个知道情况的人",
    "不要因为找不到入口就判断没有",
  ],
}

// 稳定模式 3 问(高风险任务在检查前必须回答)
export const STABILIZE_QUESTIONS = [
  "我现在是不是想快点结束?",
  "我有没有重新看关键要求?",
  "如果这一步错了,我能不能补救?",
]

export const STABILIZE_COPY =
  "先停 10 秒。这不是拖延,而是帮你避免最后一步出错。你只需要确认 3 件事。"

// 人际沟通 5 维核对
export const RELATIONSHIP_CHECK_ITEMS = [
  "对象:是不是发给正确的人?",
  "目的:我想让对方知道什么 / 做什么?",
  "语气:是否礼貌、清楚、不带情绪?",
  "证据:是否需要截图、文件、时间线?",
  "时机:现在发是否合适?",
]

export const DRAFT_FIRST_COPY = "先保存草稿,确认语气后再发送。"

/**
 * 根据不可逆动作 + 场景与风险等级生成默认确认清单。
 * 指定了具体动作时,第 1 轮使用动作专属检查项;
 * 人际场景额外附加 5 维核对;高风险任务附加第 2、3 轮。
 */
export function buildItemsForAction(
  action: FinalActionType,
  domain: Domain,
  isHighRisk: boolean
): TemplateItem[] {
  const items: TemplateItem[] = ACTION_CHECK_ITEMS[action].map((text) => ({
    text,
    round: 1,
    required: true,
  }))
  // 人际沟通强化:发送类动作或人际场景附加 5 维核对
  if (domain === "relationship" && action !== "send") {
    for (const text of RELATIONSHIP_CHECK_ITEMS) {
      items.push({ text, round: 1, required: true })
    }
  }
  if (isHighRisk) {
    for (const text of ROUND2[domain]) {
      items.push({ text, round: 2, required: true })
    }
    for (const text of ROUND3[domain]) {
      items.push({ text, round: 3, required: true })
    }
  }
  return items
}

/**
 * 根据场景与风险等级生成默认确认清单。
 * 普通任务只有第 1 轮;高风险任务附加第 2、3 轮。
 */
export function buildDefaultItems(
  domain: Domain,
  isHighRisk: boolean
): TemplateItem[] {
  const items: TemplateItem[] = ROUND1[domain].map((text) => ({
    text,
    round: 1,
    required: true,
  }))
  if (isHighRisk) {
    for (const text of ROUND2[domain]) {
      items.push({ text, round: 2, required: true })
    }
    for (const text of ROUND3[domain]) {
      items.push({ text, round: 3, required: true })
    }
  }
  return items
}
