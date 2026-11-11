import { randomUUID } from "node:crypto";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import RuleDetailPage from "@/app/rules/[id]/page";
import { Pool } from "pg";
import { pool } from "@/db";
import { identity } from "./identity";
import * as events from "@/app/actions/event-library";
import * as evidence from "@/app/actions/evidence-review";
import * as intercept from "@/app/actions/intercept";
import * as rules from "@/app/actions/rules";
import * as trigger from "@/app/actions/experience-trigger";
import { describeRuleFeedback } from "@/lib/domain/experience-trigger";
import { ashMemoSchema, reviewSchema } from "@/lib/validation";

// Isolate only client-side router controls; render the actual report UI/data.
vi.mock("@/components/rule-detail-actions", () => ({
  RuleDetailActions: () => null,
}));

// Regression expectations for the candidate patch, not claims about the
// original deployment. Every database operation uses synthetic test accounts.
const ACCOUNT_A = "af-account-a";
const ACCOUNT_B = "af-account-b";
const admin = new Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});

function successful<T extends object>(value: T): Exclude<T, { error: string }> {
  expect(value).not.toHaveProperty("error");
  return value as Exclude<T, { error: string }>;
}

async function event() {
  const result = successful(
    await events.createEventCase({
      title: `candidate event ${randomUUID()}`,
      eventType: "study",
      scene: "classroom",
      status: "solved",
      impactLevel: "high",
    }),
  );
  return result.eventCase!.id;
}

async function rule(isActive = false) {
  return successful(
    await rules.createRule({
      domain: "study",
      scenario: "classroom",
      ruleText: `核对版本 ${randomUUID()}`,
      isActive,
    }),
  ).id!;
}

async function initialVersion(ruleId: number) {
  return (
    await admin.query(
      'SELECT * FROM intervention_rule_versions WHERE rule_id=$1 AND "userId"=$2 ORDER BY version',
      [ruleId, ACCOUNT_A],
    )
  ).rows;
}

async function originalReview() {
  return successful(
    await evidence.submitReview(
      reviewSchema.parse({
        mistakeType: "Synthetic missed version check",
        loss: "Synthetic lost preparation time",
        stateWhenError: "rushed",
        generateRule: false,
      }),
    ),
  ).reviewId;
}

beforeAll(async () => {
  for (const name of ["DATABASE_URL", "MIGRATION_DATABASE_URL"] as const) {
    const value = process.env[name];
    if (!value || !new URL(value).pathname.endsWith("_test"))
      throw new Error(
        "Candidate regressions require a dedicated _test database",
      );
  }
  for (const id of [ACCOUNT_A, ACCOUNT_B])
    await admin.query(
      'INSERT INTO "user" (id,name,email) VALUES ($1,$1,$2) ON CONFLICT (id) DO NOTHING',
      [id, `${id}@ruleloop.test`],
    );
});

beforeEach(() => {
  identity.userId = ACCOUNT_A;
});

afterAll(async () => {
  await admin.end();
  await pool.end();
});

describe("candidate: concrete rule provenance and account ownership", () => {
  it("enforces the event-review source mapping in PostgreSQL, allowing owned and rejecting foreign sources", async () => {
    identity.userId = ACCOUNT_B;
    const foreign = successful(
      await events.submitMiniReview({
        eventId: await event(),
        whatHappened: "Synthetic foreign source",
        rootCause: "over_confidence",
      }),
    );
    identity.userId = ACCOUNT_A;
    const owned = successful(
      await events.submitMiniReview({
        eventId: await event(),
        whatHappened: "Synthetic owned source",
        rootCause: "over_confidence",
      }),
    );
    const ruleId = await rule();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.user_id',$1,true)", [
        ACCOUNT_A,
      ]);
      await client.query(
        "UPDATE confirmation_rules SET source_type=$1,source_id=$2 WHERE id=$3",
        ["event_review", owned.review.id, ruleId],
      );
      await client.query("ROLLBACK");
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.user_id',$1,true)", [
        ACCOUNT_A,
      ]);
      await expect(
        client.query(
          "UPDATE confirmation_rules SET source_type=$1,source_id=$2 WHERE id=$3",
          ["event_review", foreign.review.id, ruleId],
        ),
      ).rejects.toMatchObject({ code: "23503" });
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
  it("links an event review and its new formal rule in both directions", async () => {
    const eventId = await event();
    const result = successful(
      await events.submitMiniReview({
        eventId,
        whatHappened: "Synthetic: submitted without understanding the example",
        rootCause: "over_confidence",
        prevention: "Locate one unclear sentence",
        newRuleText: "Write one actual blocker before using a complete answer",
      }),
    );
    const storedRule = await rules.getRule(result.newRuleId!);
    expect(storedRule).toMatchObject({
      sourceType: "event_review",
      sourceId: result.review.id,
      sourceReviewId: null,
      status: "draft",
      isActive: false,
    });
    const reviewRow = (
      await admin.query(
        'SELECT event_id, linked_rule_id FROM event_reviews WHERE id=$1 AND "userId"=$2',
        [result.review.id, ACCOUNT_A],
      )
    ).rows[0];
    expect(reviewRow).toEqual({
      event_id: eventId,
      linked_rule_id: result.newRuleId,
    });
    expect(await initialVersion(result.newRuleId!)).toHaveLength(1);
  });

  it("persists which existing owned rule was linked to an event review", async () => {
    const ruleId = await rule(true);
    const eventId = await event();
    const result = successful(
      await events.submitMiniReview({
        eventId,
        whatHappened: "Synthetic repeat of the version risk",
        rootCause: "leaving_without_checking",
        linkedRuleId: ruleId,
      }),
    );
    expect(result.newRuleId).toBeNull();
    expect(
      (
        await admin.query(
          'SELECT linked_rule_id FROM event_reviews WHERE id=$1 AND "userId"=$2',
          [result.review.id, ACCOUNT_A],
        )
      ).rows[0].linked_rule_id,
    ).toBe(ruleId);
    expect((await rules.getRule(ruleId))?.matchCount).toBe(1);
  });

  it.each(["foreign account", "missing"])(
    "rejects an existing-rule link to %s without leaving a partial review",
    async (target) => {
      identity.userId = ACCOUNT_B;
      const foreignId = await rule(true);
      identity.userId = ACCOUNT_A;
      const eventId = await event();
      const linkedRuleId =
        target === "foreign account" ? foreignId : 2147483647;
      const result = await events.submitMiniReview({
        eventId,
        whatHappened: "Synthetic rejected link",
        rootCause: "over_confidence",
        linkedRuleId,
      });
      expect(result).toHaveProperty("error");
      expect((await events.getEventCase(eventId))?.eventCase.reviewed).toBe(
        false,
      );
      expect(
        (
          await admin.query(
            'SELECT id FROM event_reviews WHERE event_id=$1 AND "userId"=$2',
            [eventId, ACCOUNT_A],
          )
        ).rows,
      ).toHaveLength(0);
      identity.userId = ACCOUNT_B;
      expect((await rules.getRule(foreignId))?.matchCount).toBe(0);
    },
  );

  it("preserves an event-derived rule but detaches its deleted review source", async () => {
    const eventId = await event();
    const result = successful(
      await events.submitMiniReview({
        eventId,
        whatHappened: "Synthetic deletion provenance",
        rootCause: "leaving_without_checking",
        newRuleText: "Reopen final file before submission",
      }),
    );
    successful(await events.deleteEventCase(eventId));
    expect(await events.getEventCase(eventId)).toBeNull();
    expect(await rules.getRule(result.newRuleId!)).toMatchObject({
      sourceType: "event_review",
      sourceId: null,
      sourceReviewId: null,
    });
    expect(
      (
        await admin.query("SELECT id FROM event_reviews WHERE id=$1", [
          result.review.id,
        ])
      ).rows,
    ).toHaveLength(0);
  });

  it("creates an ash rule with consistent active state, source and initial version", async () => {
    const result = successful(
      await intercept.createAshMemo(
        ashMemoSchema.parse({
          lesson: "Synthetic: do not repeat the unchecked submission",
          principle: "Check the actual final file",
          interceptionRule: "Open the final file and verify its contents",
          ignoredFact: "There were two versions",
          domain: "study",
        }),
      ),
    );
    expect(await rules.getRule(result.ruleId!)).toMatchObject({
      sourceType: "ash_memo",
      sourceId: result.id,
      status: "active",
      isActive: true,
      currentVersion: 1,
      triggerText: expect.any(String),
      recommendedAction: "Open the final file and verify its contents",
    });
    expect(await initialVersion(result.ruleId!)).toHaveLength(1);
  });

  it("links a later-added ash rule to the existing memo, without duplicating on another edit", async () => {
    const memo = successful(
      await intercept.createAshMemo(
        ashMemoSchema.parse({
          lesson: "Synthetic lesson without an initial rule",
        }),
      ),
    );
    expect(memo.ruleId).toBeNull();
    const added = successful(
      await intercept.updateAshMemo({
        id: memo.id,
        domain: "study",
        interceptionRule: "Check both filename and contents",
      }),
    );
    expect(await rules.getRule(added.ruleId!)).toMatchObject({
      sourceType: "ash_memo",
      sourceId: memo.id,
      status: "active",
      isActive: true,
      currentVersion: 1,
    });
    successful(
      await intercept.updateAshMemo({
        id: memo.id,
        title: "Synthetic renamed memo",
      }),
    );
    expect(await initialVersion(added.ruleId!)).toHaveLength(1);
    expect(
      (
        await admin.query(
          'SELECT id FROM confirmation_rules WHERE source_type=$1 AND source_id=$2 AND "userId"=$3',
          ["ash_memo", memo.id, ACCOUNT_A],
        )
      ).rows,
    ).toHaveLength(1);
  });

  it("creates an explicit mistake-review source and versioned draft", async () => {
    const review = successful(
      await evidence.submitReview(
        reviewSchema.parse({
          mistakeType: "Synthetic wrong attachment",
          stateWhenError: "rushed",
          newRule: "Reopen the attachment before sending",
          generateRule: true,
        }),
      ),
    );
    expect(await rules.getRule(review.ruleId!)).toMatchObject({
      sourceType: "mistake_review",
      sourceId: review.reviewId,
      sourceReviewId: review.reviewId,
      status: "draft",
      isActive: false,
      currentVersion: 1,
    });
    expect(await initialVersion(review.ruleId!)).toHaveLength(1);
  });

  it("normalises createRule's review source so the owned-reference trigger accepts it", async () => {
    const reviewId = await originalReview();
    const created = successful(
      await rules.createRule({
        domain: "study",
        ruleText: "Synthetic manually linked review rule",
        sourceReviewId: reviewId,
        isActive: false,
      }),
    );
    expect(await rules.getRule(created.id!)).toMatchObject({
      sourceType: "mistake_review",
      sourceId: reviewId,
      sourceReviewId: reviewId,
    });
  });
});

describe("candidate: honest feedback semantics", () => {
  it("does not turn an unknown result into noncompliance", () => {
    expect(
      describeRuleFeedback({
        decisionQuality: "unclear",
        ruleHelpfulness: "unclear",
      }),
    ).toEqual({
      good: false,
      tone: "unknown",
      title: "结果待确认",
    });
  });

  it.each([
    { decisionQuality: "better", ruleHelpfulness: "harmful" },
    { decisionQuality: "worse", ruleHelpfulness: "helpful" },
    { decisionQuality: "same", ruleHelpfulness: "neutral" },
  ])(
    "does not colour contradictory or nonpositive feedback as good: %o",
    (input) => {
      expect(describeRuleFeedback(input).good).toBe(false);
    },
  );

  it("can present an explicit helpful self-report as helpful", () => {
    expect(
      describeRuleFeedback({
        decisionQuality: "unclear",
        ruleHelpfulness: "helpful",
      }).good,
    ).toBe(true);
  });

  it("persists an unknown real validation without increasing helpful counts or labelling it noncompliance", async () => {
    const scene = `af-${randomUUID()}`;
    const ruleId = successful(
      await rules.createRule({
        domain: "custom",
        scenario: scene,
        ruleText: "Synthetic unknown-feedback fixture",
        isActive: true,
      }),
    ).id!;
    const session = successful(
      await trigger.createTriggerSession({
        sceneType: scene,
        sceneSummary: "Synthetic preparation decision; outcome is not known",
        idempotencyKey: `af-${randomUUID()}`,
      }),
    );
    successful(
      await trigger.recordTriggerChoice({
        sessionId: session.session.id,
        choice: "postpone",
      }),
    );
    successful(await trigger.openTriggerValidation(session.session.id));
    successful(
      await trigger.submitChoiceValidation({
        sessionId: session.session.id,
        actualOutcome:
          "Synthetic: I recorded a plan, but do not know the result yet",
        costDelta: 0,
        emotionDelta: 0,
        decisionQuality: "unclear",
        ruleHelpfulness: "unclear",
        followupAction: "none",
      }),
    );
    expect(await rules.getRule(ruleId)).toMatchObject({
      helpfulCount: 0,
      validatedCount: 1,
    });
    const reports = await rules.getRuleValidations(ruleId);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ good: false, title: "结果待确认" });
    expect(reports[0].title).not.toContain("未遵守");
    const html = renderToStaticMarkup(
      await RuleDetailPage({ params: Promise.resolve({ id: String(ruleId) }) }),
    );
    const badge = html.match(/<span class="([^"]*)">结果待确认<\/span>/);
    expect(badge).not.toBeNull();
    expect(badge![1]).toContain("text-muted-foreground");
    expect(badge![1]).not.toContain("text-destructive");
    expect(
      (
        await admin.query(
          'SELECT decision_quality,rule_helpfulness,followup_action FROM choice_validations WHERE trigger_session_id=$1 AND "userId"=$2',
          [session.session.id, ACCOUNT_A],
        )
      ).rows[0],
    ).toEqual({
      decision_quality: "unclear",
      rule_helpfulness: "unclear",
      followup_action: "none",
    });
  });
});
