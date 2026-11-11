import { createHash } from "node:crypto";
import { z } from "zod";

// Transport projections of existing objects, not a replacement business model.
const kinds = ["event", "event_review", "event_candidate_rule", "confirmation_rule", "rule_version", "trigger_session", "choice_validation", "ash_memo", "mistake_review", "mind_review"] as const;
export type SourceKind = (typeof kinds)[number];
const identity = z.object({ kind: z.enum(kinds), id: z.number().int().positive() }).strict();
const sourceSchema = identity.extend({
  userId: z.string().min(1),
  state: z.string().nullable(),
  version: z.number().int().positive().nullable(),
  fields: z.record(z.string(), z.union([z.string().max(4000), z.number().finite(), z.boolean(), z.null()])),
  parents: z.array(identity).max(10),
}).strict();
export type ContextSource = z.infer<typeof sourceSchema>;
type Language = "zh" | "en" | "th";
const readWarnings = ["history_invalid_snapshot", "history_partial_rule_scope", "history_version_unavailable", "history_version_ambiguous"] as const;

const allowedFields: Record<SourceKind, readonly string[]> = {
  event: ["title", "eventType", "scene", "status", "summary", "searchMinutes", "moneyLoss", "isRepeat", "createdAt"],
  event_review: ["whatHappened", "whyNotDiscovered", "rootCause", "prevention", "systemRule", "createdAt"],
  event_candidate_rule: ["ruleText", "scene", "rootCause", "effectiveness", "createdAt"],
  confirmation_rule: ["ruleText", "domain", "scenario", "triggerCondition", "triggerText", "recommendedAction", "validatedCount", "helpfulCount", "sourceType"],
  rule_version: ["triggerTextSnapshot", "actionSnapshot", "severitySnapshot", "changeReason", "createdAt"],
  trigger_session: ["sceneType", "sceneSummary", "userChoice", "choiceNote", "createdAt"],
  choice_validation: ["expectedOutcome", "actualOutcome", "decisionQuality", "ruleHelpfulness", "followupAction", "validatedAt"],
  ash_memo: ["title", "whatHappened", "cost", "ignoredFact", "lesson", "principle", "pastChoice", "actualCost", "alternativeChoice", "lessonStatement", "createdAt"],
  mistake_review: ["mistakeType", "loss", "skippedStep", "principleText", "pastChoice", "actualCost", "alternativeChoice", "lessonStatement", "createdAt"],
  mind_review: ["actualResult", "stateAfter", "effectiveness", "lessonText", "createdAt"],
};

export class EventContextError extends Error {
  constructor(public readonly code: string) { super(code); this.name = "EventContextError"; }
}
export const sourceKey = (value: { kind: SourceKind; id: number }) => `${value.kind}:${value.id}`;
export function projectEventSource(kind: SourceKind, row: { id: number; userId: string }, metadata: Partial<Pick<ContextSource, "state" | "version" | "parents">> = {}): ContextSource {
  const record = row as Record<string, unknown>;
  const fields: ContextSource["fields"] = {};
  for (const field of allowedFields[kind]) {
    const value = record[field];
    if (value === undefined) continue;
    if (value instanceof Date) fields[field] = value.toISOString();
    else if (value === null || ["string", "number", "boolean"].includes(typeof value)) fields[field] = value as string | number | boolean | null;
    else throw new EventContextError("unexpected_field_value");
  }
  return { kind, id: row.id, userId: row.userId, fields, state: metadata.state ?? null, version: metadata.version ?? null, parents: metadata.parents ?? [] };
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
  return value;
}
function hash(value: unknown) { return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex"); }
function retired(source: ContextSource) {
  if (["confirmation_rule", "event_candidate_rule"].includes(source.kind)) return ["paused", "archived", "rejected"].includes(source.state ?? "");
  if (["ash_memo", "mistake_review"].includes(source.kind)) return ["superseded", "archived"].includes(source.state ?? "");
  return false;
}

/** Server-internal only. accountId must come from the authenticated repository. */
export function buildEventAgentContext(input: {
  accountId: string; eventId: number; language: Language;
  sources: ContextSource[]; historyTruncated?: boolean; readWarnings?: Array<(typeof readWarnings)[number]>;
}) {
  const parsed = z.object({
    accountId: z.string().min(1), eventId: z.number().int().positive(), language: z.enum(["zh", "en", "th"]),
    sources: z.array(sourceSchema).min(1).max(200), historyTruncated: z.boolean().optional(), readWarnings: z.array(z.enum(readWarnings)).max(10).optional(),
  }).strict().safeParse(input);
  if (!parsed.success) throw new EventContextError("invalid_context");
  const context = parsed.data;
  if (context.sources.some(source => source.userId !== context.accountId)) throw new EventContextError("account_mismatch");
  const byKey = new Map(context.sources.map(source => [sourceKey(source), source]));
  if (byKey.size !== context.sources.length) throw new EventContextError("duplicate_source");
  if (!byKey.has(`event:${context.eventId}`)) throw new EventContextError("event_unavailable");
  for (const source of context.sources) {
    if (Object.keys(source.fields).some(field => !allowedFields[source.kind].includes(field))) throw new EventContextError("unexpected_source_field");
    if (["confirmation_rule", "rule_version"].includes(source.kind) && source.version === null) throw new EventContextError("source_version_required");
    const requiredParent: Partial<Record<SourceKind, SourceKind>> = { event_review: "event", event_candidate_rule: "event", rule_version: "confirmation_rule", choice_validation: "trigger_session" };
    const parentKind = requiredParent[source.kind];
    if (parentKind && (source.parents.length !== 1 || source.parents[0].kind !== parentKind)) throw new EventContextError("invalid_source_relationship");
    if (["event", "ash_memo", "mistake_review", "mind_review"].includes(source.kind) && source.parents.length) throw new EventContextError("invalid_source_relationship");
    if (source.kind === "trigger_session" && source.parents.some(parent => parent.kind !== "rule_version")) throw new EventContextError("invalid_source_relationship");
    if (source.kind === "confirmation_rule" && source.parents.length && (source.parents.length !== 1 || source.parents[0].kind !== source.fields.sourceType)) throw new EventContextError("invalid_source_relationship");
  }
  const warnings = new Set<string>(context.readWarnings ?? []);
  function available(source: ContextSource, trail = new Set<string>()): boolean {
    const key = sourceKey(source);
    if (retired(source)) { warnings.add("withdrawn_source_omitted"); return false; }
    if (source.kind === "confirmation_rule" && source.fields.sourceType !== "manual" && source.parents.length === 0) { warnings.add("missing_origin"); return false; }
    if (trail.has(key)) throw new EventContextError("source_cycle");
    const next = new Set(trail).add(key);
    for (const parent of source.parents) {
      const record = byKey.get(sourceKey(parent));
      if (!record) { warnings.add("missing_origin"); return false; }
      if (!available(record, next)) return false;
    }
    return true;
  }
  const selected = context.sources.filter(source => available(source)).sort((a, b) => sourceKey(a).localeCompare(sourceKey(b)));
  const refByKey = new Map(selected.map((source, index) => [sourceKey(source), `source-${index + 1}`]));
  const sources = selected.map(source => ({
    ref: refByKey.get(sourceKey(source))!, kind: source.kind,
    state: source.state, version: source.version, fields: source.fields,
    parentRefs: source.parents.map(parent => refByKey.get(sourceKey(parent))!),
    evidenceNature: source.kind === "choice_validation" ? "user_reported_outcome" : source.kind === "rule_version" ? "saved_rule_version" : "user_record",
    evidenceLimitations: source.kind === "choice_validation" ? ["self_report_not_independent_verification", "session_level_not_per_rule"] : source.kind === "confirmation_rule" ? ["counters_may_span_versions"] : [],
  }));
  const ruleCandidates = selected.filter(source => ["confirmation_rule", "event_candidate_rule"].includes(source.kind)).map(rule => {
    const versions = selected.filter(source => source.kind === "rule_version" && source.version === rule.version && source.parents.some(parent => sourceKey(parent) === sourceKey(rule)));
    const version = versions.length === 1 ? versions[0] : undefined;
    const origin = rule.parents[0];
    const versionMatches = Boolean(version) && version!.fields.triggerTextSnapshot === (rule.fields.triggerText ?? rule.fields.ruleText) && version!.fields.actionSnapshot === (rule.fields.recommendedAction ?? rule.fields.ruleText);
    const complete = rule.kind === "confirmation_rule" && rule.state === "active" && Boolean(origin) && versionMatches && Boolean(String(rule.fields.triggerCondition ?? "").trim());
    if (rule.kind === "confirmation_rule" && !versions.length) warnings.add("current_rule_version_missing");
    if (rule.kind === "confirmation_rule" && versions.length > 1) warnings.add("current_rule_version_ambiguous");
    if (rule.kind === "confirmation_rule" && version && !versionMatches) warnings.add("current_rule_version_inconsistent");
    return { ref: refByKey.get(sourceKey(rule))!, kind: rule.kind,
      versionRef: version ? refByKey.get(sourceKey(version))! : null,
      originRef: origin ? refByKey.get(sourceKey(origin)) ?? null : null,
      provenance: origin ? "linked_record" as const : rule.fields.sourceType === "manual" ? "manual_rule" as const : "missing" as const,
      mayAssessForCurrentSituation: complete, applicability: "unassessed" as const,
      effectiveness: "not_inferred" as const,
    };
  });
  if (context.historyTruncated) warnings.add("history_window_truncated");
  if (!ruleCandidates.length) warnings.add("no_admissible_rule_candidate");
  const eventRef = refByKey.get(`event:${context.eventId}`);
  if (!eventRef) throw new EventContextError("event_unavailable");
  const payload = { protocol: "ruleloop.event-context.v1" as const, language: context.language, currentEventRef: eventRef,
    profileScope: "current_event_related_cases_and_selected_rule_origins" as const,
    historyScope: "recent_validated_sessions_for_selected_rules_with_exact_version_sources" as const,
    sources, ruleCandidates, warnings: [...warnings].sort() };
  if (Buffer.byteLength(JSON.stringify(payload)) > 96_000) throw new EventContextError("context_too_large");
  // Include withdrawn and missing-origin projections in the local fingerprint, so
  // a later withdrawal cannot accidentally reuse an earlier accepted snapshot.
  const snapshotHash = hash({ accountId: context.accountId, eventId: context.eventId,
    sources: [...context.sources].sort((a, b) => sourceKey(a).localeCompare(sourceKey(b))).map(source => ({ ...source, parents: [...source.parents].sort((a, b) => sourceKey(a).localeCompare(sourceKey(b))) })),
    historyTruncated: context.historyTruncated ?? false, readWarnings: [...new Set(context.readWarnings ?? [])].sort() });
  return { accountId: context.accountId, eventId: context.eventId, snapshotHash,
    requestHash: hash({ protocol: payload.protocol, snapshotHash, language: context.language }),
    bindings: selected.map(source => ({ ref: refByKey.get(sourceKey(source))!, kind: source.kind, id: source.id })), payload };
}
export type EventAgentContext = ReturnType<typeof buildEventAgentContext>;

/** Structural grounding only; an exact quote does not establish semantic correctness. */
export function validateEventCitations(raw: unknown, context: EventAgentContext) {
  const citations = z.array(z.object({ sourceRef: z.string(), field: z.string(), quote: z.string().trim().min(1).max(1000) }).strict()).min(1).max(20).safeParse(raw);
  if (!citations.success) throw new EventContextError("invalid_citations");
  for (const citation of citations.data) {
    const source = context.payload.sources.find(item => item.ref === citation.sourceRef);
    const value = source?.fields[citation.field];
    if (typeof value !== "string" || !value.includes(citation.quote)) throw new EventContextError("unsupported_citation");
  }
  return citations.data;
}
export function assertSameEventSnapshot(previous: EventAgentContext, fresh: EventAgentContext) {
  if (previous.accountId !== fresh.accountId || previous.eventId !== fresh.eventId || previous.snapshotHash !== fresh.snapshotHash || previous.requestHash !== fresh.requestHash) throw new EventContextError("stale_context");
}
