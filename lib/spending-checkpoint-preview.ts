export type Evidence = {
  id: string
  content: string
  kind: "self_report" | "material" | "candidate"
  source: string
  occurredOn: string
  confirmed: boolean
  expectationId: string
  relation: "related" | "uncertain" | "context"
}

export type Checkpoint = {
  kind: "date" | "milestone"
  localTime: string
  timeZone: string
  at: string
  milestone: string
  milestoneConfirmed: boolean
}

export type Decision = {
  question: string
  action: string
  criterion: string
}

export type ConversionContext = {
  id: number
  amount: string
  currency: string
  options: string[]
  rate: string | null
  capturedAt: string | null
  resolution: string
}

export type Round = {
  number: number
  mainline: string
  expectations: { id: string; text: string }[]
  evidence: Evidence[]
  unknowns: string[]
  checkpoint: Checkpoint | null
  status: "draft" | "waiting" | "reviewing" | "paused" | "ended"
  experiment: Decision | null
  nextDecision: Decision | null
  nextCheckpoint: Checkpoint | null
  conclusion: string
  mainlineChangeReason: string
  completedAt: string | null
  reminder: "unconfigured" | "added" | "arrived" | "opened"
  changes: { at: string; action: string; checkpoint: Checkpoint | null; reason: string }[]
}

export type ReviewTopic = {
  id: string
  title: string
  origin: "example" | "blank" | "conversion"
  background: string
  current: Round
  history: Round[]
  conversion?: ConversionContext
}

export const TIME_ZONES = ["Asia/Shanghai", "Asia/Bangkok", "UTC", "Europe/London", "America/New_York"]

function wallTime(date: Date, zone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date)
  const get = (key: string) => parts.find((part) => part.type === key)?.value
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`
}

export function resolveLocalTime(local: string, zone: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) || !TIME_ZONES.includes(zone)) return null
  const wall = Date.parse(`${local}:00Z`)
  if (!Number.isFinite(wall)) return null
  const offsets = new Set<number>()
  for (const shift of [-48, 0, 48]) {
    const instant = wall + shift * 3600000
    offsets.add(Date.parse(`${wallTime(new Date(instant), zone)}:00Z`) - instant)
  }
  const candidates = [...offsets].map((offset) => new Date(wall - offset)).filter((date) => wallTime(date, zone) === local)
  // 夏令时跳时或重复时段不静默猜测，要求用户换一个明确时间。
  return candidates.length === 1 ? candidates[0].toISOString() : null
}

export function readCheckpoint(fd: FormData, now = Date.now()): Checkpoint | string {
  const localTime = String(fd.get("localTime") ?? "")
  const timeZone = String(fd.get("timeZone") ?? "")
  const kind = fd.get("nodeKind") === "milestone" ? "milestone" : "date"
  const milestone = String(fd.get("milestone") ?? "").trim()
  const at = resolveLocalTime(localTime, timeZone)
  if (!at) return "请选择有效的日期、时间与时区；夏令时重复或不存在的时间请重新选择。"
  if (Date.parse(at) <= now) return "请约定一个未来节点，不把过去时间当成新的约定。"
  if (kind === "milestone" && !milestone) return "请写明里程碑，并设置兜底检查时间。"
  return { kind, localTime, timeZone, at, milestone, milestoneConfirmed: false }
}

export function checkpointLabel(node: Checkpoint | null) {
  if (!node) return "待约定"
  return `${node.localTime.replace("T", " ")} · ${node.timeZone}`
}

export function isDue(round: Round, now: number) {
  return round.status === "waiting" && Boolean(round.checkpoint && (round.checkpoint.milestoneConfirmed || Date.parse(round.checkpoint.at) <= now))
}

export function emptyRound(mainline = "", expectation = ""): Round {
  return {
    number: 1, mainline, expectations: [{ id: "expectation-1", text: expectation }], evidence: [], unknowns: [], checkpoint: null,
    status: "draft", experiment: null, nextDecision: null, nextCheckpoint: null, conclusion: "", mainlineChangeReason: "", completedAt: null,
    reminder: "unconfigured", changes: [],
  }
}

export function createTopics(conversion?: ConversionContext): ReviewTopic[] {
  const tool = emptyRound("先解决自己的一个真实问题，再决定是否继续投入开发。", "帮我更有依据地安排重要支出，服务长期计划。")
  tool.evidence = [
    { id: "tool-1", content: "前后使用不到三次。", relation: "context" },
    { id: "tool-2", content: "消费换算帮助过一次 GPT 购买决策。", relation: "related" },
    { id: "tool-3", content: "开发投入约一到两个月。", relation: "context" },
  ].map((item) => ({ ...item, relation: item.relation as Evidence["relation"], kind: "self_report", source: "用户自述", occurredOn: "", confirmed: true, expectationId: "expectation-1" }))
  tool.unknowns = ["它能否持续提供帮助？", "约定节点发起回访，是否比我自己用 AI＋Obsidian 更省事？"]
  const gpt = emptyRound("确认下一阶段的学习与工作，真正需要什么支持。", "为学习、作业、产品思考与设计提供支持。")
  gpt.evidence = ["设计模式、动态规划学习有推进。", "产品工作少量推进。", "泰拳项目经过考虑暂缓。"].map((content, index) => ({
    id: `gpt-${index}`, content, kind: "self_report", source: "用户自述", occurredOn: "", confirmed: true, expectationId: "expectation-1", relation: index === 2 ? "context" : "related",
  }))
  gpt.unknowns = ["下一阶段的任务需要什么？", "已有工具能否满足当前需求？", "哪些帮助能找到具体材料？"]
  const topics: ReviewTopic[] = [
    { id: "tool", title: "这个工具值得继续开发吗？", origin: "example", background: "消费换算曾帮助比较不同用途；一次有帮助，还不足以说明持续有效。开发投入只是背景，不是必须继续的理由。", current: tool, history: [] },
    { id: "gpt", title: "GPT 这笔投入实际帮了我什么？", origin: "example", background: "当时发现 Cursor 额度尚够用，约一周后购买 GPT。金额、币种、套餐与发生日期未核实，不推算收益。", current: gpt, history: [] },
    { id: "blank", title: "这笔投入，我想验证什么？", origin: "blank", background: "购买、暂缓、放弃，都可以留下期待。", current: emptyRound(), history: [] },
  ]
  if (conversion) topics.push({ id: "conversion", title: "这笔投入，我想验证什么？", origin: "conversion", background: "已带入原始换算快照。换算时长不是价值排序，是否购买也不是验证成功的标准。", current: emptyRound(), history: [], conversion })
  return topics
}

export function scheduleTopic(topic: ReviewTopic, checkpoint: Checkpoint, mainline: string, expectation: string, now: string): ReviewTopic {
  if (topic.current.status === "ended") return topic
  const reschedule = topic.current.checkpoint !== null
  return { ...topic, current: { ...topic.current, mainline: topic.current.status === "draft" ? mainline : topic.current.mainline,
    expectations: topic.current.status === "draft" ? [{ id: "expectation-1", text: expectation }] : topic.current.expectations,
    checkpoint, status: "waiting", reminder: "unconfigured",
    changes: [...topic.current.changes, { at: now, action: reschedule ? "改约节点" : "约定节点", checkpoint, reason: "" }],
  } }
}

export function finishRound(topic: ReviewTopic, decision: Decision, checkpoint: Checkpoint, mainline: string, reason: string, now: string): ReviewTopic {
  if (topic.current.status !== "reviewing") return topic
  const completed = structuredClone({ ...topic.current, nextDecision: decision, nextCheckpoint: checkpoint, completedAt: now })
  const next = emptyRound(mainline, topic.current.expectations[0]?.text)
  return { ...topic, history: [...topic.history, completed], current: { ...next, number: topic.current.number + 1,
    expectations: structuredClone(topic.current.expectations), unknowns: [...topic.current.unknowns],
    checkpoint, status: "waiting", experiment: decision, mainlineChangeReason: reason,
    changes: [{ at: now, action: "约定节点", checkpoint, reason }],
  } }
}

export function isSafeSource(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" } catch { return false }
}

export function downloadPreview(topic: ReviewTopic) {
  const blob = new Blob([JSON.stringify({ mode: "design-preview-not-persisted", exportedAt: new Date().toISOString(), topic }, null, 2)], { type: "application/json;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `ruleloop-preview-${topic.id}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
