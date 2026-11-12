CREATE TABLE "habit_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"habit_id" uuid NOT NULL,
	"paper_id" uuid,
	"progress" text,
	"next_step" text,
	"evidence_url" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "habit_papers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"habit_id" uuid NOT NULL,
	"title" text NOT NULL,
	"direction" text DEFAULT 'ai' NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"next_step" text,
	CONSTRAINT "habit_papers_direction" CHECK ("habit_papers"."direction" in ('ai', 'network'))
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'quick' NOT NULL,
	"active_slot" smallint,
	"next_step" text,
	"breakpoint" jsonb,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "habits_slot_range" CHECK ("habits"."active_slot" in (1, 2)),
	CONSTRAINT "habits_deleted_slot" CHECK ("habits"."deleted_at" is null or "habits"."active_slot" is null),
	CONSTRAINT "habits_kind" CHECK ("habits"."kind" in ('quick', 'project', 'reading'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "habit_papers_owned_context" ON "habit_papers" USING btree ("id","habit_id","userId");
--> statement-breakpoint
CREATE UNIQUE INDEX "habits_owned_id" ON "habits" USING btree ("id","userId");
--> statement-breakpoint
ALTER TABLE "habit_checkins" ADD CONSTRAINT "habit_checkins_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "habit_checkins" ADD CONSTRAINT "habit_checkins_owned_habit" FOREIGN KEY ("habit_id","userId") REFERENCES "public"."habits"("id","userId") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "habit_checkins" ADD CONSTRAINT "habit_checkins_owned_paper" FOREIGN KEY ("paper_id","habit_id","userId") REFERENCES "public"."habit_papers"("id","habit_id","userId") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "habit_papers" ADD CONSTRAINT "habit_papers_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "habit_papers" ADD CONSTRAINT "habit_papers_owned_habit" FOREIGN KEY ("habit_id","userId") REFERENCES "public"."habits"("id","userId") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "habit_checkins_recent" ON "habit_checkins" USING btree ("userId","occurred_at");
--> statement-breakpoint
CREATE INDEX "habit_checkins_context" ON "habit_checkins" USING btree ("habit_id","userId","paper_id","occurred_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "habit_papers_current" ON "habit_papers" USING btree ("habit_id","userId") WHERE "habit_papers"."is_current";
--> statement-breakpoint
CREATE INDEX "habit_papers_by_habit" ON "habit_papers" USING btree ("habit_id","userId");
--> statement-breakpoint
CREATE UNIQUE INDEX "habits_active_slot" ON "habits" USING btree ("userId","active_slot") WHERE "habits"."active_slot" is not null;
--> statement-breakpoint
CREATE UNIQUE INDEX "habits_name" ON "habits" USING btree ("userId",lower("name")) WHERE "habits"."deleted_at" is null;
--> statement-breakpoint
ALTER TABLE "habits" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "habits" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "habits"
USING ("userId" = current_setting('app.user_id', true))
WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "habit_papers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "habit_papers" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "habit_papers"
USING ("userId" = current_setting('app.user_id', true))
WITH CHECK ("userId" = current_setting('app.user_id', true));
--> statement-breakpoint
ALTER TABLE "habit_checkins" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "habit_checkins" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY account_owner ON "habit_checkins"
USING ("userId" = current_setting('app.user_id', true))
WITH CHECK ("userId" = current_setting('app.user_id', true));
