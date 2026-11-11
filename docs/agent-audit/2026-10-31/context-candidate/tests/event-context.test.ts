import { describe, expect, it } from "vitest";
import { assertSameEventSnapshot, buildEventAgentContext, projectEventSource, validateEventCitations, type ContextSource } from "../src/lib/agent/event-context";

const event = (): ContextSource => ({ kind: "event", id: 1, userId: "account-a", state: "searching", version: null, fields: { title: "Current decision", scene: "custom" }, parents: [] });
const review = (): ContextSource => ({ kind: "event_review", id: 2, userId: "account-a", state: null, version: null, fields: { whatHappened: "I started implementation before defining a goal." }, parents: [{ kind: "event", id: 1 }] });
const rule = (): ContextSource => ({ kind: "confirmation_rule", id: 1, userId: "account-a", state: "active", version: 1, fields: { ruleText: "Clarify the goal first", triggerText: "Clarify the goal first", recommendedAction: "Write the acceptance criteria", triggerCondition: "The goal is unclear", sourceType: "event_review" }, parents: [{ kind: "event_review", id: 2 }] });
const version = (): ContextSource => ({ kind: "rule_version", id: 1, userId: "account-a", state: null, version: 1, fields: { triggerTextSnapshot: "Clarify the goal first", actionSnapshot: "Write the acceptance criteria" }, parents: [{ kind: "confirmation_rule", id: 1 }] });
const snapshot = (sources = [event(), review(), rule(), version()], language: "zh" | "en" | "th" = "zh") => buildEventAgentContext({ accountId: "account-a", eventId: 1, language, sources });

describe("existing-object context projections", () => {
  it("permits a new event with no established lesson", () => {
    const context = snapshot([event()]);
    expect(context.payload.ruleCandidates).toEqual([]);
    expect(context.payload.warnings).toContain("no_admissible_rule_candidate");
  });
  it("keeps owner identities and raw database ids out of the model payload", () => {
    expect(JSON.stringify(snapshot().payload)).not.toContain("account-a");
    expect(snapshot().bindings).toContainEqual({ ref: expect.any(String), kind: "event", id: 1 });
  });
  it("rejects rather than silently drops a foreign-account source", () => {
    expect(() => snapshot([event(), { ...review(), userId: "account-b" }])).toThrow("account_mismatch");
  });
  it("preserves different rule kinds with the same numeric id", () => {
    const candidate: ContextSource = { ...rule(), kind: "event_candidate_rule", fields: { ruleText: "Candidate only" }, state: "candidate", parents: [{ kind: "event", id: 1 }] };
    const context = snapshot([event(), review(), rule(), version(), candidate]);
    expect(context.payload.ruleCandidates).toHaveLength(2);
    expect(new Set(context.bindings.map(item => item.ref)).size).toBe(5);
  });
  it("does not turn a complete active rule into confirmed applicability", () => {
    expect(snapshot().payload.ruleCandidates[0]).toMatchObject({ mayAssessForCurrentSituation: true, applicability: "unassessed", effectiveness: "not_inferred" });
  });
  it("omits missing-origin rule bodies and explains the limitation", () => {
    const context = snapshot([event(), rule(), version()]);
    expect(JSON.stringify(context.payload)).not.toContain("Clarify the goal first");
    expect(context.payload.warnings).toContain("missing_origin");
  });
  it("omits paused rules and their version descendants", () => {
    const context = snapshot([event(), review(), { ...rule(), state: "paused" }, version()]);
    expect(context.payload.sources.map(item => item.kind)).not.toContain("confirmation_rule");
    expect(context.payload.sources.map(item => item.kind)).not.toContain("rule_version");
  });
  it("does not reintroduce a superseded lesson through an active derived rule", () => {
    const memo: ContextSource = { ...review(), kind: "ash_memo", state: "superseded", fields: { lessonStatement: "withdrawn painful lesson" }, parents: [] };
    const context = snapshot([event(), memo, { ...rule(), fields: { ...rule().fields, sourceType: "ash_memo" }, parents: [{ kind: "ash_memo", id: 2 }] }, version()]);
    expect(JSON.stringify(context.payload)).not.toContain("withdrawn painful lesson");
    expect(context.payload.ruleCandidates).toEqual([]);
  });
  it("detects source edits even when the original record has no updatedAt", () => {
    const previous = snapshot();
    const changed = review(); changed.fields.whatHappened = "Corrected personal account";
    expect(() => assertSameEventSnapshot(previous, snapshot([event(), changed, rule(), version()]))).toThrow("stale_context");
  });
  it("does not change hashes for source or field ordering", () => {
    const a = snapshot();
    const b = snapshot([version(), rule(), review(), { ...event(), fields: { scene: "custom", title: "Current decision" } }]);
    expect(a.snapshotHash).toBe(b.snapshotHash);
    expect(a.requestHash).toBe(b.requestHash);
  });
  it.each(["zh", "en", "th"] as const)("retains original evidence while tagging %s output", language => {
    const context = snapshot(undefined, language);
    expect(context.payload.language).toBe(language);
    expect(context.payload.sources.find(item => item.kind === "event_review")?.fields.whatHappened).toBe(review().fields.whatHappened);
    expect(context.snapshotHash).toBe(snapshot().snapshotHash);
    if (language !== "zh") expect(context.requestHash).not.toBe(snapshot().requestHash);
  });
  it("accepts only a quote found in the specified source field", () => {
    const context = snapshot();
    const ref = context.payload.sources.find(item => item.kind === "event_review")!.ref;
    expect(validateEventCitations([{ sourceRef: ref, field: "whatHappened", quote: "before defining a goal" }], context)).toHaveLength(1);
    expect(() => validateEventCitations([{ sourceRef: ref, field: "rootCause", quote: "before defining a goal" }], context)).toThrow("unsupported_citation");
    expect(() => validateEventCitations([{ sourceRef: "invented", field: "whatHappened", quote: "before defining a goal" }], context)).toThrow("unsupported_citation");
  });
  it("does not invent an absent current rule version", () => {
    const context = snapshot([event(), review(), rule()]);
    expect(context.payload.ruleCandidates[0].mayAssessForCurrentSituation).toBe(false);
    expect(context.payload.warnings).toContain("current_rule_version_missing");
  });
  it("does not accept a version snapshot inconsistent with current rule text", () => {
    const context = snapshot([event(), review(), rule(), { ...version(), fields: { ...version().fields, actionSnapshot: "Different action" } }]);
    expect(context.payload.ruleCandidates[0].mayAssessForCurrentSituation).toBe(false);
    expect(context.payload.warnings).toContain("current_rule_version_inconsistent");
  });
  it("rejects duplicate ids within one source kind and relationships outside the original model", () => {
    expect(() => snapshot([event(), event()])).toThrow("duplicate_source");
    expect(() => snapshot([event(), { ...review(), parents: [{ kind: "event_review", id: 2 }] }])).toThrow("invalid_source_relationship");
    expect(() => snapshot([event(), review(), { ...rule(), parents: [{ kind: "event", id: 1 }] }, version()])).toThrow("invalid_source_relationship");
  });
  it("does not choose arbitrarily among duplicate current-version records", () => {
    const context = snapshot([event(),review(),rule(),version(),{...version(),id:9}]);
    expect(context.payload.ruleCandidates[0].mayAssessForCurrentSituation).toBe(false);
    expect(context.payload.warnings).toContain("current_rule_version_ambiguous");
  });
  it("requires actual version metadata for main rules and their snapshots", () => {
    expect(() => snapshot([event(),review(),{...rule(),version:null},version()])).toThrow("source_version_required");
  });
  it("only projects allowlisted fields from the existing database row", () => {
    const row = { id: 1, userId: "account-a", title: "Safe title", sessionToken: "not-for-model", createdAt: new Date("2026-01-01T00:00:00Z") };
    expect(projectEventSource("event", row).fields).toEqual({ title: "Safe title", createdAt: "2026-01-01T00:00:00.000Z" });
    expect(() => snapshot([{ ...event(), fields: { ...event().fields, sessionToken: "not-for-model" } }])).toThrow("unexpected_source_field");
  });
  it("distinguishes reported outcomes and aggregate counters from proof of effectiveness", () => {
    expect(snapshot().payload.sources.find(item => item.kind === "confirmation_rule")!.evidenceLimitations).toContain("counters_may_span_versions");
  });
});
