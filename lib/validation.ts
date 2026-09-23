import { z } from "zod"

export const domainSchema = z.enum(["study", "purchase", "relationship", "custom"])
export const riskLevelSchema = z.enum(["low", "medium", "high"])
export const statusSchema = z.enum([
  "pending",
  "armed",
  "checking",
  "confirmed",
  "failed",
  "reviewed",
])
export const evidenceTypeSchema = z.enum([
  "screenshot",
  "text",
  "file_name",
  "order_id",
  "message_draft",
  "note",
])
export const stateWhenErrorSchema = z.enum([
  "tired",
  "rushed",
  "overloaded",
  "emotional",
  "unclear",
  "other",
])
export const usageSceneSchema = z.enum([
  "requirement",
  "homework",
  "message",
  "review",
  "prompt",
  "custom",
])
export const toneSchema = z.enum(["formal", "concise", "academic", "developer"])
export const finalActionTypeSchema = z.enum([
  "submit",
  "pay",
  "send",
  "depart",
  "confirm",
  "book",
  "delete",
  "custom",
])
export const currentStateSchema = z.enum([
  "normal",
  "rushed",
  "want_to_finish_fast",
  "overloaded",
  "tired",
  "sleep_deprived",
  "emotional",
])

export const createConfirmationSchema = z.object({
  title: z.string().min(1, "任务名称不能为空").max(200),
  domain: domainSchema,
  scenario: z.string().max(200).optional().nullable(),
  eventTime: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  locationOrPlatform: z.string().max(300).optional().nullable(),
  targetPerson: z.string().max(200).optional().nullable(),
  riskLevel: riskLevelSchema,
  costIfFailed: z.string().max(500).optional().nullable(),
  likelyMistake: z.string().max(500).optional().nullable(),
  finalCheckFocus: z.string().max(500).optional().nullable(),
  evidenceRequired: z.boolean().default(false),
  mistakeHistory: z.boolean().default(false),
  notes: z.string().max(1000).optional().nullable(),
  finalActionType: finalActionTypeSchema.default("custom"),
  currentState: currentStateSchema.default("normal"),
  backupPath: z.string().max(1000).optional().nullable(),
  isQuickCheck: z.boolean().default(false),
})
export type CreateConfirmationInput = z.infer<typeof createConfirmationSchema>

// 80% 布防:3 个必填 + 3 个可选
export const armSchema = z.object({
  title: z.string().min(1, "请填写你要做什么").max(200),
  costIfFailed: z.string().min(1, "请填写错了的代价").max(500),
  likelyMistake: z.string().min(1, "请填写最容易错在哪里").max(500),
  deadline: z.string().optional().nullable(),
  locationOrPlatform: z.string().max(300).optional().nullable(),
  backupPath: z.string().max(1000).optional().nullable(),
  domain: domainSchema.default("custom"),
  finalActionType: finalActionTypeSchema.default("custom"),
})
export type ArmInput = z.infer<typeof armSchema>

// 90% 快速检查
export const quickCheckSchema = z.object({
  finalActionType: finalActionTypeSchema,
  title: z.string().min(1, "请填写这个动作").max(200),
  costIfFailed: z.string().min(1, "请回答:错了会有什么代价").max(500),
  likelyMistake: z.string().min(1, "请回答:最容易跳过哪一步").max(500),
  finalCheckFocus: z.string().min(1, "请回答:必须重新确认什么").max(500),
  currentState: currentStateSchema.default("normal"),
  backupPath: z.string().max(1000).optional().nullable(),
  evidenceRequired: z.boolean().default(false),
  targetPerson: z.string().max(200).optional().nullable(),
  domain: domainSchema.default("custom"),
})
export type QuickCheckInput = z.infer<typeof quickCheckSchema>

// 灰烬备忘录:极简优先 —— 教训 / 原则只要填一个就能提交,
// 其余(标题、经过、拦截规则等)全部可选,事后随时补充。
export const ashMemoSchema = z
  .object({
    confirmationId: z.number().int().positive().optional().nullable(),
    title: z.string().max(200).optional().nullable(),
    whatHappened: z.string().max(2000).optional().nullable(),
    cost: z.string().max(500).optional().nullable(),
    skippedReason: z.string().max(500).optional().nullable(),
    ignoredFact: z.string().max(500).optional().nullable(),
    lesson: z.string().max(1000).optional().nullable(),
    principle: z.string().max(500).optional().nullable(),
    interceptionRule: z.string().max(500).optional().nullable(),
  domain: domainSchema.default("custom"),
  finalActionType: finalActionTypeSchema.default("custom"),
  likelyMistakeKeywords: z.string().max(300).optional().nullable(),
  // 弱点布防中心升级字段
  exposedWeakness: z
    .enum([
      "scope_greed",
      "rush_finish",
      "careless_jump",
      "people_pleasing",
      "impulsive_spending",
      "scattered_focus",
    ])
    .optional()
    .nullable(),
  whySystemFailed: z
    .enum([
      "not_armed",
      "not_opened",
      "checks_too_light",
      "skipped_confirm",
      "rule_missed",
      "other",
    ])
    .optional()
    .nullable(),
  nextInterceptionPoint: z
    .enum([
      "arm_80",
      "check_90",
      "before_pay",
      "before_send",
      "before_submit",
      "before_depart",
      "before_commitment",
    ])
    .optional()
    .nullable(),
  })
  .refine((d) => Boolean(d.lesson?.trim()) || Boolean(d.principle?.trim()), {
    message: "教训和原则至少填一个就能提交",
    path: ["lesson"],
  })
export type AshMemoInput = z.infer<typeof ashMemoSchema>

// 事后补充:全部字段可选,只更新填写的部分
export const ashMemoUpdateSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().max(200).optional().nullable(),
  whatHappened: z.string().max(2000).optional().nullable(),
  cost: z.string().max(500).optional().nullable(),
  skippedReason: z.string().max(500).optional().nullable(),
  ignoredFact: z.string().max(500).optional().nullable(),
  lesson: z.string().max(1000).optional().nullable(),
  principle: z.string().max(500).optional().nullable(),
  interceptionRule: z.string().max(500).optional().nullable(),
  domain: domainSchema.optional(),
})
export type AshMemoUpdateInput = z.infer<typeof ashMemoUpdateSchema>

// ── 弱点布防中心 ──────────────────────────────

export const weaknessKeySchema = z.enum([
  "scope_greed",
  "rush_finish",
  "careless_jump",
  "people_pleasing",
  "impulsive_spending",
  "scattered_focus",
])

export const demandSchema = z.object({
  title: z.string().min(1, "请填写需求内容").max(300),
  priority: z.enum(["P0", "P1", "P2"]).default("P2"),
  isKeyFactor: z.boolean().default(false),
})
export type DemandInput = z.infer<typeof demandSchema>

export const escalateDemandSchema = z.object({
  demandId: z.number().int().positive(),
  escalateReason: z.string().min(1, "请回答:为什么这个需求必须现在做?").max(500),
})
export type EscalateDemandInput = z.infer<typeof escalateDemandSchema>

export const weaknessEventUpdateSchema = z.object({
  eventId: z.number().int().positive(),
  status: z.enum(["open", "acknowledged", "resolved"]),
})
export type WeaknessEventUpdateInput = z.infer<typeof weaknessEventUpdateSchema>

export const evidenceSchema = z.object({
  confirmationId: z.number().int().positive(),
  evidenceType: evidenceTypeSchema,
  evidenceText: z.string().max(2000).optional().nullable(),
  screenshotUrl: z.string().max(2000).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
})
export type EvidenceInput = z.infer<typeof evidenceSchema>

export const reviewSchema = z.object({
  confirmationId: z.number().int().positive().optional().nullable(),
  mistakeType: z.string().min(1, "请填写这次错误是什么").max(500),
  loss: z.string().max(500).optional().nullable(),
  skippedStep: z.string().max(500).optional().nullable(),
  stateWhenError: stateWhenErrorSchema,
  principleText: z.string().max(500).optional().nullable(),
  newRule: z.string().max(500).optional().nullable(),
  costLevel: riskLevelSchema.default("medium"),
  writeToReviewSystem: z.boolean().default(true),
  generateRule: z.boolean().default(true),
})
export type ReviewInput = z.infer<typeof reviewSchema>

export const ruleSchema = z.object({
  domain: domainSchema,
  scenario: z.string().max(200).optional().nullable(),
  ruleText: z.string().min(1, "规则内容不能为空").max(500),
  principleText: z.string().max(500).optional().nullable(),
  triggerCondition: z.string().max(500).optional().nullable(),
  sourceReviewId: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(false),
})
export type RuleInput = z.infer<typeof ruleSchema>

// ── 人际关系筛查台 ──────────────────────────────

export const relationshipTypeSchema = z.enum([
  "teacher",
  "classmate",
  "friend",
  "partner",
  "boss",
  "advisor",
  "family",
  "other",
])
export const relationshipStatusSchema = z.enum([
  "long_term_maintain",
  "normal_contact",
  "observe_carefully",
  "boundary_needed",
])
export const netImpactSchema = z.enum(["positive", "neutral", "negative", "uncertain"])
export const reciprocityLevelSchema = z.enum(["one_way", "balanced", "mutual_support"])
export const nextActionSchema = z.enum([
  "maintain",
  "get_closer",
  "observe",
  "set_boundary",
  "pause",
])
export const energyAfterSchema = z.enum([
  "supported",
  "calm",
  "drained",
  "confused",
  "anxious",
])
export const signalTypeSchema = z.enum([
  "support_signal",
  "risk_signal",
  "boundary_signal",
  "opportunity_signal",
  "unclear",
])

const impactScore = z.number().int().min(1).max(5).optional().nullable()

// 30 秒快速筛查:3 个必填 + 最多 3 个可选
export const quickScreenSchema = z.object({
  personName: z.string().min(1, "请填写这个人是谁").max(100),
  relationshipType: relationshipTypeSchema.default("other"),
  interactionFact: z.string().min(1, "请填写最近一次互动的事实").max(1000),
  energyAfter: energyAfterSchema,
  impactNote: z.string().max(500).optional().nullable(),
  signalNote: z.string().max(500).optional().nullable(),
  nextAction: nextActionSchema.optional().nullable(),
})
export type QuickScreenInput = z.infer<typeof quickScreenSchema>

// 深度筛查:5-10 个核心字段 + 可选推测扩展
export const deepScreenSchema = z.object({
  personName: z.string().min(1, "请填写对方称呼").max(100),
  relationshipType: relationshipTypeSchema,
  recentInteractionFact: z.string().min(1, "请填写最近互动事实").max(1000),
  netImpact: netImpactSchema.default("uncertain"),
  careerImpactScore: impactScore,
  workImpactScore: impactScore,
  emotionImpactScore: impactScore,
  growthImpactScore: impactScore,
  reciprocityLevel: reciprocityLevelSchema.default("balanced"),
  nextAction: nextActionSchema.default("observe"),
  coreNeedHypothesis: z.string().max(500).optional().nullable(),
  sensitivePoints: z.string().max(500).optional().nullable(),
  communicationLandmines: z.string().max(500).optional().nullable(),
  keySignals: z.string().max(500).optional().nullable(),
  boundaryNotes: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})
export type DeepScreenInput = z.infer<typeof deepScreenSchema>

export const updateRelationshipSchema = deepScreenSchema.partial().extend({
  relationshipStatus: relationshipStatusSchema.optional(),
})
export type UpdateRelationshipInput = z.infer<typeof updateRelationshipSchema>

// 互动记录
export const interactionSchema = z.object({
  relationshipId: z.number().int().positive(),
  interactionFact: z.string().min(1, "请填写互动事实").max(1000),
  energyAfter: energyAfterSchema,
  signalType: signalTypeSchema.default("unclear"),
  didIPeoplePlease: z.boolean().default(false),
  didICrossBoundary: z.boolean().default(false),
  userResponse: z.string().max(500).optional().nullable(),
  nextStep: z.string().max(500).optional().nullable(),
})
export type InteractionInput = z.infer<typeof interactionSchema>

// 人际灰烬备忘录
export const relationshipReviewSchema = z.object({
  relationshipId: z.number().int().positive(),
  whatHappened: z.string().min(1, "请填写这次人际事件发生了什么").max(2000),
  ignoredSignal: z.string().max(500).optional().nullable(),
  rushedOrEmotionalPart: z.string().max(500).optional().nullable(),
  peoplePleasingPart: z.string().max(500).optional().nullable(),
  boundaryCrossed: z.string().max(500).optional().nullable(),
  possibleCoreNeed: z.string().max(500).optional().nullable(),
  lesson: z.string().min(1, "请沉淀这次的教训").max(1000),
  principle: z.string().min(1, "请提炼一条原则").max(500),
  interceptionRule: z.string().min(1, "请写出下次的拦截规则").max(500),
  writeToRules: z.boolean().default(true),
})
export type RelationshipReviewInput = z.infer<typeof relationshipReviewSchema>

export const translateSchema = z.object({
  sourceText: z.string().min(1, "请输入中文内容").max(5000),
  usageScene: usageSceneSchema,
  tone: toneSchema,
})
export type TranslateInput = z.infer<typeof translateSchema>
