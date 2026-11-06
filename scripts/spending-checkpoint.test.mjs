import assert from "node:assert/strict"
import test from "node:test"
import { createTopics, resolveLocalTime, readCheckpoint, scheduleTopic, finishRound, isDue, isSafeSource } from "../lib/spending-checkpoint-preview.ts"

const now = Date.parse("2026-09-28T00:00:00Z")
function form(values = {}) {
  const fd = new FormData()
  for (const [key, value] of Object.entries({ nodeKind: "date", localTime: "2026-10-01T09:00", timeZone: "Asia/Shanghai", ...values })) fd.set(key, value)
  return fd
}

test("空白卡无伪造结果，两个演示场景没有伪造日期或消费金额", () => {
  const topics = createTopics()
  assert.equal(topics[2].current.evidence.length, 0)
  assert.equal(topics[2].current.unknowns.length, 0)
  for (const topic of topics) {
    assert.equal(topic.current.checkpoint, null)
    assert.equal(topic.history.length, 0)
    assert.equal(topic.conversion, undefined)
    assert.equal(isDue(topic.current, now), false)
  }
})

test("真实换算上下文与示例严格分离，不预填成功结果", () => {
  const context = { id: 1, amount: "100", currency: "CNY", options: ["原始选项"], rate: "7", capturedAt: "2026-09-28", resolution: "未决定" }
  const topic = createTopics(context).at(-1)
  assert.equal(topic.origin, "conversion")
  assert.deepEqual(topic.conversion, context)
  assert.equal(topic.current.evidence.length, 0)
})

test("按用户选择的时区转换绝对时间", () => {
  assert.equal(resolveLocalTime("2026-10-01T09:00", "Asia/Shanghai"), "2026-10-01T01:00:00.000Z")
  assert.equal(resolveLocalTime("2026-10-01T09:00", "Asia/Bangkok"), "2026-10-01T02:00:00.000Z")
  assert.equal(resolveLocalTime("2026-10-01T09:00", "America/New_York"), "2026-10-01T13:00:00.000Z")
  assert.equal(resolveLocalTime("2026-10-01T09:00", "UTC"), "2026-10-01T09:00:00.000Z")
})

test("拒绝不存在日期、未知时区和夏令时歧义", () => {
  assert.equal(resolveLocalTime("2026-02-30T09:00", "UTC"), null)
  assert.equal(resolveLocalTime("2026-10-01T09:00", "Mars/Olympus"), null)
  assert.equal(resolveLocalTime("2026-03-08T02:30", "America/New_York"), null)
  assert.equal(resolveLocalTime("2026-11-01T01:30", "America/New_York"), null)
})

test("无日期、过去日期、缺少里程碑均不能约定成功", () => {
  assert.equal(typeof readCheckpoint(form({ localTime: "" }), now), "string")
  assert.equal(typeof readCheckpoint(form({ localTime: "2020-01-01T00:00" }), now), "string")
  assert.equal(typeof readCheckpoint(form({ nodeKind: "milestone", milestone: " " }), now), "string")
})

test("里程碑需手动确认或到兜底日期，暂停后不再入队", () => {
  const node = readCheckpoint(form({ nodeKind: "milestone", milestone: "完成作业" }), now)
  const topic = scheduleTopic(createTopics()[0], node, "主线", "期待", new Date(now).toISOString())
  assert.equal(isDue(topic.current, now), false)
  assert.equal(isDue(topic.current, Date.parse(node.at)), true)
  assert.equal(isDue({ ...topic.current, checkpoint: { ...node, milestoneConfirmed: true } }, now), true)
  assert.equal(isDue({ ...topic.current, status: "paused" }, Date.parse(node.at)), false)
})

test("改约不改原始期待，保留节点变更，重置外部提醒自报状态", () => {
  const node = readCheckpoint(form(), now)
  const initial = scheduleTopic(createTopics()[0], node, "旧主线", "原始期待", new Date(now).toISOString())
  initial.current.reminder = "added"
  const changed = scheduleTopic(initial, { ...node, at: "2026-11-01T01:00:00.000Z", localTime: "2026-11-01T09:00" }, "不能替换", "不能替换", new Date(now + 1000).toISOString())
  assert.equal(changed.current.expectations[0].text, "原始期待")
  assert.equal(changed.current.mainline, "旧主线")
  assert.equal(changed.current.changes.length, 2)
  assert.equal(changed.current.reminder, "unconfigured")
  assert.equal(initial.current.changes.length, 1)
})

test("下一轮保留历史快照，新的结果不覆盖上一轮", () => {
  const topic = createTopics()[0]
  topic.current.status = "reviewing"
  const original = structuredClone(topic)
  const decision = { question: "是否更省事？", action: "完成一次真实回访", criterion: "补出遗漏信息" }
  const next = finishRound(topic, decision, readCheckpoint(form(), now), "新的主线", "发现当前限制", new Date(now).toISOString())
  assert.equal(next.history.length, 1)
  assert.equal(next.current.number, 2)
  assert.equal(next.current.status, "waiting")
  assert.equal(next.current.evidence.length, 0)
  assert.deepEqual(next.current.experiment, decision)
  assert.equal(next.current.mainlineChangeReason, "发现当前限制")
  assert.deepEqual(topic, original)
  next.current.expectations[0].text = "测试修改"
  assert.notEqual(next.history[0].expectations[0].text, "测试修改")
  assert.notEqual(topic.current.expectations[0].text, "测试修改")
})

test("未开始回访或已结束时，不能提交完成或恢复结束主题", () => {
  const topic = createTopics()[0]
  const node = readCheckpoint(form(), now)
  assert.equal(finishRound(topic, { question: "x", action: "x", criterion: "x" }, node, "x", "", new Date(now).toISOString()), topic)
  topic.current.status = "ended"
  assert.equal(scheduleTopic(topic, node, "x", "x", new Date(now).toISOString()), topic)
})

test("材料链接只允许 http 和 https", () => {
  assert.equal(isSafeSource("https://example.com/note"), true)
  assert.equal(isSafeSource("javascript:alert(1)"), false)
  assert.equal(isSafeSource("data:text/html,test"), false)
  assert.equal(isSafeSource("用户口述"), false)
})
