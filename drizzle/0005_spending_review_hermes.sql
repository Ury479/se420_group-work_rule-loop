CREATE TABLE "spending_review_jobs" (
	"review_id" integer PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"lease_token" uuid,
	"lease_until" timestamp with time zone,
	"result" jsonb,
	"error_code" text,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spending_review_jobs_status" CHECK ("spending_review_jobs"."status" in ('queued', 'running', 'failed', 'succeeded')),
	CONSTRAINT "spending_review_jobs_lease" CHECK (
      ("spending_review_jobs"."status" = 'running' AND "spending_review_jobs"."lease_token" IS NOT NULL AND "spending_review_jobs"."lease_until" IS NOT NULL)
      OR ("spending_review_jobs"."status" <> 'running' AND "spending_review_jobs"."lease_token" IS NULL AND "spending_review_jobs"."lease_until" IS NULL)
    ),
	CONSTRAINT "spending_review_jobs_outcome" CHECK (
      ("spending_review_jobs"."status" = 'succeeded') = ("spending_review_jobs"."result" IS NOT NULL)
      AND ("spending_review_jobs"."status" = 'failed') = ("spending_review_jobs"."error_code" IS NOT NULL)
    )
);
--> statement-breakpoint
ALTER TABLE "spending_reviews" ADD COLUMN "request_id" uuid;--> statement-breakpoint
ALTER TABLE "spending_review_jobs" ADD CONSTRAINT "spending_review_jobs_owned_review" FOREIGN KEY ("review_id","userId") REFERENCES "public"."spending_reviews"("id","userId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "spending_review_jobs_queue" ON "spending_review_jobs" USING btree ("queued_at","review_id") WHERE "spending_review_jobs"."status" = 'queued';--> statement-breakpoint
CREATE UNIQUE INDEX "spending_reviews_account_request" ON "spending_reviews" USING btree ("userId","request_id");
--> statement-breakpoint
ALTER TABLE "spending_review_jobs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "spending_review_jobs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "spending_review_jobs"
USING ("userId" = current_setting('app.user_id', true))
WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
CREATE POLICY review_worker_read ON "spending_review_jobs" FOR SELECT
USING (current_user = 'ruleloop_review_worker');
--> statement-breakpoint
CREATE POLICY review_worker_update ON "spending_review_jobs" FOR UPDATE
USING (current_user = 'ruleloop_review_worker')
WITH CHECK (current_user = 'ruleloop_review_worker');
