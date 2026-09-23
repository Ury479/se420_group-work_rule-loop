import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core"

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// 表 1:关键确认任务
export const criticalConfirmations = pgTable("critical_confirmations", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  title: text("title").notNull(),
  domain: text("domain").notNull().default("custom"), // study / purchase / relationship / custom
  scenario: text("scenario"),
  eventTime: timestamp("event_time", { withTimezone: true }),
  deadline: timestamp("deadline", { withTimezone: true }),
  locationOrPlatform: text("location_or_platform"),
  targetPerson: text("target_person"),
  riskLevel: text("risk_level").notNull().default("low"), // low / medium / high
  costIfFailed: text("cost_if_failed"),
  likelyMistake: text("likely_mistake"),
  finalCheckFocus: text("final_check_focus"),
  evidenceRequired: boolean("evidence_required").notNull().default(false),
  mistakeHistory: boolean("mistake_history").notNull().default(false),
  status: text("status").notNull().default("pending"), // pending / armed / checking / confirmed / failed / reviewed
  notes: text("notes"),
  finalActionType: text("final_action_type").notNull().default("custom"), // submit / pay / send / depart / confirm / book / delete / custom
  currentState: text("current_state").notNull().default("normal"), // normal / rushed / want_to_finish_fast / overloaded / tired / sleep_deprived / emotional
  backupPath: text("backup_path"),
  isQuickCheck: boolean("is_quick_check").notNull().default(false),
  armedAt: timestamp("armed_at", { withTimezone: true }),
  checkedAt: timestamp("checked_at", { withTimezone: true }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 2:确认项
export const confirmationItems = pgTable("confirmation_items", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  confirmationId: integer("confirmation_id").notNull(),
  itemText: text("item_text").notNull(),
  isRequired: boolean("is_required").notNull().default(true),
  isChecked: boolean("is_checked").notNull().default(false),
  confirmationRound: integer("confirmation_round").notNull().default(1), // 1 / 2 / 3
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 3:最小证据
export const confirmationEvidence = pgTable("confirmation_evidence", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  confirmationId: integer("confirmation_id").notNull(),
  evidenceType: text("evidence_type").notNull().default("note"), // screenshot / text / file_name / order_id / message_draft / note
  evidenceText: text("evidence_text"),
  screenshotUrl: text("screenshot_url"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull().defaultNow(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 4:错误复盘
export const mistakeReviews = pgTable("mistake_reviews", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  confirmationId: integer("confirmation_id"),
  mistakeType: text("mistake_type").notNull(),
  loss: text("loss"),
  skippedStep: text("skipped_step"),
  stateWhenError: text("state_when_error"), // tired / rushed / overloaded / emotional / unclear / other
  principleText: text("principle_text"),
  newRule: text("new_rule"),
  costLevel: text("cost_level").notNull().default("medium"),
  writeToReviewSystem: boolean("write_to_review_system").notNull().default(true),
  pastChoice: text("past_choice"),
  actualCost: text("actual_cost"),
  alternativeChoice: text("alternative_choice"),
  lessonStatement: text("lesson_statement"),
  lessonStatus: text("lesson_status").notNull().default("draft"), // draft / confirmed / superseded / archived
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 5:拦截规则
export const confirmationRules = pgTable("confirmation_rules", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  domain: text("domain").notNull().default("custom"),
  scenario: text("scenario"),
  ruleText: text("rule_text").notNull(),
  principleText: text("principle_text"),
  triggerCondition: text("trigger_condition"),
  sourceReviewId: integer("source_review_id"),
  isActive: boolean("is_active").notNull().default(false),
  finalActionType: text("final_action_type"), // 匹配用:submit / pay / send / ...
  likelyMistakeKeywords: text("likely_mistake_keywords"), // 逗号分隔关键词
  currentStateTrigger: text("current_state_trigger"), // 匹配用状态,逗号分隔
  hitCount: integer("hit_count").notNull().default(0),
  sourceType: text("source_type").notNull().default("review"), // review / ash_memo / manual
  weaknessKey: text("weakness_key"), // scope_greed / rush_finish / careless_jump / people_pleasing / impulsive_spending / scattered_focus
  rulePriority: integer("rule_priority").notNull().default(0),
  status: text("status").notNull().default("draft"), // draft / active / paused / archived
  severity: text("severity").notNull().default("medium"), // low / medium / high
  currentVersion: integer("current_version").notNull().default(1),
  triggerText: text("trigger_text"),
  recommendedAction: text("recommended_action"),
  sourceId: integer("source_id"),
  matchCount: integer("match_count").notNull().default(0),
  actedCount: integer("acted_count").notNull().default(0),
  validatedCount: integer("validated_count").notNull().default(0),
  helpfulCount: integer("helpful_count").notNull().default(0),
  lastMatchedAt: timestamp("last_matched_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 心念调伏：状态、现实行动、复盘与原则
export const mindRegulationSessions = pgTable("mind_regulation_sessions", {
  id: serial("id").primaryKey(), userId: text("userId").notNull(), currentState: text("current_state").notNull(),
  energyLevel: integer("energy_level").notNull(), agitationLevel: integer("agitation_level").notNull(), currentTask: text("current_task").notNull(),
  triggerText: text("trigger_text"), interventionType: text("intervention_type").notNull(), recommendedAction: text("recommended_action").notNull(),
  selectedAction: text("selected_action"), actionStatus: text("action_status").notNull().default("suggested"),
  startedAt: timestamp("started_at", { withTimezone: true }), completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
export const mindRegulationReviews = pgTable("mind_regulation_reviews", {
  id: serial("id").primaryKey(), userId: text("userId").notNull(), sessionId: integer("session_id").notNull().unique(),
  actualResult: text("actual_result").notNull(), stateAfter: text("state_after").notNull(), effectiveness: text("effectiveness").notNull(),
  lessonText: text("lesson_text"), convertToRule: boolean("convert_to_rule").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
export const mindPrinciples = pgTable("mind_principles", {
  id: serial("id").primaryKey(), userId: text("userId").notNull(), title: text("title").notNull(), principleText: text("principle_text").notNull(),
  applicableStates: text("applicable_states").notNull().default("[]"), actionHint: text("action_hint").notNull(),
  verificationStatus: text("verification_status").notNull().default("pending"), sourceNote: text("source_note"), isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// 规则不可变版本快照
export const interventionRuleVersions = pgTable("intervention_rule_versions", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  ruleId: integer("rule_id").notNull(),
  version: integer("version").notNull(),
  sceneTagsSnapshot: text("scene_tags_snapshot"),
  riskTagsSnapshot: text("risk_tags_snapshot"),
  triggerTextSnapshot: text("trigger_text_snapshot").notNull(),
  actionSnapshot: text("action_snapshot").notNull(),
  severitySnapshot: text("severity_snapshot").notNull(),
  changeReason: text("change_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// 一次规则匹配、展示和选择会话
export const triggerSessions = pgTable("trigger_sessions", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  sceneType: text("scene_type").notNull(),
  sceneSummary: text("scene_summary").notNull(),
  matchedRuleIds: text("matched_rule_ids").notNull().default("[]"),
  matchedRuleVersions: text("matched_rule_versions").notNull().default("[]"),
  shownAt: timestamp("shown_at", { withTimezone: true }).notNull().defaultNow(),
  userChoice: text("user_choice").notNull().default("pending"),
  choiceNote: text("choice_note"),
  status: text("status").notNull().default("matched"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 不同选择后的结果验证；每个触发会话只能验证一次
export const choiceValidations = pgTable("choice_validations", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  triggerSessionId: integer("trigger_session_id").notNull().unique(),
  expectedOutcome: text("expected_outcome"),
  actualOutcome: text("actual_outcome").notNull(),
  costDelta: integer("cost_delta").notNull().default(0),
  emotionDelta: integer("emotion_delta").notNull().default(0),
  decisionQuality: text("decision_quality").notNull(),
  ruleHelpfulness: text("rule_helpfulness").notNull(),
  followupAction: text("followup_action").notNull().default("none"),
  validatedAt: timestamp("validated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 7:灰烬备忘录
export const ashMemos = pgTable("ash_memos", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  confirmationId: integer("confirmation_id"),
  title: text("title"),
  whatHappened: text("what_happened"),
  cost: text("cost"),
  skippedReason: text("skipped_reason"),
  ignoredFact: text("ignored_fact"),
  lesson: text("lesson"),
  principle: text("principle"),
  interceptionRule: text("interception_rule"),
  linkedRuleId: integer("linked_rule_id"),
  exposedWeakness: text("exposed_weakness"), // scope_greed / rush_finish / careless_jump / people_pleasing / impulsive_spending / scattered_focus
  whySystemFailed: text("why_system_failed"), // not_armed / not_opened / checks_too_light / skipped_confirm / rule_missed / other
  nextInterceptionPoint: text("next_interception_point"), // arm_80 / check_90 / before_pay / before_send / before_submit / before_depart / before_commitment
  weaknessTag: text("weakness_tag"),
  pastChoice: text("past_choice"),
  actualCost: text("actual_cost"),
  alternativeChoice: text("alternative_choice"),
  lessonStatement: text("lesson_statement"),
  lessonStatus: text("lesson_status").notNull().default("draft"), // draft / confirmed / superseded / archived
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 11:弱点模式
export const weaknessPatterns = pgTable("weakness_patterns", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  weaknessKey: text("weakness_key").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  triggerSignals: text("trigger_signals"),
  defaultIntervention: text("default_intervention"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 12:弱点触发事件
export const weaknessEvents = pgTable("weakness_events", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  weaknessKey: text("weakness_key").notNull(),
  sourceType: text("source_type").notNull().default("custom"), // task / purchase / relationship / review / confirmation / demand / custom
  sourceId: integer("source_id"),
  triggerReason: text("trigger_reason").notNull(),
  severity: text("severity").notNull().default("low"), // low / medium / high
  recommendedIntervention: text("recommended_intervention"),
  status: text("status").notNull().default("open"), // open / acknowledged / resolved
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 13:需求 / 任务(P0 锁定机制)
export const demands = pgTable("demands", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  title: text("title").notNull(),
  priority: text("priority").notNull().default("P2"), // P0 / P1 / P2
  status: text("status").notNull().default("backlog"), // active / backlog / done
  escalateReason: text("escalate_reason"),
  isKeyFactor: boolean("is_key_factor").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 8:人际关系筛查
export const relationships = pgTable("relationships", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  personName: text("person_name").notNull(),
  relationshipType: text("relationship_type").notNull().default("other"), // teacher / classmate / friend / partner / boss / advisor / family / other
  relationshipStatus: text("relationship_status").notNull().default("normal_contact"), // long_term_maintain / normal_contact / observe_carefully / boundary_needed
  netImpact: text("net_impact").notNull().default("uncertain"), // positive / neutral / negative / uncertain
  careerImpactScore: integer("career_impact_score"),
  workImpactScore: integer("work_impact_score"),
  emotionImpactScore: integer("emotion_impact_score"),
  growthImpactScore: integer("growth_impact_score"),
  reciprocityLevel: text("reciprocity_level").notNull().default("balanced"), // one_way / balanced / mutual_support
  coreNeedHypothesis: text("core_need_hypothesis"),
  sensitivePoints: text("sensitive_points"),
  communicationLandmines: text("communication_landmines"),
  keySignals: text("key_signals"),
  boundaryNotes: text("boundary_notes"),
  nextAction: text("next_action").notNull().default("observe"), // maintain / get_closer / observe / set_boundary / pause
  notes: text("notes"),
  currentStage: text("current_stage").notNull().default("initial_contact"),
  stageConfidence: integer("stage_confidence").notNull().default(0),
  stageRationale: text("stage_rationale"),
  stageConfirmedAt: timestamp("stage_confirmed_at", { withTimezone: true }),
  knownFacts: text("known_facts"),
  unverifiedHypotheses: text("unverified_hypotheses"),
  openQuestions: text("open_questions"),
  preferredLanguage: text("preferred_language"),
  currentContext: text("current_context"),
  seedKey: text("seed_key"),
  lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 9:关系互动记录
export const relationshipInteractions = pgTable("relationship_interactions", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  relationshipId: integer("relationship_id").notNull(),
  interactionDate: timestamp("interaction_date", { withTimezone: true }).notNull().defaultNow(),
  interactionFact: text("interaction_fact").notNull(),
  energyAfter: text("energy_after").notNull().default("calm"), // supported / calm / drained / confused / anxious
  signalType: text("signal_type").notNull().default("unclear"), // support_signal / risk_signal / boundary_signal / opportunity_signal / unclear
  didIPeoplePlease: boolean("did_i_people_please").notNull().default(false),
  didICrossBoundary: boolean("did_i_cross_boundary").notNull().default(false),
  userResponse: text("user_response"),
  nextStep: text("next_step"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 10:人际灰烬备忘录
export const relationshipReviews = pgTable("relationship_reviews", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  relationshipId: integer("relationship_id").notNull(),
  whatHappened: text("what_happened").notNull(),
  ignoredSignal: text("ignored_signal"),
  rushedOrEmotionalPart: text("rushed_or_emotional_part"),
  peoplePleasingPart: text("people_pleasing_part"),
  boundaryCrossed: text("boundary_crossed"),
  possibleCoreNeed: text("possible_core_need"),
  lesson: text("lesson").notNull(),
  principle: text("principle").notNull(),
  interceptionRule: text("interception_rule").notNull(),
  linkedConfirmationRuleId: integer("linked_confirmation_rule_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// 关系阶段判断与沟通闭环
export const relationshipEmotionalStates = pgTable("relationship_emotional_states", {
  id: serial("id").primaryKey(), userId: text("userId").notNull(), relationshipId: integer("relationship_id").notNull(),
  emotion: text("emotion").notNull(), intensity: integer("intensity").notNull(), trigger: text("trigger"), bodyResponse: text("body_response"),
  impulse: text("impulse"), currentNeed: text("current_need"), actionReadiness: text("action_readiness").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const relationshipSignals = pgTable("relationship_signals", {
  id: serial("id").primaryKey(), userId: text("userId").notNull(), relationshipId: integer("relationship_id").notNull(),
  signalKind: text("signal_kind").notNull(), direction: text("direction").notNull(), strength: integer("strength").notNull(),
  content: text("content").notNull(), source: text("source"), occurredAt: timestamp("occurred_at", { withTimezone: true }),
  verificationStatus: text("verification_status").notNull().default("unverified"), verifiedAt: timestamp("verified_at", { withTimezone: true }),
  seedKey: text("seed_key"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const relationshipStageSnapshots = pgTable("relationship_stage_snapshots", {
  id: serial("id").primaryKey(), userId: text("userId").notNull(), relationshipId: integer("relationship_id").notNull(),
  suggestedStage: text("suggested_stage").notNull(), confirmedStage: text("confirmed_stage"), confidence: integer("confidence").notNull(),
  supportingSignalIds: text("supporting_signal_ids"), counterSignalIds: text("counter_signal_ids"), rationale: text("rationale").notNull(),
  confirmedByUser: boolean("confirmed_by_user").notNull().default(false), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const relationshipCommunicationPlans = pgTable("relationship_communication_plans", {
  id: serial("id").primaryKey(), userId: text("userId").notNull(), relationshipId: integer("relationship_id").notNull(),
  goal: text("goal").notNull(), minimalRequest: text("minimal_request").notNull(), boundary: text("boundary").notNull(), avoidTopics: text("avoid_topics"),
  channel: text("channel").notNull(), plannedAt: timestamp("planned_at", { withTimezone: true }), riskLevel: text("risk_level").notNull(),
  preflightChecklist: text("preflight_checklist").notNull(), status: text("status").notNull().default("draft"), sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const relationshipInteractionOutcomes = pgTable("relationship_interaction_outcomes", {
  id: serial("id").primaryKey(), userId: text("userId").notNull(), relationshipId: integer("relationship_id").notNull(), planId: integer("plan_id").notNull().unique(),
  whatHappened: text("what_happened").notNull(), responseObserved: text("response_observed").notNull(), energyAfter: text("energy_after").notNull(),
  boundaryResult: text("boundary_result").notNull(), mainlineImpact: text("mainline_impact"), nextStep: text("next_step"),
  needsAshReview: boolean("needs_ash_review").notNull().default(false), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const relationshipResourceAssessments = pgTable("relationship_resource_assessments", {
  id: serial("id").primaryKey(), userId: text("userId").notNull(), relationshipId: integer("relationship_id").notNull(), resourceId: integer("resource_id").notNull(),
  credibility: integer("credibility").notNull(), manipulationRisk: integer("manipulation_risk").notNull(), stigmaRisk: integer("stigma_risk").notNull(),
  absolutismRisk: integer("absolutism_risk").notNull(), applicableBoundary: text("applicable_boundary").notNull(), actionablePrinciple: text("actionable_principle").notNull(),
  status: text("status").notNull(), reviewAt: timestamp("review_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 6:翻译记录
export const translations = pgTable("translations", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  sourceText: text("source_text").notNull(),
  translatedText: text("translated_text").notNull(),
  targetLanguage: text("target_language").notNull().default("en"),
  usageScene: text("usage_scene").notNull().default("custom"),
  tone: text("tone").notNull().default("formal"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 14:OKR 目标
export const objectives = pgTable("objectives", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"), // active / done / archived
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 15:OKR 关键结果
export const keyResults = pgTable("key_results", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  objectiveId: integer("objective_id").notNull(),
  title: text("title").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 16:树状任务(Objective → KR → Task → Subtask)
// path 采用物化路径(如 "12/45/78"),整树一次查询,避免递归
export const treeTasks = pgTable("tree_tasks", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  parentId: integer("parent_id"),
  rootId: integer("root_id"),
  path: text("path").notNull().default(""),
  level: integer("level").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  status: text("status").notNull().default("todo"), // todo / done
  priority: text("priority").notNull().default("P1"), // P0 / P1 / P2
  weight: integer("weight").notNull().default(1),
  progress: integer("progress").notNull().default(0), // 0-100,由进度引擎自动计算
  progressMode: text("progress_mode").notNull().default("weighted"), // average / weighted(仅根节点生效)
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  keyResultId: integer("key_result_id"),
  objectiveId: integer("objective_id"),
  riskLevel: text("risk_level").notNull().default("low"),
  deadline: timestamp("deadline", { withTimezone: true }),
  collapsed: boolean("collapsed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 17:安全边界卡(稳定高于一切:边界先于投入)
export const executionBoundaries = pgTable("execution_boundaries", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  sourceType: text("source_type").notNull().default("task"), // task / demand / relationship / purchase / project / study / custom
  sourceId: integer("source_id"),
  title: text("title").notNull(),
  minimumDoneStandard: text("minimum_done_standard").notNull(), // 必填 1:最低做到什么程度就够
  standardDoneDefinition: text("standard_done_definition"),
  deepWorkReason: text("deep_work_reason"),
  explicitNonGoals: text("explicit_non_goals"), // 本次明确不做什么
  stopCondition: text("stop_condition").notNull(), // 必填 3:什么时候必须停下来
  timeboxMinutes: integer("timebox_minutes").notNull().default(30), // 10 / 30 / 60 / 90
  informationConfidence: text("information_confidence").notNull().default("unknown"), // high / medium / low / unknown
  opportunityCost: text("opportunity_cost").notNull(), // 必填 2:继续深做会挤占什么
  balanceRisk: text("balance_risk"),
  decision: text("decision").notNull().default("validate_small"), // continue / validate_small / pause / backlog / stop
  status: text("status").notNull().default("active"), // active / completed / stopped / backlogged
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 18:边界检查记录
export const boundaryChecks = pgTable("boundary_checks", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  boundaryId: integer("boundary_id").notNull(),
  currentProgress: text("current_progress"),
  timeSpentMinutes: integer("time_spent_minutes").notNull().default(0),
  evidenceCreated: boolean("evidence_created").notNull().default(false),
  reachedMinimum: boolean("reached_minimum").notNull().default(false),
  crowdingOut: boolean("crowding_out").notNull().default(false),
  emotionDriven: boolean("emotion_driven").notNull().default(false), // 兴奋/贪多/完美主义驱动
  infoInsufficient: boolean("info_insufficient").notNull().default(false),
  isOverExecution: boolean("is_over_execution").notNull().default(false),
  whatIsBeingCrowdedOut: text("what_is_being_crowded_out"),
  recommendation: text("recommendation").notNull().default("continue"), // continue / validate_small / pause / backlog / stop
  reasons: text("reasons"), // 规则引擎给出的理由(换行分隔)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 19:统一卡片(Card Container + Card Item 架构)
// 边界卡/决策卡/风险卡/执行卡/复盘卡/行动卡/Backlog 卡共用一套数据结构,仅以 cardType 区分。
// 新增卡片类型时只需扩展类型配置,不改表结构、不改页面结构。
export const unifiedCards = pgTable("unified_cards", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  cardType: text("card_type").notNull().default("note"), // boundary / decision / risk / execution / review / action / backlog / note
  title: text("title").notNull(),
  content: text("content"),
  status: text("status").notNull().default("active"), // active / done / archived
  priority: text("priority").notNull().default("normal"), // high / normal / low
  sortOrder: integer("sort_order").notNull().default(0),
  contextType: text("context_type"), // 卡片流挂载的实体类型,如 "boundary"
  contextId: integer("context_id"), // 挂载实体 ID
  linkedCardId: integer("linked_card_id"), // 关联上游卡片,形成 边界卡 → 决策卡 → 执行卡 → 复盘卡 链路
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 20:事件案例库主表(事件 → 复盘 → 模式 → 规则 → 资产)
export const eventCases = pgTable("event_cases", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  eventType: text("event_type").notNull().default("lost_item"), // lost_item / almost_lost / decision / consumption / relationship / project / study / sleep / health / custom
  scene: text("scene").notNull().default("custom"), // transportation / gym / restaurant / classroom / library / home / hotel / muay_thai / custom
  status: text("status").notNull().default("searching"), // searching / solved / found / lost / closed
  itemName: text("item_name"),
  moneyLoss: integer("money_loss").notNull().default(0),
  searchMinutes: integer("search_minutes").notNull().default(0),
  tags: text("tags"), // 逗号分隔
  reviewed: boolean("reviewed").notNull().default(false),
  impactLevel: text("impact_level").notNull().default("low"), // low / mid / high
  isRepeat: boolean("is_repeat").notNull().default(false), // 曾经发生过
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 21:五问极简复盘(Root Cause 只能来自用户复盘,不能 AI 推断)
export const eventReviews = pgTable("event_reviews", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  eventId: integer("event_id").notNull(),
  whatHappened: text("what_happened").notNull(), // Q1 发生了什么
  whyNotDiscovered: text("why_not_discovered"), // Q2 为什么没有立即发现
  rootCause: text("root_cause").notNull(), // Q3 真正根因(分类枚举)
  prevention: text("prevention"), // Q4 如何防止
  systemRule: text("system_rule"), // Q5 系统应该记住什么规则
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 22:候选规则(每个案例自动生成,必须链接支撑案例)
export const eventCandidateRules = pgTable("event_candidate_rules", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  ruleText: text("rule_text").notNull(),
  scene: text("scene"),
  status: text("status").notNull().default("candidate"), // candidate / active / archived / rejected
  effectiveness: integer("effectiveness").notNull().default(0), // 验证次数
  rootCause: text("root_cause"),
  sourceCaseId: integer("source_case_id"), // 支撑案例
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// ─────────────────────────────────────────────
// 高额支出与负面状态决策拦截系统(决策拦截台)
// 规则驱动、不接入 AI;Markdown 导出 → 外部 GPT 审核 → 手动回写
// ─────────────────────────────────────────────

// 表 23:支出审核主表
export const spendingReviews = pgTable("spending_reviews", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull().default("other"), // entertainment / emotional / intimacy / ai_tool / software / course / dining / travel / shopping / subscription / other
  amount: integer("amount").notNull().default(0), // 单位:元
  currency: text("currency").notNull().default("CNY"),
  isSubscription: boolean("is_subscription").notNull().default(false),
  billingCycle: text("billing_cycle"), // monthly / yearly / one_time
  autoRenew: boolean("auto_renew").notNull().default(false),
  refundable: boolean("refundable"),
  reversible: boolean("reversible"),
  decisionTime: timestamp("decision_time", { withTimezone: true }),
  timeRiskLevel: text("time_risk_level"), // normal / elevated / severe
  currentStates: text("current_states"), // 逗号分隔多选:normal/tired/sleep_deprived/lonely/anxious/confused/emotionally_unstable/strong_impulse/want_fast_result/fear_of_missing_out/want_to_escape_task/overloaded
  impulseLevel: integer("impulse_level").notNull().default(0), // 1-10
  sleepStatus: text("sleep_status"), // enough / not_enough / unknown
  fundingSource: text("funding_source").notNull().default("budget"), // budget / living_expense / health_budget / tuition / emergency_fund / credit / other_person / unknown
  monthlyBudgetRemaining: integer("monthly_budget_remaining"),
  usesLivingExpense: boolean("uses_living_expense").notNull().default(false),
  usesHealthBudget: boolean("uses_health_budget").notNull().default(false),
  usesTuition: boolean("uses_tuition").notNull().default(false),
  usesEmergencyFund: boolean("uses_emergency_fund").notNull().default(false),
  usesCredit: boolean("uses_credit").notNull().default(false),
  realNeed: text("real_need"),
  problemToSolve: text("problem_to_solve"),
  consequenceIfNotBuy: text("consequence_if_not_buy"),
  emotionalRelief: boolean("emotional_relief").notNull().default(false),
  taskAvoidance: boolean("task_avoidance").notNull().default(false),
  alternatives: text("alternatives"),
  currentMainline: text("current_mainline"),
  affectsSleep: boolean("affects_sleep").notNull().default(false),
  affectsCourse: boolean("affects_course").notNull().default(false),
  affectsDashboard: boolean("affects_dashboard").notNull().default(false),
  affectsAlgorithm: boolean("affects_algorithm").notNull().default(false),
  affectsAiCourse: boolean("affects_ai_course").notNull().default(false),
  affectsPmLearning: boolean("affects_pm_learning").notNull().default(false),
  affectsTraining: boolean("affects_training").notNull().default(false),
  affectsBudget: boolean("affects_budget").notNull().default(false),
  riskLevel: text("risk_level"), // low / medium / high / critical
  riskTriggers: text("risk_triggers"), // 逗号分隔触发规则
  decisionStatus: text("decision_status").notNull().default("draft"), // draft / cooling / awaiting_gpt / awaiting_final / cancelled / delayed / reduced / confirmed / paid
  coolingUntil: timestamp("cooling_until", { withTimezone: true }),
  systemRecommendation: text("system_recommendation"), // cancel / delay / reduce_or_replace / manual_confirmation / record_only
  finalDecision: text("final_decision"), // cancel / delay / reduce_or_replace / confirm_pay
  finalDecisionReason: text("final_decision_reason"),
  paymentCompleted: boolean("payment_completed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 24:AI / 软件 / 课程工具专项审查
export const toolPurchaseChecks = pgTable("tool_purchase_checks", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  spendingReviewId: integer("spending_review_id").notNull(),
  toolName: text("tool_name"),
  useCaseNext7Days: text("use_case_next_7_days"),
  expectedUsageCount: integer("expected_usage_count"),
  existingTools: text("existing_tools"),
  overlapDescription: text("overlap_description"),
  currentQuotaRemaining: text("current_quota_remaining"),
  expectedOutput: text("expected_output"),
  canContinueWithoutPurchase: boolean("can_continue_without_purchase"),
  anxietyDriven: boolean("anxiety_driven").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 25:最佳状态决策协议(理性人格基准)
export const decisionBaselines = pgTable("decision_baselines", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  title: text("title").notNull().default("最佳状态决策协议"),
  coreAbilities: text("core_abilities"),
  financialRules: text("financial_rules"),
  healthRules: text("health_rules"),
  mainlineRules: text("mainline_rules"),
  sleepRules: text("sleep_rules"),
  toolPurchaseRules: text("tool_purchase_rules"),
  decisionProcess: text("decision_process"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 26:Markdown 导出记录
export const spendingReviewExports = pgTable("spending_review_exports", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  spendingReviewId: integer("spending_review_id").notNull(),
  markdownContent: text("markdown_content").notNull(),
  exportedAt: timestamp("exported_at", { withTimezone: true }).notNull().defaultNow(),
  submittedToGpt: boolean("submitted_to_gpt").notNull().default(false),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
})

// 表 27:外部 GPT 审核结果(手动回写)
export const externalReviewResults = pgTable("external_review_results", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  spendingReviewId: integer("spending_review_id").notNull(),
  reviewerType: text("reviewer_type").notNull().default("gpt"),
  conclusion: text("conclusion"), // cancel / delay / reduce_or_replace / manual_confirmation
  mainReason: text("main_reason"),
  risks: text("risks"),
  alternatives: text("alternatives"),
  suggestedCoolingPeriod: text("suggested_cooling_period"),
  rawResponse: text("raw_response"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 28:主线回归最小动作
export const decisionRecoveryActions = pgTable("decision_recovery_actions", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  spendingReviewId: integer("spending_review_id"),
  mainlineType: text("mainline_type").notNull().default("dashboard"), // dashboard / algorithm / ai_course / pm_learning / body_recovery
  actionTitle: text("action_title").notNull(),
  actionDescription: text("action_description"),
  evidenceType: text("evidence_type"), // note / summary / code / sleep_prep
  evidenceText: text("evidence_text"),
  status: text("status").notNull().default("pending"), // pending / done
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 29:事后复盘(通向灰烬备忘录)
export const spendingPostmortems = pgTable("spending_reviews_postmortem", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  spendingReviewId: integer("spending_review_id").notNull(),
  actualAmount: integer("actual_amount"),
  actualTimeMinutes: integer("actual_time_minutes"),
  regretLevel: integer("regret_level"), // 0-10
  actualUsage: text("actual_usage"),
  affectedMainline: text("affected_mainline"),
  ignoredRisk: text("ignored_risk"),
  lesson: text("lesson"),
  principle: text("principle"),
  interceptionRule: text("interception_rule"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ─────────────────────────────────────────────
// 资源配置与资产转化系统(资源配置台)
// 规则驱动、人工判断、轻量录入、不接入 AI
// 遵循项目约定:serial 主键 + text userId,引用列不加外键约束
// ─────────────────────────────────────────────

// 表 30:平台职责配置
export const resourcePlatforms = pgTable("resource_platforms", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  primaryRole: text("primary_role").notNull(), // 唯一主要职责
  excludedRoles: text("excluded_roles"), // 不承担的职责
  resourceTypes: text("resource_types"), // 逗号分隔适用资源类型
  isPrimary: boolean("is_primary").notNull().default(false),
  status: text("status").notNull().default("active"), // active / frozen
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 31:资源主表
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  resourceType: text("resource_type").notNull(), // content / tool / people / time / finance / cognitive_asset
  domain: text("domain").notNull().default("other"), // 所属领域
  status: text("status").notNull().default("pending_review"), // active/trial/frozen/archived/removal_pending/removed/exhausted/pending_review
  platformId: integer("platform_id"),
  mainline: text("mainline"), // 服务主线
  responsibility: text("responsibility"), // 资源职责
  locationUrl: text("location_url"),
  localPath: text("local_path"),
  purchaseCost: integer("purchase_cost"),
  currency: text("currency").notNull().default("CNY"),
  storageSizeMb: integer("storage_size_mb"),
  isReplaceable: boolean("is_replaceable").notNull().default(true),
  isDuplicate: boolean("is_duplicate").notNull().default(false),
  nextAction: text("next_action"), // 下一次使用动作
  nextUseAt: timestamp("next_use_at", { withTimezone: true }),
  expectedOutput: text("expected_output"), // 预期成果
  conversionLevel: integer("conversion_level").notNull().default(0), // L0-L5
  reviewAt: timestamp("review_at", { withTimezone: true }), // 复审日期
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  usageCount: integer("usage_count").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 32:资源成果证据
export const resourceEvidence = pgTable("resource_evidence", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  resourceId: integer("resource_id").notNull(),
  evidenceType: text("evidence_type").notNull().default("note"), // note/article/solution/code/demo/prd/report/feature/recording/presentation
  title: text("title"),
  content: text("content"),
  externalUrl: text("external_url"),
  conversionLevel: integer("conversion_level"), // 本次证据对应层级 L1-L5
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 33:资源外部关联(人工索引)
export const resourceLinks = pgTable("resource_links", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  resourceId: integer("resource_id").notNull(),
  linkedType: text("linked_type").notNull(), // task/course/okr/model_tree_note/obsidian_note/flomo_note/ash_memo/growth_archive/project/custom
  linkedId: integer("linked_id"),
  externalTitle: text("external_title"),
  externalPlatform: text("external_platform"),
  externalUrl: text("external_url"),
  keywords: text("keywords"), // 逗号分隔关键词标签
  linkReason: text("link_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 34:资源复盘(使用后三问 / 闲置复盘)
export const resourceReviews = pgTable("resource_reviews", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  resourceId: integer("resource_id").notNull(),
  actualUsage: text("actual_usage"), // 实际使用了什么
  outputCreated: text("output_created"), // 产生了什么结果
  unusedReason: text("unused_reason"), // 为什么没有使用
  managementCost: text("management_cost"), // 管理成本
  nextStatus: text("next_status"), // 继续/冻结/归档/退出
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
  reflection: text("reflection"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 35:人脉资源
export const peopleResources = pgTable("people_resources", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  personName: text("person_name").notNull(),
  relationshipType: text("relationship_type"), // 专业指导/老师/学习伙伴/技术导师/协作者/信息提供/机会连接/长期关系/其他
  domain: text("domain"),
  relationshipStage: text("relationship_stage").notNull().default("initial_contact"),
  availableHelp: text("available_help"), // 可提供的帮助
  valueICanOffer: text("value_i_can_offer"), // 我能提供的价值
  suitableTopics: text("suitable_topics"),
  unsuitableTopics: text("unsuitable_topics"),
  suggestedFrequency: text("suggested_frequency"),
  lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
  monthlyContactCount: integer("monthly_contact_count").notNull().default(0),
  interactionStatus: text("interaction_status").notNull().default("normal"), // 可正常联系等 9 种状态
  nextContactAt: timestamp("next_contact_at", { withTimezone: true }),
  boundaryNotes: text("boundary_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 36:核心诉求假设(必须待验证,不能写成事实)
export const personNeedHypotheses = pgTable("person_need_hypotheses", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  personId: integer("person_id").notNull(),
  needType: text("need_type"), // 效率/明确结果/经济收益/降低风险/获得认可等
  hypothesis: text("hypothesis").notNull(),
  evidence: text("evidence"),
  confidence: text("confidence").notNull().default("low"), // low / medium / high
  validationQuestion: text("validation_question"),
  status: text("status").notNull().default("active"), // active / revised / removed
  lastValidatedAt: timestamp("last_validated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 37:单次沟通计划
export const communicationPlans = pgTable("communication_plans", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  personId: integer("person_id").notNull(),
  communicationGoal: text("communication_goal").notNull(),
  maxProgressGoal: text("max_progress_goal"), // 本次最多推进到哪一步
  communicationType: text("communication_type"), // 建立联系/请求帮助等 11 种
  communicationChannel: text("communication_channel"), // 微信文字/语音/电话等
  coreMessage: text("core_message"),
  firstMessage: text("first_message"), // 先说什么
  laterMessage: text("later_message"), // 后说什么
  topicsToAvoid: text("topics_to_avoid"),
  informationToShare: text("information_to_share"),
  informationToWithhold: text("information_to_withhold"),
  expectedNextAction: text("expected_next_action"), // 希望对方采取的下一步
  backupPlan: text("backup_plan"),
  // 调用前检查
  triedAlready: text("tried_already"), // 我已经尝试了什么
  materialsPrepared: text("materials_prepared"),
  whyMustAsk: text("why_must_ask"), // 为什么必须向这个人询问
  // 资源投入
  resourcesToInvest: text("resources_to_invest"),
  estimatedMinutes: integer("estimated_minutes"),
  investmentLimit: text("investment_limit"), // 最大投入上限
  valueToOffer: text("value_to_offer"),
  unavailableResources: text("unavailable_resources"), // 我不能承诺的事项
  investmentNature: text("investment_nature"), // 正常互惠/讨好型投入风险/超出承受范围等
  mainlineImpact: text("mainline_impact"),
  // 沟通节奏
  contactAt: timestamp("contact_at", { withTimezone: true }),
  replyWaitUntil: timestamp("reply_wait_until", { withTimezone: true }),
  nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
  followUpLimit: integer("follow_up_limit").notNull().default(1),
  advanceCondition: text("advance_condition"),
  pauseCondition: text("pause_condition"),
  status: text("status").notNull().default("draft"), // draft / ready / executed / closed
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 38:沟通结果验收
export const communicationResults = pgTable("communication_results", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  communicationPlanId: integer("communication_plan_id").notNull(),
  actualContactAt: timestamp("actual_contact_at", { withTimezone: true }),
  actualResourcesInvested: text("actual_resources_invested"),
  confirmedCoreNeed: text("confirmed_core_need"), // 对方真正关注点
  hypothesisResult: text("hypothesis_result"), // kept / revised / removed
  keyInformation: text("key_information"), // 获得的结论
  outcomeStatus: text("outcome_status"), // 目标达成/部分达成/获得重要信息/排除错误方向等 9 种
  nextAction: text("next_action"),
  nextContactAt: timestamp("next_contact_at", { withTimezone: true }),
  feedbackRequired: boolean("feedback_required").notNull().default(false),
  feedbackCompleted: boolean("feedback_completed").notNull().default(false),
  worthContinuing: boolean("worth_continuing"),
  mainlineImpact: text("mainline_impact"),
  reflection: text("reflection"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 39:消费参照物(等价换算锚点 + 历史消费记录)
// preset:预设参照物(如 Cursor 月费);history:用户填写的真实历史消费
export const spendingAnchors = pgTable("spending_anchors", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  name: text("name").notNull(), // 如 "Cursor 会员" / "一顿大餐"
  priceCny: integer("price_cny").notNull(), // 单价(人民币,整数元)
  unitLabel: text("unit_label").notNull().default("1 份"), // 如 "1 个月" / "15 张" / "半个月额度"
  sourceType: text("source_type").notNull().default("preset"), // preset / history
  category: text("category"), // ai_tool / dining / subscription / shopping / other
  purchasedAt: timestamp("purchased_at", { withTimezone: true }), // 历史消费的实际付款日期
  productNote: text("product_note"), // 历史消费:买了什么、用得怎么样
  isActive: boolean("is_active").notNull().default(true), // 是否参与换算
  // ↓ 消费价值换算(/convert)扩展:同一张目录表,不另建第二套参照物
  billingType: text("billing_type").notNull().default("single_unit"), // subscription / credit_pack / single_unit / range_unit
  currency: text("currency").notNull().default("CNY"), // CNY / USD / THB
  priceMinor: integer("price_minor").notNull().default(0), // 原始币种最小单位(分)
  maxPriceMinor: integer("max_price_minor"), // 仅区间单价:上限
  sortOrder: integer("sort_order").notNull().default(0),
  sourceNote: text("source_note"), // 价格来源备注(用户录入,未自动核验)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 46:消费价值换算记录(快照不可变;保护金额与实际转向分离)
export const spendConversions = pgTable("spend_conversions", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  eventCaseId: integer("event_case_id"), // 关联 event_cases.id
  ruleId: integer("rule_id"), // 关联 confirmation_rules.id
  decisionStage: text("decision_stage").notNull(), // considering / spent
  privacyLabel: text("privacy_label").notNull().default("私密消费"), // 中性显示标签
  sensitiveLabel: text("sensitive_label"), // 仅详情按偏好显示
  inputCurrency: text("input_currency").notNull().default("CNY"),
  plannedAmountMinor: integer("planned_amount_minor").notNull(),
  inputToCnyRate: text("input_to_cny_rate").notNull().default("1.000000"), // 定点小数字符串
  snapshotJson: text("snapshot_json").notNull(), // 写入后不可更新
  cooldownMinutes: integer("cooldown_minutes"),
  cooldownEndsAt: timestamp("cooldown_ends_at", { withTimezone: true }),
  minimumAction: text("minimum_action"),
  resolution: text("resolution"), // avoided / partial / spent / unknown
  actualAmountMinor: integer("actual_amount_minor"),
  protectedAmountMinor: integer("protected_amount_minor").notNull().default(0), // 服务端派生
  redirectedAmountMinor: integer("redirected_amount_minor").notNull().default(0), // 用户明确确认
  redirectTarget: text("redirect_target"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 47:换算偏好(单用户一行:汇率、默认冷静期、高影响阈值、隐私模式)
export const conversionPreferences = pgTable("conversion_preferences", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  usdToCnyRate: text("usd_to_cny_rate").notNull().default("7.000000"),
  defaultCooldownMinutes: integer("default_cooldown_minutes").notNull().default(120),
  highImpactThresholdMinor: integer("high_impact_threshold_minor").notNull().default(100000),
  defaultCatalogItemIdsJson: text("default_catalog_item_ids_json").notNull().default("[]"),
  privacyMode: text("privacy_mode").notNull().default("neutral"), // neutral / explicit
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 40:用户界面偏好(导航排序等,key-value)
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  prefKey: text("pref_key").notNull(),
  prefValue: text("pref_value").notNull(), // JSON 字符串
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// ─────────────────────────────────────────────
// 娱乐闭环(P0):开始会话 → 结束评估 → ��盘沉淀
// ─────────────────────────────────────────────
export const entertainmentSessions = pgTable("entertainment_sessions", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  title: text("title").notNull(),
  entertainmentType: text("entertainment_type").notNull(),
  plannedMinutes: integer("planned_minutes").notNull(),
  plannedBudgetCny: integer("planned_budget_cny").notNull().default(0),
  boundaryNote: text("boundary_note"),
  preState: text("pre_state"),
  purpose: text("purpose"),
  mainline: text("mainline"),
  plannedQuantity: integer("planned_quantity"),
  quantityUnit: text("quantity_unit"),
  latestEndAt: timestamp("latest_end_at", { withTimezone: true }),
  nextAction: text("next_action"),
  reminderLevel: text("reminder_level"),
  riskLevel: text("risk_level"),
  ticktickTitle: text("ticktick_title"),
  ticktickBody: text("ticktick_body"),
  ticktickChecklist: text("ticktick_checklist"),
  ticktickCopiedAt: timestamp("ticktick_copied_at", { withTimezone: true }),
  status: text("status").notNull().default("active"), // active / ended / assessed / reviewed / abandoned
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const entertainmentAssessments = pgTable("entertainment_assessments", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  sessionId: integer("session_id").notNull().unique(),
  actualMinutes: integer("actual_minutes").notNull(),
  actualCostCny: integer("actual_cost_cny").notNull().default(0),
  recoveredEnergy: integer("recovered_energy").notNull(), // 0-10
  emotionAfter: integer("emotion_after").notNull(), // 0-10
  didStopOnTime: boolean("did_stop_on_time").notNull(),
  didStayInBudget: boolean("did_stay_in_budget").notNull(),
  delayedMainline: boolean("delayed_mainline").notNull(),
  regretLevel: integer("regret_level").notNull(), // 0-10
  actualGain: text("actual_gain"),
  nextRecoveryAction: text("next_recovery_action"),
  actualStartedAt: timestamp("actual_started_at", { withTimezone: true }),
  actualEndedAt: timestamp("actual_ended_at", { withTimezone: true }),
  actualQuantity: integer("actual_quantity"),
  overtimeMinutes: integer("overtime_minutes").notNull().default(0),
  autoplayOccurred: boolean("autoplay_occurred").notNull().default(false),
  learningScore: integer("learning_score").notNull().default(0),
  learningSummary: text("learning_summary"),
  learningApplication: text("learning_application"),
  stateChange: text("state_change"),
  stopDifficulty: integer("stop_difficulty").notNull().default(0),
  contentSatisfaction: integer("content_satisfaction").notNull().default(5),
  timeSatisfaction: integer("time_satisfaction").notNull().default(5),
  stopSatisfaction: integer("stop_satisfaction").notNull().default(5),
  stateSatisfaction: integer("state_satisfaction").notNull().default(5),
  decisionSatisfaction: integer("decision_satisfaction").notNull().default(5),
  satisfactionAverage: integer("satisfaction_average").notNull().default(5),
  mainlineHelpScore: integer("mainline_help_score").notNull().default(0),
  nextActionStarted: boolean("next_action_started").notNull().default(false),
  nextActionStartedAt: timestamp("next_action_started_at", { withTimezone: true }),
  nextActionType: text("next_action_type"),
  nextActionEvidence: text("next_action_evidence"),
  conversionResult: text("conversion_result"),
  stopDifficultyReason: text("stop_difficulty_reason"),
  rationalization: text("rationalization"),
  sleepImpact: text("sleep_impact"),
  nextDayImpact: text("next_day_impact"),
  satisfiedPart: text("satisfied_part"),
  unsatisfiedPart: text("unsatisfied_part"),
  mainlineResult: text("mainline_result"),
  resultLevel: text("result_level").notNull(), // healthy / mixed / harmful
  score: integer("score").notNull(), // 0-100
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const entertainmentReflections = pgTable("entertainment_reflections", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  sessionId: integer("session_id").notNull().unique(),
  factSummary: text("fact_summary").notNull(),
  trigger: text("trigger"),
  lesson: text("lesson").notNull(),
  principle: text("principle"),
  candidateRule: text("candidate_rule"),
  saveToAsh: boolean("save_to_ash").notNull().default(false),
  saveToRuleLibrary: boolean("save_to_rule_library").notNull().default(false),
  ashMemoId: integer("ash_memo_id"),
  confirmationRuleId: integer("confirmation_rule_id"),
  gptReviewPrompt: text("gpt_review_prompt"),
  gptReviewResult: text("gpt_review_result"),
  gptResultStatus: text("gpt_result_status").notNull().default("pending"),
  gptConversationUrl: text("gpt_conversation_url"),
  gptSummary: text("gpt_summary"),
  gptClassification: text("gpt_classification"),
  lossOfControlPoint: text("loss_of_control_point"),
  identifiedRealNeed: text("identified_real_need"),
  userConfirmedInsight: text("user_confirmed_insight"),
  nextMinimalAdjustment: text("next_minimal_adjustment"),
  markdownSnapshot: text("markdown_snapshot"),
  markdownGeneratedAt: timestamp("markdown_generated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// ─────────────────────────────────────────────
// 熵减系统:节律日志 + 有效寿命日志
// ─────────────────────────────────────────────

// 表 44:节律日志(每天一条,记录入睡/起床/疲劳/质量与模式使用)
export const rhythmLogs = pgTable("rhythm_logs", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD(本地日期)
  sleepTime: text("sleep_time"), // HH:mm 昨晚入睡
  wakeTime: text("wake_time"), // HH:mm 起床
  fatigueLevel: integer("fatigue_level"), // 1-10
  nightModeUsed: boolean("night_mode_used").notNull().default(false),
  morningModeUsed: boolean("morning_mode_used").notNull().default(false),
  qualityScore: integer("quality_score"), // 0-100 主观专注质量分
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// 表 45:有效寿命日志(每天一条,质量�� → 有效天数增量快照)
export const lifespanLogs = pgTable("lifespan_logs", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  qualityScore: integer("quality_score").notNull().default(0), // 0-100
  effectiveDaysX100: integer("effective_days_x100").notNull().default(0), // ×100 存整数,避免浮点
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export type CriticalConfirmation = typeof criticalConfirmations.$inferSelect
export type ConfirmationItem = typeof confirmationItems.$inferSelect
export type ConfirmationEvidenceRecord = typeof confirmationEvidence.$inferSelect
export type MistakeReview = typeof mistakeReviews.$inferSelect
export type ConfirmationRule = typeof confirmationRules.$inferSelect
export type MindRegulationSession = typeof mindRegulationSessions.$inferSelect
export type MindRegulationReview = typeof mindRegulationReviews.$inferSelect
export type MindPrinciple = typeof mindPrinciples.$inferSelect
export type InterventionRuleVersion = typeof interventionRuleVersions.$inferSelect
export type TriggerSession = typeof triggerSessions.$inferSelect
export type ChoiceValidation = typeof choiceValidations.$inferSelect
export type TranslationRecord = typeof translations.$inferSelect
export type AshMemo = typeof ashMemos.$inferSelect
export type Relationship = typeof relationships.$inferSelect
export type RelationshipInteraction = typeof relationshipInteractions.$inferSelect
export type RelationshipReview = typeof relationshipReviews.$inferSelect
export type WeaknessPattern = typeof weaknessPatterns.$inferSelect
export type WeaknessEvent = typeof weaknessEvents.$inferSelect
export type Demand = typeof demands.$inferSelect
export type Objective = typeof objectives.$inferSelect
export type KeyResult = typeof keyResults.$inferSelect
export type TreeTask = typeof treeTasks.$inferSelect
export type ExecutionBoundary = typeof executionBoundaries.$inferSelect
export type BoundaryCheck = typeof boundaryChecks.$inferSelect
export type UnifiedCard = typeof unifiedCards.$inferSelect
export type EventCase = typeof eventCases.$inferSelect
export type EventReview = typeof eventReviews.$inferSelect
export type EventCandidateRule = typeof eventCandidateRules.$inferSelect
export type SpendingReview = typeof spendingReviews.$inferSelect
export type ToolPurchaseCheck = typeof toolPurchaseChecks.$inferSelect
export type DecisionBaseline = typeof decisionBaselines.$inferSelect
export type SpendingReviewExport = typeof spendingReviewExports.$inferSelect
export type ExternalReviewResult = typeof externalReviewResults.$inferSelect
export type DecisionRecoveryAction = typeof decisionRecoveryActions.$inferSelect
export type SpendingPostmortem = typeof spendingPostmortems.$inferSelect
export type ResourcePlatform = typeof resourcePlatforms.$inferSelect
export type Resource = typeof resources.$inferSelect
export type ResourceEvidence = typeof resourceEvidence.$inferSelect
export type ResourceLink = typeof resourceLinks.$inferSelect
export type ResourceReview = typeof resourceReviews.$inferSelect
export type PersonResource = typeof peopleResources.$inferSelect
export type PersonNeedHypothesis = typeof personNeedHypotheses.$inferSelect
export type CommunicationPlan = typeof communicationPlans.$inferSelect
export type CommunicationResult = typeof communicationResults.$inferSelect
export type SpendingAnchor = typeof spendingAnchors.$inferSelect
export type SpendConversion = typeof spendConversions.$inferSelect
export type ConversionPreference = typeof conversionPreferences.$inferSelect
export type EntertainmentSession = typeof entertainmentSessions.$inferSelect
export type EntertainmentAssessment = typeof entertainmentAssessments.$inferSelect
export type EntertainmentReflection = typeof entertainmentReflections.$inferSelect
export type RhythmLog = typeof rhythmLogs.$inferSelect
export type LifespanLog = typeof lifespanLogs.$inferSelect
