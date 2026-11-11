-- Ownership, deletion semantics and RLS supplement the generated schema.
ALTER TABLE "ash_memos" ADD CONSTRAINT "ash_memos_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "ash_memos" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "ash_memos" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "ash_memos" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "boundary_checks" ADD CONSTRAINT "boundary_checks_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "boundary_checks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "boundary_checks" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "boundary_checks" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "choice_validations" ADD CONSTRAINT "choice_validations_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "choice_validations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "choice_validations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "choice_validations" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "communication_plans" ADD CONSTRAINT "communication_plans_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "communication_plans" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "communication_plans" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "communication_plans" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "communication_results" ADD CONSTRAINT "communication_results_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "communication_results" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "communication_results" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "communication_results" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "confirmation_evidence" ADD CONSTRAINT "confirmation_evidence_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "confirmation_evidence" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "confirmation_evidence" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "confirmation_evidence" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "confirmation_items" ADD CONSTRAINT "confirmation_items_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "confirmation_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "confirmation_items" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "confirmation_items" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "confirmation_rules" ADD CONSTRAINT "confirmation_rules_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "confirmation_rules" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "confirmation_rules" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "confirmation_rules" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "conversion_preferences" ADD CONSTRAINT "conversion_preferences_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "conversion_preferences" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "conversion_preferences" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "conversion_preferences" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "critical_confirmations" ADD CONSTRAINT "critical_confirmations_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "critical_confirmations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "critical_confirmations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "critical_confirmations" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "decision_baselines" ADD CONSTRAINT "decision_baselines_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "decision_baselines" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "decision_baselines" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "decision_baselines" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "decision_recovery_actions" ADD CONSTRAINT "decision_recovery_actions_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "decision_recovery_actions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "decision_recovery_actions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "decision_recovery_actions" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "demands" ADD CONSTRAINT "demands_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "demands" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "demands" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "demands" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "entertainment_assessments" ADD CONSTRAINT "entertainment_assessments_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "entertainment_assessments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "entertainment_assessments" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "entertainment_assessments" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "entertainment_reflections" ADD CONSTRAINT "entertainment_reflections_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "entertainment_reflections" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "entertainment_reflections" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "entertainment_reflections" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "entertainment_sessions" ADD CONSTRAINT "entertainment_sessions_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "entertainment_sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "entertainment_sessions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "entertainment_sessions" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "event_candidate_rules" ADD CONSTRAINT "event_candidate_rules_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "event_candidate_rules" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "event_candidate_rules" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "event_candidate_rules" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "event_cases" ADD CONSTRAINT "event_cases_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "event_cases" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "event_cases" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "event_cases" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "event_reviews" ADD CONSTRAINT "event_reviews_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "event_reviews" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "event_reviews" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "event_reviews" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "execution_boundaries" ADD CONSTRAINT "execution_boundaries_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "execution_boundaries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "execution_boundaries" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "execution_boundaries" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "external_review_results" ADD CONSTRAINT "external_review_results_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "external_review_results" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "external_review_results" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "external_review_results" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "intervention_rule_versions" ADD CONSTRAINT "intervention_rule_versions_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "intervention_rule_versions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "intervention_rule_versions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "intervention_rule_versions" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "key_results" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "key_results" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "key_results" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "lifespan_logs" ADD CONSTRAINT "lifespan_logs_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "lifespan_logs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "lifespan_logs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "lifespan_logs" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "mind_principles" ADD CONSTRAINT "mind_principles_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "mind_principles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "mind_principles" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "mind_principles" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "mind_regulation_reviews" ADD CONSTRAINT "mind_regulation_reviews_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "mind_regulation_reviews" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "mind_regulation_reviews" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "mind_regulation_reviews" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "mind_regulation_sessions" ADD CONSTRAINT "mind_regulation_sessions_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "mind_regulation_sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "mind_regulation_sessions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "mind_regulation_sessions" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "mistake_reviews" ADD CONSTRAINT "mistake_reviews_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "mistake_reviews" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "mistake_reviews" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "mistake_reviews" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "objectives" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "objectives" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "objectives" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "people_resources" ADD CONSTRAINT "people_resources_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "people_resources" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "people_resources" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "people_resources" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "person_need_hypotheses" ADD CONSTRAINT "person_need_hypotheses_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "person_need_hypotheses" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "person_need_hypotheses" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "person_need_hypotheses" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "relationship_communication_plans" ADD CONSTRAINT "relationship_communication_plans_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "relationship_communication_plans" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "relationship_communication_plans" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "relationship_communication_plans" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "relationship_emotional_states" ADD CONSTRAINT "relationship_emotional_states_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "relationship_emotional_states" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "relationship_emotional_states" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "relationship_emotional_states" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "relationship_interaction_outcomes" ADD CONSTRAINT "relationship_interaction_outcomes_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "relationship_interaction_outcomes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "relationship_interaction_outcomes" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "relationship_interaction_outcomes" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "relationship_interactions" ADD CONSTRAINT "relationship_interactions_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "relationship_interactions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "relationship_interactions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "relationship_interactions" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "relationship_resource_assessments" ADD CONSTRAINT "relationship_resource_assessments_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "relationship_resource_assessments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "relationship_resource_assessments" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "relationship_resource_assessments" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "relationship_reviews" ADD CONSTRAINT "relationship_reviews_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "relationship_reviews" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "relationship_reviews" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "relationship_reviews" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "relationship_signals" ADD CONSTRAINT "relationship_signals_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "relationship_signals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "relationship_signals" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "relationship_signals" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "relationship_stage_snapshots" ADD CONSTRAINT "relationship_stage_snapshots_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "relationship_stage_snapshots" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "relationship_stage_snapshots" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "relationship_stage_snapshots" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "relationships" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "relationships" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "relationships" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "resource_evidence" ADD CONSTRAINT "resource_evidence_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "resource_evidence" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "resource_evidence" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "resource_evidence" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "resource_links" ADD CONSTRAINT "resource_links_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "resource_links" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "resource_links" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "resource_links" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "resource_platforms" ADD CONSTRAINT "resource_platforms_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "resource_platforms" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "resource_platforms" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "resource_platforms" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "resource_reviews" ADD CONSTRAINT "resource_reviews_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "resource_reviews" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "resource_reviews" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "resource_reviews" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "resources" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "resources" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "resources" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "rhythm_logs" ADD CONSTRAINT "rhythm_logs_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "rhythm_logs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "rhythm_logs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "rhythm_logs" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "spend_conversions" ADD CONSTRAINT "spend_conversions_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "spend_conversions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "spend_conversions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "spend_conversions" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "spending_anchors" ADD CONSTRAINT "spending_anchors_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "spending_anchors" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "spending_anchors" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "spending_anchors" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "spending_reviews_postmortem" ADD CONSTRAINT "spending_reviews_postmortem_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "spending_reviews_postmortem" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "spending_reviews_postmortem" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "spending_reviews_postmortem" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "spending_review_exports" ADD CONSTRAINT "spending_review_exports_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "spending_review_exports" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "spending_review_exports" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "spending_review_exports" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "spending_reviews" ADD CONSTRAINT "spending_reviews_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "spending_reviews" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "spending_reviews" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "spending_reviews" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "tool_purchase_checks" ADD CONSTRAINT "tool_purchase_checks_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "tool_purchase_checks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "tool_purchase_checks" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "tool_purchase_checks" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "translations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "translations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "translations" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "tree_tasks" ADD CONSTRAINT "tree_tasks_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "tree_tasks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "tree_tasks" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "tree_tasks" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "trigger_sessions" ADD CONSTRAINT "trigger_sessions_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "trigger_sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "trigger_sessions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "trigger_sessions" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "unified_cards" ADD CONSTRAINT "unified_cards_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "unified_cards" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "unified_cards" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "unified_cards" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "user_preferences" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "user_preferences" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "weakness_events" ADD CONSTRAINT "weakness_events_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "weakness_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "weakness_events" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "weakness_events" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "weakness_patterns" ADD CONSTRAINT "weakness_patterns_account_fk" FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "weakness_patterns" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "weakness_patterns" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "weakness_patterns" USING ("userId" = current_setting('app.user_id', true)) WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "confirmation_items" ADD CONSTRAINT "confirmation_items_confirmation_id_owned_fk" FOREIGN KEY ("confirmation_id", "userId") REFERENCES "critical_confirmations"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "confirmation_items_confirmation_id_owned_fk_idx" ON "confirmation_items" ("confirmation_id", "userId");
--> statement-breakpoint
ALTER TABLE "confirmation_evidence" ADD CONSTRAINT "confirmation_evidence_confirmation_id_owned_fk" FOREIGN KEY ("confirmation_id", "userId") REFERENCES "critical_confirmations"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "confirmation_evidence_confirmation_id_owned_fk_idx" ON "confirmation_evidence" ("confirmation_id", "userId");
--> statement-breakpoint
ALTER TABLE "mistake_reviews" ADD CONSTRAINT "mistake_reviews_confirmation_id_owned_fk" FOREIGN KEY ("confirmation_id", "userId") REFERENCES "critical_confirmations"(id, "userId") ON DELETE SET NULL ("confirmation_id");
--> statement-breakpoint
CREATE INDEX "mistake_reviews_confirmation_id_owned_fk_idx" ON "mistake_reviews" ("confirmation_id", "userId");
--> statement-breakpoint
ALTER TABLE "confirmation_rules" ADD CONSTRAINT "confirmation_rules_source_review_id_owned_fk" FOREIGN KEY ("source_review_id", "userId") REFERENCES "mistake_reviews"(id, "userId") ON DELETE SET NULL ("source_review_id");
--> statement-breakpoint
CREATE INDEX "confirmation_rules_source_review_id_owned_fk_idx" ON "confirmation_rules" ("source_review_id", "userId");
--> statement-breakpoint
ALTER TABLE "mind_regulation_reviews" ADD CONSTRAINT "mind_regulation_reviews_session_id_owned_fk" FOREIGN KEY ("session_id", "userId") REFERENCES "mind_regulation_sessions"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "mind_regulation_reviews_session_id_owned_fk_idx" ON "mind_regulation_reviews" ("session_id", "userId");
--> statement-breakpoint
ALTER TABLE "intervention_rule_versions" ADD CONSTRAINT "intervention_rule_versions_rule_id_owned_fk" FOREIGN KEY ("rule_id", "userId") REFERENCES "confirmation_rules"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "intervention_rule_versions_rule_id_owned_fk_idx" ON "intervention_rule_versions" ("rule_id", "userId");
--> statement-breakpoint
ALTER TABLE "choice_validations" ADD CONSTRAINT "choice_validations_trigger_session_id_owned_fk" FOREIGN KEY ("trigger_session_id", "userId") REFERENCES "trigger_sessions"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "choice_validations_trigger_session_id_owned_fk_idx" ON "choice_validations" ("trigger_session_id", "userId");
--> statement-breakpoint
ALTER TABLE "ash_memos" ADD CONSTRAINT "ash_memos_confirmation_id_owned_fk" FOREIGN KEY ("confirmation_id", "userId") REFERENCES "critical_confirmations"(id, "userId") ON DELETE SET NULL ("confirmation_id");
--> statement-breakpoint
CREATE INDEX "ash_memos_confirmation_id_owned_fk_idx" ON "ash_memos" ("confirmation_id", "userId");
--> statement-breakpoint
ALTER TABLE "ash_memos" ADD CONSTRAINT "ash_memos_linked_rule_id_owned_fk" FOREIGN KEY ("linked_rule_id", "userId") REFERENCES "confirmation_rules"(id, "userId") ON DELETE SET NULL ("linked_rule_id");
--> statement-breakpoint
CREATE INDEX "ash_memos_linked_rule_id_owned_fk_idx" ON "ash_memos" ("linked_rule_id", "userId");
--> statement-breakpoint
ALTER TABLE "relationship_interactions" ADD CONSTRAINT "relationship_interactions_relationship_id_owned_fk" FOREIGN KEY ("relationship_id", "userId") REFERENCES "relationships"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "relationship_interactions_relationship_id_owned_fk_idx" ON "relationship_interactions" ("relationship_id", "userId");
--> statement-breakpoint
ALTER TABLE "relationship_reviews" ADD CONSTRAINT "relationship_reviews_relationship_id_owned_fk" FOREIGN KEY ("relationship_id", "userId") REFERENCES "relationships"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "relationship_reviews_relationship_id_owned_fk_idx" ON "relationship_reviews" ("relationship_id", "userId");
--> statement-breakpoint
ALTER TABLE "relationship_emotional_states" ADD CONSTRAINT "relationship_emotional_states_relationship_id_owned_fk" FOREIGN KEY ("relationship_id", "userId") REFERENCES "relationships"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "relationship_emotional_states_relationship_id_owned_fk_idx" ON "relationship_emotional_states" ("relationship_id", "userId");
--> statement-breakpoint
ALTER TABLE "relationship_signals" ADD CONSTRAINT "relationship_signals_relationship_id_owned_fk" FOREIGN KEY ("relationship_id", "userId") REFERENCES "relationships"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "relationship_signals_relationship_id_owned_fk_idx" ON "relationship_signals" ("relationship_id", "userId");
--> statement-breakpoint
ALTER TABLE "relationship_stage_snapshots" ADD CONSTRAINT "relationship_stage_snapshots_relationship_id_owned_fk" FOREIGN KEY ("relationship_id", "userId") REFERENCES "relationships"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "relationship_stage_snapshots_relationship_id_owned_fk_idx" ON "relationship_stage_snapshots" ("relationship_id", "userId");
--> statement-breakpoint
ALTER TABLE "relationship_communication_plans" ADD CONSTRAINT "relationship_communication_plans_relationship_id_owned_fk" FOREIGN KEY ("relationship_id", "userId") REFERENCES "relationships"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "relationship_communication_plans_relationship_id_owned_fk_idx" ON "relationship_communication_plans" ("relationship_id", "userId");
--> statement-breakpoint
ALTER TABLE "relationship_interaction_outcomes" ADD CONSTRAINT "relationship_interaction_outcomes_relationship_id_owned_fk" FOREIGN KEY ("relationship_id", "userId") REFERENCES "relationships"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "relationship_interaction_outcomes_relationship_id_owned_fk_idx" ON "relationship_interaction_outcomes" ("relationship_id", "userId");
--> statement-breakpoint
ALTER TABLE "relationship_resource_assessments" ADD CONSTRAINT "relationship_resource_assessments_relationship_id_owned_fk" FOREIGN KEY ("relationship_id", "userId") REFERENCES "relationships"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "relationship_resource_assessments_relationship_id_owned_fk_idx" ON "relationship_resource_assessments" ("relationship_id", "userId");
--> statement-breakpoint
ALTER TABLE "relationship_reviews" ADD CONSTRAINT "relationship_reviews_linked_confirmation_rule_id_owned_fk" FOREIGN KEY ("linked_confirmation_rule_id", "userId") REFERENCES "confirmation_rules"(id, "userId") ON DELETE SET NULL ("linked_confirmation_rule_id");
--> statement-breakpoint
CREATE INDEX "relationship_reviews_linked_confirmation_rule_id_owned_fk_idx" ON "relationship_reviews" ("linked_confirmation_rule_id", "userId");
--> statement-breakpoint
ALTER TABLE "relationship_interaction_outcomes" ADD CONSTRAINT "relationship_interaction_outcomes_plan_id_owned_fk" FOREIGN KEY ("plan_id", "userId") REFERENCES "relationship_communication_plans"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "relationship_interaction_outcomes_plan_id_owned_fk_idx" ON "relationship_interaction_outcomes" ("plan_id", "userId");
--> statement-breakpoint
ALTER TABLE "relationship_resource_assessments" ADD CONSTRAINT "relationship_resource_assessments_resource_id_owned_fk" FOREIGN KEY ("resource_id", "userId") REFERENCES "resources"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "relationship_resource_assessments_resource_id_owned_fk_idx" ON "relationship_resource_assessments" ("resource_id", "userId");
--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_objective_id_owned_fk" FOREIGN KEY ("objective_id", "userId") REFERENCES "objectives"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "key_results_objective_id_owned_fk_idx" ON "key_results" ("objective_id", "userId");
--> statement-breakpoint
ALTER TABLE "tree_tasks" ADD CONSTRAINT "tree_tasks_parent_id_owned_fk" FOREIGN KEY ("parent_id", "userId") REFERENCES "tree_tasks"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "tree_tasks_parent_id_owned_fk_idx" ON "tree_tasks" ("parent_id", "userId");
--> statement-breakpoint
ALTER TABLE "tree_tasks" ADD CONSTRAINT "tree_tasks_root_id_owned_fk" FOREIGN KEY ("root_id", "userId") REFERENCES "tree_tasks"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "tree_tasks_root_id_owned_fk_idx" ON "tree_tasks" ("root_id", "userId");
--> statement-breakpoint
ALTER TABLE "tree_tasks" ADD CONSTRAINT "tree_tasks_key_result_id_owned_fk" FOREIGN KEY ("key_result_id", "userId") REFERENCES "key_results"(id, "userId") ON DELETE SET NULL ("key_result_id");
--> statement-breakpoint
CREATE INDEX "tree_tasks_key_result_id_owned_fk_idx" ON "tree_tasks" ("key_result_id", "userId");
--> statement-breakpoint
ALTER TABLE "tree_tasks" ADD CONSTRAINT "tree_tasks_objective_id_owned_fk" FOREIGN KEY ("objective_id", "userId") REFERENCES "objectives"(id, "userId") ON DELETE SET NULL ("objective_id");
--> statement-breakpoint
CREATE INDEX "tree_tasks_objective_id_owned_fk_idx" ON "tree_tasks" ("objective_id", "userId");
--> statement-breakpoint
ALTER TABLE "boundary_checks" ADD CONSTRAINT "boundary_checks_boundary_id_owned_fk" FOREIGN KEY ("boundary_id", "userId") REFERENCES "execution_boundaries"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "boundary_checks_boundary_id_owned_fk_idx" ON "boundary_checks" ("boundary_id", "userId");
--> statement-breakpoint
ALTER TABLE "unified_cards" ADD CONSTRAINT "unified_cards_linked_card_id_owned_fk" FOREIGN KEY ("linked_card_id", "userId") REFERENCES "unified_cards"(id, "userId") ON DELETE SET NULL ("linked_card_id");
--> statement-breakpoint
CREATE INDEX "unified_cards_linked_card_id_owned_fk_idx" ON "unified_cards" ("linked_card_id", "userId");
--> statement-breakpoint
ALTER TABLE "event_reviews" ADD CONSTRAINT "event_reviews_event_id_owned_fk" FOREIGN KEY ("event_id", "userId") REFERENCES "event_cases"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "event_reviews_event_id_owned_fk_idx" ON "event_reviews" ("event_id", "userId");
--> statement-breakpoint
ALTER TABLE "event_candidate_rules" ADD CONSTRAINT "event_candidate_rules_source_case_id_owned_fk" FOREIGN KEY ("source_case_id", "userId") REFERENCES "event_cases"(id, "userId") ON DELETE SET NULL ("source_case_id");
--> statement-breakpoint
CREATE INDEX "event_candidate_rules_source_case_id_owned_fk_idx" ON "event_candidate_rules" ("source_case_id", "userId");
--> statement-breakpoint
ALTER TABLE "tool_purchase_checks" ADD CONSTRAINT "tool_purchase_checks_spending_review_id_owned_fk" FOREIGN KEY ("spending_review_id", "userId") REFERENCES "spending_reviews"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "tool_purchase_checks_spending_review_id_owned_fk_idx" ON "tool_purchase_checks" ("spending_review_id", "userId");
--> statement-breakpoint
ALTER TABLE "spending_review_exports" ADD CONSTRAINT "spending_review_exports_spending_review_id_owned_fk" FOREIGN KEY ("spending_review_id", "userId") REFERENCES "spending_reviews"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "spending_review_exports_spending_review_id_owned_fk_idx" ON "spending_review_exports" ("spending_review_id", "userId");
--> statement-breakpoint
ALTER TABLE "external_review_results" ADD CONSTRAINT "external_review_results_spending_review_id_owned_fk" FOREIGN KEY ("spending_review_id", "userId") REFERENCES "spending_reviews"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "external_review_results_spending_review_id_owned_fk_idx" ON "external_review_results" ("spending_review_id", "userId");
--> statement-breakpoint
ALTER TABLE "decision_recovery_actions" ADD CONSTRAINT "decision_recovery_actions_spending_review_id_owned_fk" FOREIGN KEY ("spending_review_id", "userId") REFERENCES "spending_reviews"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "decision_recovery_actions_spending_review_id_owned_fk_idx" ON "decision_recovery_actions" ("spending_review_id", "userId");
--> statement-breakpoint
ALTER TABLE "spending_reviews_postmortem" ADD CONSTRAINT "spending_reviews_postmortem_spending_review_id_owned_fk" FOREIGN KEY ("spending_review_id", "userId") REFERENCES "spending_reviews"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "spending_reviews_postmortem_spending_review_id_owned_fk_idx" ON "spending_reviews_postmortem" ("spending_review_id", "userId");
--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_platform_id_owned_fk" FOREIGN KEY ("platform_id", "userId") REFERENCES "resource_platforms"(id, "userId") ON DELETE SET NULL ("platform_id");
--> statement-breakpoint
CREATE INDEX "resources_platform_id_owned_fk_idx" ON "resources" ("platform_id", "userId");
--> statement-breakpoint
ALTER TABLE "resource_evidence" ADD CONSTRAINT "resource_evidence_resource_id_owned_fk" FOREIGN KEY ("resource_id", "userId") REFERENCES "resources"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "resource_evidence_resource_id_owned_fk_idx" ON "resource_evidence" ("resource_id", "userId");
--> statement-breakpoint
ALTER TABLE "resource_links" ADD CONSTRAINT "resource_links_resource_id_owned_fk" FOREIGN KEY ("resource_id", "userId") REFERENCES "resources"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "resource_links_resource_id_owned_fk_idx" ON "resource_links" ("resource_id", "userId");
--> statement-breakpoint
ALTER TABLE "resource_reviews" ADD CONSTRAINT "resource_reviews_resource_id_owned_fk" FOREIGN KEY ("resource_id", "userId") REFERENCES "resources"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "resource_reviews_resource_id_owned_fk_idx" ON "resource_reviews" ("resource_id", "userId");
--> statement-breakpoint
ALTER TABLE "person_need_hypotheses" ADD CONSTRAINT "person_need_hypotheses_person_id_owned_fk" FOREIGN KEY ("person_id", "userId") REFERENCES "people_resources"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "person_need_hypotheses_person_id_owned_fk_idx" ON "person_need_hypotheses" ("person_id", "userId");
--> statement-breakpoint
ALTER TABLE "communication_plans" ADD CONSTRAINT "communication_plans_person_id_owned_fk" FOREIGN KEY ("person_id", "userId") REFERENCES "people_resources"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "communication_plans_person_id_owned_fk_idx" ON "communication_plans" ("person_id", "userId");
--> statement-breakpoint
ALTER TABLE "communication_results" ADD CONSTRAINT "communication_results_communication_plan_id_owned_fk" FOREIGN KEY ("communication_plan_id", "userId") REFERENCES "communication_plans"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "communication_results_communication_plan_id_owned_fk_idx" ON "communication_results" ("communication_plan_id", "userId");
--> statement-breakpoint
ALTER TABLE "spend_conversions" ADD CONSTRAINT "spend_conversions_event_case_id_owned_fk" FOREIGN KEY ("event_case_id", "userId") REFERENCES "event_cases"(id, "userId") ON DELETE SET NULL ("event_case_id");
--> statement-breakpoint
CREATE INDEX "spend_conversions_event_case_id_owned_fk_idx" ON "spend_conversions" ("event_case_id", "userId");
--> statement-breakpoint
ALTER TABLE "spend_conversions" ADD CONSTRAINT "spend_conversions_rule_id_owned_fk" FOREIGN KEY ("rule_id", "userId") REFERENCES "confirmation_rules"(id, "userId") ON DELETE SET NULL ("rule_id");
--> statement-breakpoint
CREATE INDEX "spend_conversions_rule_id_owned_fk_idx" ON "spend_conversions" ("rule_id", "userId");
--> statement-breakpoint
ALTER TABLE "entertainment_assessments" ADD CONSTRAINT "entertainment_assessments_session_id_owned_fk" FOREIGN KEY ("session_id", "userId") REFERENCES "entertainment_sessions"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "entertainment_assessments_session_id_owned_fk_idx" ON "entertainment_assessments" ("session_id", "userId");
--> statement-breakpoint
ALTER TABLE "entertainment_reflections" ADD CONSTRAINT "entertainment_reflections_session_id_owned_fk" FOREIGN KEY ("session_id", "userId") REFERENCES "entertainment_sessions"(id, "userId") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "entertainment_reflections_session_id_owned_fk_idx" ON "entertainment_reflections" ("session_id", "userId");
--> statement-breakpoint
ALTER TABLE "entertainment_reflections" ADD CONSTRAINT "entertainment_reflections_ash_memo_id_owned_fk" FOREIGN KEY ("ash_memo_id", "userId") REFERENCES "ash_memos"(id, "userId") ON DELETE SET NULL ("ash_memo_id");
--> statement-breakpoint
CREATE INDEX "entertainment_reflections_ash_memo_id_owned_fk_idx" ON "entertainment_reflections" ("ash_memo_id", "userId");
--> statement-breakpoint
ALTER TABLE "entertainment_reflections" ADD CONSTRAINT "entertainment_reflections_confirmation_rule_id_owned_fk" FOREIGN KEY ("confirmation_rule_id", "userId") REFERENCES "confirmation_rules"(id, "userId") ON DELETE SET NULL ("confirmation_rule_id");
--> statement-breakpoint
CREATE INDEX "entertainment_reflections_confirmation_rule_id_owned_fk_idx" ON "entertainment_reflections" ("confirmation_rule_id", "userId");
--> statement-breakpoint
CREATE FUNCTION check_owned_reference() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_table text; parent_id integer; owner_id text; found boolean;
BEGIN
 parent_id := (to_jsonb(NEW)->>TG_ARGV[0])::integer;
 IF parent_id IS NULL THEN RETURN NEW; END IF;
 parent_table := TG_ARGV[2]::jsonb ->> (to_jsonb(NEW)->>TG_ARGV[1]);
 IF parent_table IS NULL THEN RAISE EXCEPTION 'Unsupported internal reference' USING ERRCODE='23503'; END IF;
 owner_id := to_jsonb(NEW)->>'userId';
 EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE id=$1 AND "userId"=$2)',parent_table) INTO found USING parent_id,owner_id;
 IF NOT found THEN RAISE EXCEPTION 'Referenced record does not belong to account' USING ERRCODE='23503'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE FUNCTION detach_owned_reference() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_ARGV[4]='cascade' THEN
 EXECUTE format('DELETE FROM %I WHERE %I=$1 AND "userId"=$2 AND %I=$3',TG_ARGV[0],TG_ARGV[1],TG_ARGV[2]) USING OLD.id,OLD."userId",TG_ARGV[3];
 ELSE
 EXECUTE format('UPDATE %I SET %I=NULL WHERE %I=$1 AND "userId"=$2 AND %I=$3',TG_ARGV[0],TG_ARGV[1],TG_ARGV[1],TG_ARGV[2]) USING OLD.id,OLD."userId",TG_ARGV[3];
 END IF;
 RETURN OLD;
END $$;
--> statement-breakpoint
CREATE TRIGGER check_unified_cards_context_id BEFORE INSERT OR UPDATE ON "unified_cards" FOR EACH ROW EXECUTE FUNCTION check_owned_reference('context_id','context_type','{"boundary": "execution_boundaries", "event": "event_cases", "task": "tree_tasks"}');
--> statement-breakpoint
CREATE TRIGGER detach_unified_cards_boundary BEFORE DELETE ON "execution_boundaries" FOR EACH ROW EXECUTE FUNCTION detach_owned_reference('unified_cards','context_id','context_type','boundary','cascade');
--> statement-breakpoint
CREATE TRIGGER detach_unified_cards_event BEFORE DELETE ON "event_cases" FOR EACH ROW EXECUTE FUNCTION detach_owned_reference('unified_cards','context_id','context_type','event','cascade');
--> statement-breakpoint
CREATE TRIGGER detach_unified_cards_task BEFORE DELETE ON "tree_tasks" FOR EACH ROW EXECUTE FUNCTION detach_owned_reference('unified_cards','context_id','context_type','task','cascade');
--> statement-breakpoint
CREATE TRIGGER check_confirmation_rules_source_id BEFORE INSERT OR UPDATE ON "confirmation_rules" FOR EACH ROW EXECUTE FUNCTION check_owned_reference('source_id','source_type','{"ash_memo": "ash_memos", "mistake_review": "mistake_reviews", "mind_review": "mind_regulation_reviews"}');
--> statement-breakpoint
CREATE TRIGGER detach_confirmation_rules_ash_memo BEFORE DELETE ON "ash_memos" FOR EACH ROW EXECUTE FUNCTION detach_owned_reference('confirmation_rules','source_id','source_type','ash_memo','detach');
--> statement-breakpoint
CREATE TRIGGER detach_confirmation_rules_mistake_review BEFORE DELETE ON "mistake_reviews" FOR EACH ROW EXECUTE FUNCTION detach_owned_reference('confirmation_rules','source_id','source_type','mistake_review','detach');
--> statement-breakpoint
CREATE TRIGGER detach_confirmation_rules_mind_review BEFORE DELETE ON "mind_regulation_reviews" FOR EACH ROW EXECUTE FUNCTION detach_owned_reference('confirmation_rules','source_id','source_type','mind_review','detach');
--> statement-breakpoint
CREATE TRIGGER check_execution_boundaries_source_id BEFORE INSERT OR UPDATE ON "execution_boundaries" FOR EACH ROW EXECUTE FUNCTION check_owned_reference('source_id','source_type','{"task": "tree_tasks", "demand": "demands", "relationship": "relationships", "purchase": "spending_reviews"}');
--> statement-breakpoint
CREATE TRIGGER detach_execution_boundaries_task BEFORE DELETE ON "tree_tasks" FOR EACH ROW EXECUTE FUNCTION detach_owned_reference('execution_boundaries','source_id','source_type','task','detach');
--> statement-breakpoint
CREATE TRIGGER detach_execution_boundaries_demand BEFORE DELETE ON "demands" FOR EACH ROW EXECUTE FUNCTION detach_owned_reference('execution_boundaries','source_id','source_type','demand','detach');
--> statement-breakpoint
CREATE TRIGGER detach_execution_boundaries_relationship BEFORE DELETE ON "relationships" FOR EACH ROW EXECUTE FUNCTION detach_owned_reference('execution_boundaries','source_id','source_type','relationship','detach');
--> statement-breakpoint
CREATE TRIGGER detach_execution_boundaries_purchase BEFORE DELETE ON "spending_reviews" FOR EACH ROW EXECUTE FUNCTION detach_owned_reference('execution_boundaries','source_id','source_type','purchase','detach');
--> statement-breakpoint
CREATE TRIGGER check_weakness_events_source_id BEFORE INSERT OR UPDATE ON "weakness_events" FOR EACH ROW EXECUTE FUNCTION check_owned_reference('source_id','source_type','{"task": "tree_tasks", "purchase": "spending_reviews", "relationship": "relationships", "review": "mistake_reviews", "confirmation": "critical_confirmations", "demand": "demands"}');
--> statement-breakpoint
CREATE TRIGGER detach_weakness_events_task BEFORE DELETE ON "tree_tasks" FOR EACH ROW EXECUTE FUNCTION detach_owned_reference('weakness_events','source_id','source_type','task','detach');
--> statement-breakpoint
CREATE TRIGGER detach_weakness_events_purchase BEFORE DELETE ON "spending_reviews" FOR EACH ROW EXECUTE FUNCTION detach_owned_reference('weakness_events','source_id','source_type','purchase','detach');
--> statement-breakpoint
CREATE TRIGGER detach_weakness_events_relationship BEFORE DELETE ON "relationships" FOR EACH ROW EXECUTE FUNCTION detach_owned_reference('weakness_events','source_id','source_type','relationship','detach');
--> statement-breakpoint
CREATE TRIGGER detach_weakness_events_review BEFORE DELETE ON "mistake_reviews" FOR EACH ROW EXECUTE FUNCTION detach_owned_reference('weakness_events','source_id','source_type','review','detach');
--> statement-breakpoint
CREATE TRIGGER detach_weakness_events_confirmation BEFORE DELETE ON "critical_confirmations" FOR EACH ROW EXECUTE FUNCTION detach_owned_reference('weakness_events','source_id','source_type','confirmation','detach');
--> statement-breakpoint
CREATE TRIGGER detach_weakness_events_demand BEFORE DELETE ON "demands" FOR EACH ROW EXECUTE FUNCTION detach_owned_reference('weakness_events','source_id','source_type','demand','detach');
--> statement-breakpoint
CREATE TRIGGER check_resource_links_linked_id BEFORE INSERT OR UPDATE ON "resource_links" FOR EACH ROW EXECUTE FUNCTION check_owned_reference('linked_id','linked_type','{"task": "tree_tasks", "ash_memo": "ash_memos", "okr": "objectives"}');
--> statement-breakpoint
CREATE TRIGGER detach_resource_links_task BEFORE DELETE ON "tree_tasks" FOR EACH ROW EXECUTE FUNCTION detach_owned_reference('resource_links','linked_id','linked_type','task','detach');
--> statement-breakpoint
CREATE TRIGGER detach_resource_links_ash_memo BEFORE DELETE ON "ash_memos" FOR EACH ROW EXECUTE FUNCTION detach_owned_reference('resource_links','linked_id','linked_type','ash_memo','detach');
--> statement-breakpoint
CREATE TRIGGER detach_resource_links_okr BEFORE DELETE ON "objectives" FOR EACH ROW EXECUTE FUNCTION detach_owned_reference('resource_links','linked_id','linked_type','okr','detach');
