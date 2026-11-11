ALTER TABLE "event_reviews" ADD COLUMN "linked_rule_id" integer;
--> statement-breakpoint
ALTER TABLE "event_reviews" ADD CONSTRAINT "event_reviews_linked_rule_id_owned_fk" FOREIGN KEY ("linked_rule_id", "userId") REFERENCES "confirmation_rules" ("id", "userId") ON DELETE SET NULL ("linked_rule_id");
--> statement-breakpoint
CREATE INDEX "event_reviews_linked_rule_id_owned_fk_idx" ON "event_reviews" ("linked_rule_id", "userId");
--> statement-breakpoint
DROP TRIGGER check_confirmation_rules_source_id ON "confirmation_rules";
--> statement-breakpoint
CREATE TRIGGER check_confirmation_rules_source_id BEFORE INSERT OR UPDATE ON "confirmation_rules" FOR EACH ROW EXECUTE FUNCTION check_owned_reference('source_id','source_type','{"ash_memo": "ash_memos", "mistake_review": "mistake_reviews", "mind_review": "mind_regulation_reviews", "event_review": "event_reviews"}');
--> statement-breakpoint
CREATE TRIGGER detach_confirmation_rules_event_review BEFORE DELETE ON "event_reviews" FOR EACH ROW EXECUTE FUNCTION detach_owned_reference('confirmation_rules','source_id','source_type','event_review','detach');
