CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ash_memos" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"confirmation_id" integer,
	"title" text,
	"what_happened" text,
	"cost" text,
	"skipped_reason" text,
	"ignored_fact" text,
	"lesson" text,
	"principle" text,
	"interception_rule" text,
	"linked_rule_id" integer,
	"exposed_weakness" text,
	"why_system_failed" text,
	"next_interception_point" text,
	"weakness_tag" text,
	"past_choice" text,
	"actual_cost" text,
	"alternative_choice" text,
	"lesson_statement" text,
	"lesson_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boundary_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"boundary_id" integer NOT NULL,
	"current_progress" text,
	"time_spent_minutes" integer DEFAULT 0 NOT NULL,
	"evidence_created" boolean DEFAULT false NOT NULL,
	"reached_minimum" boolean DEFAULT false NOT NULL,
	"crowding_out" boolean DEFAULT false NOT NULL,
	"emotion_driven" boolean DEFAULT false NOT NULL,
	"info_insufficient" boolean DEFAULT false NOT NULL,
	"is_over_execution" boolean DEFAULT false NOT NULL,
	"what_is_being_crowded_out" text,
	"recommendation" text DEFAULT 'continue' NOT NULL,
	"reasons" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "choice_validations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"trigger_session_id" integer NOT NULL,
	"expected_outcome" text,
	"actual_outcome" text NOT NULL,
	"cost_delta" integer DEFAULT 0 NOT NULL,
	"emotion_delta" integer DEFAULT 0 NOT NULL,
	"decision_quality" text NOT NULL,
	"rule_helpfulness" text NOT NULL,
	"followup_action" text DEFAULT 'none' NOT NULL,
	"validated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "choice_validations_trigger_session_id_unique" UNIQUE("trigger_session_id")
);
--> statement-breakpoint
CREATE TABLE "communication_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"person_id" integer NOT NULL,
	"communication_goal" text NOT NULL,
	"max_progress_goal" text,
	"communication_type" text,
	"communication_channel" text,
	"core_message" text,
	"first_message" text,
	"later_message" text,
	"topics_to_avoid" text,
	"information_to_share" text,
	"information_to_withhold" text,
	"expected_next_action" text,
	"backup_plan" text,
	"tried_already" text,
	"materials_prepared" text,
	"why_must_ask" text,
	"resources_to_invest" text,
	"estimated_minutes" integer,
	"investment_limit" text,
	"value_to_offer" text,
	"unavailable_resources" text,
	"investment_nature" text,
	"mainline_impact" text,
	"contact_at" timestamp with time zone,
	"reply_wait_until" timestamp with time zone,
	"next_follow_up_at" timestamp with time zone,
	"follow_up_limit" integer DEFAULT 1 NOT NULL,
	"advance_condition" text,
	"pause_condition" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communication_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"communication_plan_id" integer NOT NULL,
	"actual_contact_at" timestamp with time zone,
	"actual_resources_invested" text,
	"confirmed_core_need" text,
	"hypothesis_result" text,
	"key_information" text,
	"outcome_status" text,
	"next_action" text,
	"next_contact_at" timestamp with time zone,
	"feedback_required" boolean DEFAULT false NOT NULL,
	"feedback_completed" boolean DEFAULT false NOT NULL,
	"worth_continuing" boolean,
	"mainline_impact" text,
	"reflection" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "confirmation_evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"confirmation_id" integer NOT NULL,
	"evidence_type" text DEFAULT 'note' NOT NULL,
	"evidence_text" text,
	"screenshot_url" text,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "confirmation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"confirmation_id" integer NOT NULL,
	"item_text" text NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"is_checked" boolean DEFAULT false NOT NULL,
	"confirmation_round" integer DEFAULT 1 NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "confirmation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"domain" text DEFAULT 'custom' NOT NULL,
	"scenario" text,
	"rule_text" text NOT NULL,
	"principle_text" text,
	"trigger_condition" text,
	"source_review_id" integer,
	"is_active" boolean DEFAULT false NOT NULL,
	"final_action_type" text,
	"likely_mistake_keywords" text,
	"current_state_trigger" text,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"source_type" text DEFAULT 'review' NOT NULL,
	"weakness_key" text,
	"rule_priority" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"trigger_text" text,
	"recommended_action" text,
	"source_id" integer,
	"match_count" integer DEFAULT 0 NOT NULL,
	"acted_count" integer DEFAULT 0 NOT NULL,
	"validated_count" integer DEFAULT 0 NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"last_matched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversion_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"usd_to_cny_rate" text DEFAULT '7.000000' NOT NULL,
	"default_cooldown_minutes" integer DEFAULT 120 NOT NULL,
	"high_impact_threshold_minor" integer DEFAULT 100000 NOT NULL,
	"default_catalog_item_ids_json" text DEFAULT '[]' NOT NULL,
	"privacy_mode" text DEFAULT 'neutral' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "critical_confirmations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"domain" text DEFAULT 'custom' NOT NULL,
	"scenario" text,
	"event_time" timestamp with time zone,
	"deadline" timestamp with time zone,
	"location_or_platform" text,
	"target_person" text,
	"risk_level" text DEFAULT 'low' NOT NULL,
	"cost_if_failed" text,
	"likely_mistake" text,
	"final_check_focus" text,
	"evidence_required" boolean DEFAULT false NOT NULL,
	"mistake_history" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"final_action_type" text DEFAULT 'custom' NOT NULL,
	"current_state" text DEFAULT 'normal' NOT NULL,
	"backup_path" text,
	"is_quick_check" boolean DEFAULT false NOT NULL,
	"armed_at" timestamp with time zone,
	"checked_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_baselines" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text DEFAULT '最佳状态决策协议' NOT NULL,
	"core_abilities" text,
	"financial_rules" text,
	"health_rules" text,
	"mainline_rules" text,
	"sleep_rules" text,
	"tool_purchase_rules" text,
	"decision_process" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_recovery_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"spending_review_id" integer,
	"mainline_type" text DEFAULT 'dashboard' NOT NULL,
	"action_title" text NOT NULL,
	"action_description" text,
	"evidence_type" text,
	"evidence_text" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demands" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"priority" text DEFAULT 'P2' NOT NULL,
	"status" text DEFAULT 'backlog' NOT NULL,
	"escalate_reason" text,
	"is_key_factor" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entertainment_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"session_id" integer NOT NULL,
	"actual_minutes" integer NOT NULL,
	"actual_cost_cny" integer DEFAULT 0 NOT NULL,
	"recovered_energy" integer NOT NULL,
	"emotion_after" integer NOT NULL,
	"did_stop_on_time" boolean NOT NULL,
	"did_stay_in_budget" boolean NOT NULL,
	"delayed_mainline" boolean NOT NULL,
	"regret_level" integer NOT NULL,
	"actual_gain" text,
	"next_recovery_action" text,
	"actual_started_at" timestamp with time zone,
	"actual_ended_at" timestamp with time zone,
	"actual_quantity" integer,
	"overtime_minutes" integer DEFAULT 0 NOT NULL,
	"autoplay_occurred" boolean DEFAULT false NOT NULL,
	"learning_score" integer DEFAULT 0 NOT NULL,
	"learning_summary" text,
	"learning_application" text,
	"state_change" text,
	"stop_difficulty" integer DEFAULT 0 NOT NULL,
	"content_satisfaction" integer DEFAULT 5 NOT NULL,
	"time_satisfaction" integer DEFAULT 5 NOT NULL,
	"stop_satisfaction" integer DEFAULT 5 NOT NULL,
	"state_satisfaction" integer DEFAULT 5 NOT NULL,
	"decision_satisfaction" integer DEFAULT 5 NOT NULL,
	"satisfaction_average" integer DEFAULT 5 NOT NULL,
	"mainline_help_score" integer DEFAULT 0 NOT NULL,
	"next_action_started" boolean DEFAULT false NOT NULL,
	"next_action_started_at" timestamp with time zone,
	"next_action_type" text,
	"next_action_evidence" text,
	"conversion_result" text,
	"stop_difficulty_reason" text,
	"rationalization" text,
	"sleep_impact" text,
	"next_day_impact" text,
	"satisfied_part" text,
	"unsatisfied_part" text,
	"mainline_result" text,
	"result_level" text NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entertainment_assessments_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "entertainment_reflections" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"session_id" integer NOT NULL,
	"fact_summary" text NOT NULL,
	"trigger" text,
	"lesson" text NOT NULL,
	"principle" text,
	"candidate_rule" text,
	"save_to_ash" boolean DEFAULT false NOT NULL,
	"save_to_rule_library" boolean DEFAULT false NOT NULL,
	"ash_memo_id" integer,
	"confirmation_rule_id" integer,
	"gpt_review_prompt" text,
	"gpt_review_result" text,
	"gpt_result_status" text DEFAULT 'pending' NOT NULL,
	"gpt_conversation_url" text,
	"gpt_summary" text,
	"gpt_classification" text,
	"loss_of_control_point" text,
	"identified_real_need" text,
	"user_confirmed_insight" text,
	"next_minimal_adjustment" text,
	"markdown_snapshot" text,
	"markdown_generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entertainment_reflections_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "entertainment_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"entertainment_type" text NOT NULL,
	"planned_minutes" integer NOT NULL,
	"planned_budget_cny" integer DEFAULT 0 NOT NULL,
	"boundary_note" text,
	"pre_state" text,
	"purpose" text,
	"mainline" text,
	"planned_quantity" integer,
	"quantity_unit" text,
	"latest_end_at" timestamp with time zone,
	"next_action" text,
	"reminder_level" text,
	"risk_level" text,
	"ticktick_title" text,
	"ticktick_body" text,
	"ticktick_checklist" text,
	"ticktick_copied_at" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_candidate_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"rule_text" text NOT NULL,
	"scene" text,
	"status" text DEFAULT 'candidate' NOT NULL,
	"effectiveness" integer DEFAULT 0 NOT NULL,
	"root_cause" text,
	"source_case_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"event_type" text DEFAULT 'lost_item' NOT NULL,
	"scene" text DEFAULT 'custom' NOT NULL,
	"status" text DEFAULT 'searching' NOT NULL,
	"item_name" text,
	"money_loss" integer DEFAULT 0 NOT NULL,
	"search_minutes" integer DEFAULT 0 NOT NULL,
	"tags" text,
	"reviewed" boolean DEFAULT false NOT NULL,
	"impact_level" text DEFAULT 'low' NOT NULL,
	"is_repeat" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"event_id" integer NOT NULL,
	"what_happened" text NOT NULL,
	"why_not_discovered" text,
	"root_cause" text NOT NULL,
	"prevention" text,
	"system_rule" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_boundaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"source_type" text DEFAULT 'task' NOT NULL,
	"source_id" integer,
	"title" text NOT NULL,
	"minimum_done_standard" text NOT NULL,
	"standard_done_definition" text,
	"deep_work_reason" text,
	"explicit_non_goals" text,
	"stop_condition" text NOT NULL,
	"timebox_minutes" integer DEFAULT 30 NOT NULL,
	"information_confidence" text DEFAULT 'unknown' NOT NULL,
	"opportunity_cost" text NOT NULL,
	"balance_risk" text,
	"decision" text DEFAULT 'validate_small' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_review_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"spending_review_id" integer NOT NULL,
	"reviewer_type" text DEFAULT 'gpt' NOT NULL,
	"conclusion" text,
	"main_reason" text,
	"risks" text,
	"alternatives" text,
	"suggested_cooling_period" text,
	"raw_response" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intervention_rule_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"rule_id" integer NOT NULL,
	"version" integer NOT NULL,
	"scene_tags_snapshot" text,
	"risk_tags_snapshot" text,
	"trigger_text_snapshot" text NOT NULL,
	"action_snapshot" text NOT NULL,
	"severity_snapshot" text NOT NULL,
	"change_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "key_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"objective_id" integer NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lifespan_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"date" text NOT NULL,
	"quality_score" integer DEFAULT 0 NOT NULL,
	"effective_days_x100" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mind_principles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"principle_text" text NOT NULL,
	"applicable_states" text DEFAULT '[]' NOT NULL,
	"action_hint" text NOT NULL,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"source_note" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mind_regulation_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"session_id" integer NOT NULL,
	"actual_result" text NOT NULL,
	"state_after" text NOT NULL,
	"effectiveness" text NOT NULL,
	"lesson_text" text,
	"convert_to_rule" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mind_regulation_reviews_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "mind_regulation_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"current_state" text NOT NULL,
	"energy_level" integer NOT NULL,
	"agitation_level" integer NOT NULL,
	"current_task" text NOT NULL,
	"trigger_text" text,
	"intervention_type" text NOT NULL,
	"recommended_action" text NOT NULL,
	"selected_action" text,
	"action_status" text DEFAULT 'suggested' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mistake_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"confirmation_id" integer,
	"mistake_type" text NOT NULL,
	"loss" text,
	"skipped_step" text,
	"state_when_error" text,
	"principle_text" text,
	"new_rule" text,
	"cost_level" text DEFAULT 'medium' NOT NULL,
	"write_to_review_system" boolean DEFAULT true NOT NULL,
	"past_choice" text,
	"actual_cost" text,
	"alternative_choice" text,
	"lesson_statement" text,
	"lesson_status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "objectives" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people_resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"person_name" text NOT NULL,
	"relationship_type" text,
	"domain" text,
	"relationship_stage" text DEFAULT 'initial_contact' NOT NULL,
	"available_help" text,
	"value_i_can_offer" text,
	"suitable_topics" text,
	"unsuitable_topics" text,
	"suggested_frequency" text,
	"last_contact_at" timestamp with time zone,
	"monthly_contact_count" integer DEFAULT 0 NOT NULL,
	"interaction_status" text DEFAULT 'normal' NOT NULL,
	"next_contact_at" timestamp with time zone,
	"boundary_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "person_need_hypotheses" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"person_id" integer NOT NULL,
	"need_type" text,
	"hypothesis" text NOT NULL,
	"evidence" text,
	"confidence" text DEFAULT 'low' NOT NULL,
	"validation_question" text,
	"status" text DEFAULT 'active' NOT NULL,
	"last_validated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationship_communication_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"relationship_id" integer NOT NULL,
	"goal" text NOT NULL,
	"minimal_request" text NOT NULL,
	"boundary" text NOT NULL,
	"avoid_topics" text,
	"channel" text NOT NULL,
	"planned_at" timestamp with time zone,
	"risk_level" text NOT NULL,
	"preflight_checklist" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationship_emotional_states" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"relationship_id" integer NOT NULL,
	"emotion" text NOT NULL,
	"intensity" integer NOT NULL,
	"trigger" text,
	"body_response" text,
	"impulse" text,
	"current_need" text,
	"action_readiness" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationship_interaction_outcomes" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"relationship_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"what_happened" text NOT NULL,
	"response_observed" text NOT NULL,
	"energy_after" text NOT NULL,
	"boundary_result" text NOT NULL,
	"mainline_impact" text,
	"next_step" text,
	"needs_ash_review" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "relationship_interaction_outcomes_plan_id_unique" UNIQUE("plan_id")
);
--> statement-breakpoint
CREATE TABLE "relationship_interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"relationship_id" integer NOT NULL,
	"interaction_date" timestamp with time zone DEFAULT now() NOT NULL,
	"interaction_fact" text NOT NULL,
	"energy_after" text DEFAULT 'calm' NOT NULL,
	"signal_type" text DEFAULT 'unclear' NOT NULL,
	"did_i_people_please" boolean DEFAULT false NOT NULL,
	"did_i_cross_boundary" boolean DEFAULT false NOT NULL,
	"user_response" text,
	"next_step" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationship_resource_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"relationship_id" integer NOT NULL,
	"resource_id" integer NOT NULL,
	"credibility" integer NOT NULL,
	"manipulation_risk" integer NOT NULL,
	"stigma_risk" integer NOT NULL,
	"absolutism_risk" integer NOT NULL,
	"applicable_boundary" text NOT NULL,
	"actionable_principle" text NOT NULL,
	"status" text NOT NULL,
	"review_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationship_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"relationship_id" integer NOT NULL,
	"what_happened" text NOT NULL,
	"ignored_signal" text,
	"rushed_or_emotional_part" text,
	"people_pleasing_part" text,
	"boundary_crossed" text,
	"possible_core_need" text,
	"lesson" text NOT NULL,
	"principle" text NOT NULL,
	"interception_rule" text NOT NULL,
	"linked_confirmation_rule_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationship_signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"relationship_id" integer NOT NULL,
	"signal_kind" text NOT NULL,
	"direction" text NOT NULL,
	"strength" integer NOT NULL,
	"content" text NOT NULL,
	"source" text,
	"occurred_at" timestamp with time zone,
	"verification_status" text DEFAULT 'unverified' NOT NULL,
	"verified_at" timestamp with time zone,
	"seed_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationship_stage_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"relationship_id" integer NOT NULL,
	"suggested_stage" text NOT NULL,
	"confirmed_stage" text,
	"confidence" integer NOT NULL,
	"supporting_signal_ids" text,
	"counter_signal_ids" text,
	"rationale" text NOT NULL,
	"confirmed_by_user" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"person_name" text NOT NULL,
	"relationship_type" text DEFAULT 'other' NOT NULL,
	"relationship_status" text DEFAULT 'normal_contact' NOT NULL,
	"net_impact" text DEFAULT 'uncertain' NOT NULL,
	"career_impact_score" integer,
	"work_impact_score" integer,
	"emotion_impact_score" integer,
	"growth_impact_score" integer,
	"reciprocity_level" text DEFAULT 'balanced' NOT NULL,
	"core_need_hypothesis" text,
	"sensitive_points" text,
	"communication_landmines" text,
	"key_signals" text,
	"boundary_notes" text,
	"next_action" text DEFAULT 'observe' NOT NULL,
	"notes" text,
	"current_stage" text DEFAULT 'initial_contact' NOT NULL,
	"stage_confidence" integer DEFAULT 0 NOT NULL,
	"stage_rationale" text,
	"stage_confirmed_at" timestamp with time zone,
	"known_facts" text,
	"unverified_hypotheses" text,
	"open_questions" text,
	"preferred_language" text,
	"current_context" text,
	"seed_key" text,
	"last_interaction_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"resource_id" integer NOT NULL,
	"evidence_type" text DEFAULT 'note' NOT NULL,
	"title" text,
	"content" text,
	"external_url" text,
	"conversion_level" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"resource_id" integer NOT NULL,
	"linked_type" text NOT NULL,
	"linked_id" integer,
	"external_title" text,
	"external_platform" text,
	"external_url" text,
	"keywords" text,
	"link_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_platforms" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"primary_role" text NOT NULL,
	"excluded_roles" text,
	"resource_types" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"resource_id" integer NOT NULL,
	"actual_usage" text,
	"output_created" text,
	"unused_reason" text,
	"management_cost" text,
	"next_status" text,
	"next_review_at" timestamp with time zone,
	"reflection" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"resource_type" text NOT NULL,
	"domain" text DEFAULT 'other' NOT NULL,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"platform_id" integer,
	"mainline" text,
	"responsibility" text,
	"location_url" text,
	"local_path" text,
	"purchase_cost" integer,
	"currency" text DEFAULT 'CNY' NOT NULL,
	"storage_size_mb" integer,
	"is_replaceable" boolean DEFAULT true NOT NULL,
	"is_duplicate" boolean DEFAULT false NOT NULL,
	"next_action" text,
	"next_use_at" timestamp with time zone,
	"expected_output" text,
	"conversion_level" integer DEFAULT 0 NOT NULL,
	"review_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rhythm_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"date" text NOT NULL,
	"sleep_time" text,
	"wake_time" text,
	"fatigue_level" integer,
	"night_mode_used" boolean DEFAULT false NOT NULL,
	"morning_mode_used" boolean DEFAULT false NOT NULL,
	"quality_score" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "spend_conversions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"event_case_id" integer,
	"rule_id" integer,
	"decision_stage" text NOT NULL,
	"privacy_label" text DEFAULT '私密消费' NOT NULL,
	"sensitive_label" text,
	"input_currency" text DEFAULT 'CNY' NOT NULL,
	"planned_amount_minor" integer NOT NULL,
	"input_to_cny_rate" text DEFAULT '1.000000' NOT NULL,
	"snapshot_json" text NOT NULL,
	"cooldown_minutes" integer,
	"cooldown_ends_at" timestamp with time zone,
	"minimum_action" text,
	"resolution" text,
	"actual_amount_minor" integer,
	"protected_amount_minor" integer DEFAULT 0 NOT NULL,
	"redirected_amount_minor" integer DEFAULT 0 NOT NULL,
	"redirect_target" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spending_anchors" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"price_cny" integer NOT NULL,
	"unit_label" text DEFAULT '1 份' NOT NULL,
	"source_type" text DEFAULT 'preset' NOT NULL,
	"category" text,
	"purchased_at" timestamp with time zone,
	"product_note" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"billing_type" text DEFAULT 'single_unit' NOT NULL,
	"currency" text DEFAULT 'CNY' NOT NULL,
	"price_minor" integer DEFAULT 0 NOT NULL,
	"max_price_minor" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"source_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spending_reviews_postmortem" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"spending_review_id" integer NOT NULL,
	"actual_amount" integer,
	"actual_time_minutes" integer,
	"regret_level" integer,
	"actual_usage" text,
	"affected_mainline" text,
	"ignored_risk" text,
	"lesson" text,
	"principle" text,
	"interception_rule" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spending_review_exports" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"spending_review_id" integer NOT NULL,
	"markdown_content" text NOT NULL,
	"exported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_to_gpt" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "spending_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'CNY' NOT NULL,
	"is_subscription" boolean DEFAULT false NOT NULL,
	"billing_cycle" text,
	"auto_renew" boolean DEFAULT false NOT NULL,
	"refundable" boolean,
	"reversible" boolean,
	"decision_time" timestamp with time zone,
	"time_risk_level" text,
	"current_states" text,
	"impulse_level" integer DEFAULT 0 NOT NULL,
	"sleep_status" text,
	"funding_source" text DEFAULT 'budget' NOT NULL,
	"monthly_budget_remaining" integer,
	"uses_living_expense" boolean DEFAULT false NOT NULL,
	"uses_health_budget" boolean DEFAULT false NOT NULL,
	"uses_tuition" boolean DEFAULT false NOT NULL,
	"uses_emergency_fund" boolean DEFAULT false NOT NULL,
	"uses_credit" boolean DEFAULT false NOT NULL,
	"real_need" text,
	"problem_to_solve" text,
	"consequence_if_not_buy" text,
	"emotional_relief" boolean DEFAULT false NOT NULL,
	"task_avoidance" boolean DEFAULT false NOT NULL,
	"alternatives" text,
	"current_mainline" text,
	"affects_sleep" boolean DEFAULT false NOT NULL,
	"affects_course" boolean DEFAULT false NOT NULL,
	"affects_dashboard" boolean DEFAULT false NOT NULL,
	"affects_algorithm" boolean DEFAULT false NOT NULL,
	"affects_ai_course" boolean DEFAULT false NOT NULL,
	"affects_pm_learning" boolean DEFAULT false NOT NULL,
	"affects_training" boolean DEFAULT false NOT NULL,
	"affects_budget" boolean DEFAULT false NOT NULL,
	"risk_level" text,
	"risk_triggers" text,
	"decision_status" text DEFAULT 'draft' NOT NULL,
	"cooling_until" timestamp with time zone,
	"system_recommendation" text,
	"final_decision" text,
	"final_decision_reason" text,
	"payment_completed" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_purchase_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"spending_review_id" integer NOT NULL,
	"tool_name" text,
	"use_case_next_7_days" text,
	"expected_usage_count" integer,
	"existing_tools" text,
	"overlap_description" text,
	"current_quota_remaining" text,
	"expected_output" text,
	"can_continue_without_purchase" boolean,
	"anxiety_driven" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"source_text" text NOT NULL,
	"translated_text" text NOT NULL,
	"target_language" text DEFAULT 'en' NOT NULL,
	"usage_scene" text DEFAULT 'custom' NOT NULL,
	"tone" text DEFAULT 'formal' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tree_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"parent_id" integer,
	"root_id" integer,
	"path" text DEFAULT '' NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" text DEFAULT 'P1' NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"progress_mode" text DEFAULT 'weighted' NOT NULL,
	"estimated_hours" integer,
	"actual_hours" integer,
	"key_result_id" integer,
	"objective_id" integer,
	"risk_level" text DEFAULT 'low' NOT NULL,
	"deadline" timestamp with time zone,
	"collapsed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trigger_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"scene_type" text NOT NULL,
	"scene_summary" text NOT NULL,
	"matched_rule_ids" text DEFAULT '[]' NOT NULL,
	"matched_rule_versions" text DEFAULT '[]' NOT NULL,
	"shown_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_choice" text DEFAULT 'pending' NOT NULL,
	"choice_note" text,
	"status" text DEFAULT 'matched' NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unified_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"card_type" text DEFAULT 'note' NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"status" text DEFAULT 'active' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"context_type" text,
	"context_id" integer,
	"linked_card_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"pref_key" text NOT NULL,
	"pref_value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weakness_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"weakness_key" text NOT NULL,
	"source_type" text DEFAULT 'custom' NOT NULL,
	"source_id" integer,
	"trigger_reason" text NOT NULL,
	"severity" text DEFAULT 'low' NOT NULL,
	"recommended_intervention" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weakness_patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"weakness_key" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"trigger_signals" text,
	"default_intervention" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ash_memos_owned_id" ON "ash_memos" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "ash_memos_account_idx" ON "ash_memos" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "boundary_checks_owned_id" ON "boundary_checks" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "boundary_checks_account_idx" ON "boundary_checks" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "choice_validations_owned_id" ON "choice_validations" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "choice_validations_account_idx" ON "choice_validations" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "communication_plans_owned_id" ON "communication_plans" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "communication_plans_account_idx" ON "communication_plans" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "communication_results_owned_id" ON "communication_results" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "communication_results_account_idx" ON "communication_results" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "confirmation_evidence_owned_id" ON "confirmation_evidence" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "confirmation_evidence_account_idx" ON "confirmation_evidence" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "confirmation_items_owned_id" ON "confirmation_items" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "confirmation_items_account_idx" ON "confirmation_items" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "confirmation_rules_owned_id" ON "confirmation_rules" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "confirmation_rules_account_idx" ON "confirmation_rules" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "conversion_preferences_owned_id" ON "conversion_preferences" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "conversion_preferences_account_idx" ON "conversion_preferences" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "conversion_preferences_natural_key" ON "conversion_preferences" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "critical_confirmations_owned_id" ON "critical_confirmations" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "critical_confirmations_account_idx" ON "critical_confirmations" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "decision_baselines_owned_id" ON "decision_baselines" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "decision_baselines_account_idx" ON "decision_baselines" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "decision_recovery_actions_owned_id" ON "decision_recovery_actions" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "decision_recovery_actions_account_idx" ON "decision_recovery_actions" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "demands_owned_id" ON "demands" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "demands_account_idx" ON "demands" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "entertainment_assessments_owned_id" ON "entertainment_assessments" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "entertainment_assessments_account_idx" ON "entertainment_assessments" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "entertainment_assessments_natural_key" ON "entertainment_assessments" USING btree ("userId","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entertainment_reflections_owned_id" ON "entertainment_reflections" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "entertainment_reflections_account_idx" ON "entertainment_reflections" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "entertainment_reflections_natural_key" ON "entertainment_reflections" USING btree ("userId","session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entertainment_sessions_owned_id" ON "entertainment_sessions" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "entertainment_sessions_account_idx" ON "entertainment_sessions" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "event_candidate_rules_owned_id" ON "event_candidate_rules" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "event_candidate_rules_account_idx" ON "event_candidate_rules" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "event_cases_owned_id" ON "event_cases" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "event_cases_account_idx" ON "event_cases" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "event_reviews_owned_id" ON "event_reviews" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "event_reviews_account_idx" ON "event_reviews" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "event_reviews_natural_key" ON "event_reviews" USING btree ("userId","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "execution_boundaries_owned_id" ON "execution_boundaries" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "execution_boundaries_account_idx" ON "execution_boundaries" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "external_review_results_owned_id" ON "external_review_results" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "external_review_results_account_idx" ON "external_review_results" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "intervention_rule_versions_owned_id" ON "intervention_rule_versions" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "intervention_rule_versions_account_idx" ON "intervention_rule_versions" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "key_results_owned_id" ON "key_results" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "key_results_account_idx" ON "key_results" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "lifespan_logs_owned_id" ON "lifespan_logs" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "lifespan_logs_account_idx" ON "lifespan_logs" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "lifespan_logs_natural_key" ON "lifespan_logs" USING btree ("userId","date");--> statement-breakpoint
CREATE UNIQUE INDEX "mind_principles_owned_id" ON "mind_principles" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "mind_principles_account_idx" ON "mind_principles" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "mind_regulation_reviews_owned_id" ON "mind_regulation_reviews" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "mind_regulation_reviews_account_idx" ON "mind_regulation_reviews" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "mind_regulation_sessions_owned_id" ON "mind_regulation_sessions" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "mind_regulation_sessions_account_idx" ON "mind_regulation_sessions" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "mistake_reviews_owned_id" ON "mistake_reviews" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "mistake_reviews_account_idx" ON "mistake_reviews" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "objectives_owned_id" ON "objectives" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "objectives_account_idx" ON "objectives" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "people_resources_owned_id" ON "people_resources" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "people_resources_account_idx" ON "people_resources" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "person_need_hypotheses_owned_id" ON "person_need_hypotheses" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "person_need_hypotheses_account_idx" ON "person_need_hypotheses" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "relationship_communication_plans_owned_id" ON "relationship_communication_plans" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "relationship_communication_plans_account_idx" ON "relationship_communication_plans" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "relationship_emotional_states_owned_id" ON "relationship_emotional_states" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "relationship_emotional_states_account_idx" ON "relationship_emotional_states" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "relationship_interaction_outcomes_owned_id" ON "relationship_interaction_outcomes" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "relationship_interaction_outcomes_account_idx" ON "relationship_interaction_outcomes" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "relationship_interactions_owned_id" ON "relationship_interactions" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "relationship_interactions_account_idx" ON "relationship_interactions" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "relationship_resource_assessments_owned_id" ON "relationship_resource_assessments" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "relationship_resource_assessments_account_idx" ON "relationship_resource_assessments" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "relationship_reviews_owned_id" ON "relationship_reviews" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "relationship_reviews_account_idx" ON "relationship_reviews" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "relationship_signals_owned_id" ON "relationship_signals" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "relationship_signals_account_idx" ON "relationship_signals" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "relationship_stage_snapshots_owned_id" ON "relationship_stage_snapshots" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "relationship_stage_snapshots_account_idx" ON "relationship_stage_snapshots" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "relationships_owned_id" ON "relationships" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "relationships_account_idx" ON "relationships" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "relationships_natural_key" ON "relationships" USING btree ("userId","seed_key");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_evidence_owned_id" ON "resource_evidence" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "resource_evidence_account_idx" ON "resource_evidence" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_links_owned_id" ON "resource_links" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "resource_links_account_idx" ON "resource_links" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_platforms_owned_id" ON "resource_platforms" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "resource_platforms_account_idx" ON "resource_platforms" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_reviews_owned_id" ON "resource_reviews" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "resource_reviews_account_idx" ON "resource_reviews" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "resources_owned_id" ON "resources" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "resources_account_idx" ON "resources" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "rhythm_logs_owned_id" ON "rhythm_logs" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "rhythm_logs_account_idx" ON "rhythm_logs" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "rhythm_logs_natural_key" ON "rhythm_logs" USING btree ("userId","date");--> statement-breakpoint
CREATE UNIQUE INDEX "spend_conversions_owned_id" ON "spend_conversions" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "spend_conversions_account_idx" ON "spend_conversions" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "spending_anchors_owned_id" ON "spending_anchors" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "spending_anchors_account_idx" ON "spending_anchors" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "spending_reviews_postmortem_owned_id" ON "spending_reviews_postmortem" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "spending_reviews_postmortem_account_idx" ON "spending_reviews_postmortem" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "spending_review_exports_owned_id" ON "spending_review_exports" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "spending_review_exports_account_idx" ON "spending_review_exports" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "spending_reviews_owned_id" ON "spending_reviews" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "spending_reviews_account_idx" ON "spending_reviews" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "tool_purchase_checks_owned_id" ON "tool_purchase_checks" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "tool_purchase_checks_account_idx" ON "tool_purchase_checks" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "translations_owned_id" ON "translations" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "translations_account_idx" ON "translations" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "tree_tasks_owned_id" ON "tree_tasks" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "tree_tasks_account_idx" ON "tree_tasks" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "trigger_sessions_owned_id" ON "trigger_sessions" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "trigger_sessions_account_idx" ON "trigger_sessions" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "trigger_sessions_natural_key" ON "trigger_sessions" USING btree ("userId","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "unified_cards_owned_id" ON "unified_cards" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "unified_cards_account_idx" ON "unified_cards" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "user_preferences_owned_id" ON "user_preferences" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "user_preferences_account_idx" ON "user_preferences" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "user_preferences_natural_key" ON "user_preferences" USING btree ("userId","pref_key");--> statement-breakpoint
CREATE UNIQUE INDEX "weakness_events_owned_id" ON "weakness_events" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "weakness_events_account_idx" ON "weakness_events" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "weakness_patterns_owned_id" ON "weakness_patterns" USING btree ("id","userId");--> statement-breakpoint
CREATE INDEX "weakness_patterns_account_idx" ON "weakness_patterns" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "weakness_patterns_natural_key" ON "weakness_patterns" USING btree ("userId","weakness_key");