import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { withAccount } from "@/lib/action";
import { getUserId } from "@/lib/user";
import { getEventCase } from "@/app/actions/event-library";
import { getRules } from "@/app/actions/rules";
import { selectMatchingRules } from "@/lib/domain/experience-trigger";
import { eventCases, eventReviews, eventCandidateRules, interventionRuleVersions, triggerSessions, choiceValidations, ashMemos, mistakeReviews, mindRegulationReviews } from "@/db/schema";
import { buildEventAgentContext, EventContextError, projectEventSource, sourceKey, type ContextSource, type SourceKind } from "./event-context";

/** Internal read-only loader; no route, model call, new auth, or new business table. */
export async function loadEventAgentContext(eventId: number, language: "zh" | "en" | "th") {
  if (!Number.isSafeInteger(eventId) || eventId <= 0) throw new EventContextError("invalid_event_id");
  if (!["zh", "en", "th"].includes(language)) throw new EventContextError("invalid_language");
  return withAccount(async () => {
    const userId = await getUserId();
    const current = await getEventCase(eventId);
    if (!current) throw new EventContextError("event_unavailable");
    const collected = new Map<string, ContextSource>();
    const add = (source: ContextSource) => collected.set(sourceKey(source), source);
    const eventRows = [current.eventCase, ...current.related];
    for (const row of eventRows) add(projectEventSource("event", row, { state: row.status }));
    const reviewRows = await db.select().from(eventReviews).where(and(eq(eventReviews.userId, userId), inArray(eventReviews.eventId, eventRows.map(row => row.id))));
    for (const row of reviewRows) add(projectEventSource("event_review", row, { parents: [{ kind: "event", id: row.eventId }] }));
    const candidates = await db.select().from(eventCandidateRules).where(and(eq(eventCandidateRules.userId, userId), inArray(eventCandidateRules.sourceCaseId, eventRows.map(row => row.id))));
    for (const row of candidates) add(projectEventSource("event_candidate_rule", row, { state: row.status, parents: row.sourceCaseId ? [{ kind: "event", id: row.sourceCaseId }] : [] }));

    const allRules = await getRules();
    const domain = current.eventCase.eventType === "study" ? "study" : current.eventCase.eventType === "consumption" ? "purchase" : current.eventCase.eventType === "relationship" ? "relationship" : "custom";
    const recalled = selectMatchingRules(allRules, { sceneType: domain, summary: [current.eventCase.title, ...current.reviews.map(row => row.whatHappened)].join("\n") });
    const ids = new Set([...recalled.map(row => row.id), ...reviewRows.map(row => row.linkedRuleId).filter((id): id is number => id !== null)]);
    const rules = allRules.filter(row => ids.has(row.id));
    const originKinds: Record<string, SourceKind> = { event_review: "event_review", ash_memo: "ash_memo", mistake_review: "mistake_review", mind_review: "mind_review" };
    for (const row of rules) {
      const kind = originKinds[row.sourceType];
      add(projectEventSource("confirmation_rule", row, { state: row.status, version: row.currentVersion,
        parents: kind && row.sourceId ? [{ kind, id: row.sourceId }] : [] }));
    }
    const originIds = (kind: SourceKind) => [...new Set(rules.filter(row => originKinds[row.sourceType] === kind && row.sourceId).map(row => row.sourceId!))];
    const sourceReviews = originIds("event_review").length ? await db.select().from(eventReviews).where(and(eq(eventReviews.userId, userId), inArray(eventReviews.id, originIds("event_review")))) : [];
    const missingEventIds = sourceReviews.map(row => row.eventId).filter(id => !collected.has(`event:${id}`));
    if (missingEventIds.length) {
      const origins = await db.select().from(eventCases).where(and(eq(eventCases.userId, userId), inArray(eventCases.id, missingEventIds)));
      for (const row of origins) add(projectEventSource("event", row, { state: row.status }));
    }
    for (const row of sourceReviews) add(projectEventSource("event_review", row, { parents: [{ kind: "event", id: row.eventId }] }));
    if (originIds("ash_memo").length) {
      const rows = await db.select().from(ashMemos).where(and(eq(ashMemos.userId, userId), inArray(ashMemos.id, originIds("ash_memo"))));
      for (const row of rows) add(projectEventSource("ash_memo", row, { state: row.lessonStatus }));
    }
    if (originIds("mistake_review").length) {
      const rows = await db.select().from(mistakeReviews).where(and(eq(mistakeReviews.userId, userId), inArray(mistakeReviews.id, originIds("mistake_review"))));
      for (const row of rows) add(projectEventSource("mistake_review", row, { state: row.lessonStatus }));
    }
    if (originIds("mind_review").length) {
      const rows = await db.select().from(mindRegulationReviews).where(and(eq(mindRegulationReviews.userId, userId), inArray(mindRegulationReviews.id, originIds("mind_review"))));
      for (const row of rows) add(projectEventSource("mind_review", row));
    }
    if (rules.length) {
      const versions = await db.select().from(interventionRuleVersions).where(and(eq(interventionRuleVersions.userId, userId), or(...rules.map(row => and(eq(interventionRuleVersions.ruleId, row.id), eq(interventionRuleVersions.version, row.currentVersion))))));
      for (const row of versions) add(projectEventSource("rule_version", row, { version: row.version, parents: [{ kind: "confirmation_rule", id: row.ruleId }] }));
    }

    // Preserve old-version feedback as old-version evidence. It cannot establish
    // effectiveness of a newer version; link each session to its exact snapshots.
    const recent = rules.length ? await db.select().from(triggerSessions).where(and(eq(triggerSessions.userId, userId), eq(triggerSessions.status, "validated"))).orderBy(desc(triggerSessions.createdAt)).limit(31) : [];
    const historyWarnings = new Set<"history_invalid_snapshot" | "history_partial_rule_scope" | "history_version_unavailable" | "history_version_ambiguous">();
    const parsedSessions = recent.slice(0, 30).flatMap(row => {
      let matched: unknown, versions: unknown;
      try { matched = JSON.parse(row.matchedRuleIds); versions = JSON.parse(row.matchedRuleVersions); } catch { historyWarnings.add("history_invalid_snapshot"); return []; }
      if (!Array.isArray(matched) || !Array.isArray(versions) || matched.length !== versions.length || !matched.every(id => Number.isSafeInteger(id) && id > 0) || !versions.every(version => Number.isSafeInteger(version) && version > 0)) { historyWarnings.add("history_invalid_snapshot"); return []; }
      const idsSnapshot = matched as number[], versionsSnapshot = versions as number[];
      if (!idsSnapshot.some(id => ids.has(id))) return [];
      if (!idsSnapshot.every(id => ids.has(id))) { historyWarnings.add("history_partial_rule_scope"); return []; }
      return [{ row, pairs: idsSnapshot.map((id, index) => ({ id, version: versionsSnapshot[index] })) }];
    });
    const pairs = [...new Map(parsedSessions.flatMap(session => session.pairs).map(pair => [`${pair.id}:${pair.version}`, pair])).values()];
    const historicalVersions = pairs.length ? await db.select().from(interventionRuleVersions).where(and(eq(interventionRuleVersions.userId, userId), or(...pairs.map(pair => and(eq(interventionRuleVersions.ruleId, pair.id), eq(interventionRuleVersions.version, pair.version)))))) : [];
    for (const row of historicalVersions) add(projectEventSource("rule_version", row, { version: row.version, parents: [{ kind: "confirmation_rule", id: row.ruleId }] }));
    const selectedSessions = parsedSessions.flatMap(({row, pairs}) => {
      const exact = pairs.map(pair => historicalVersions.filter(version => version.ruleId === pair.id && version.version === pair.version));
      if (exact.some(versions => versions.length === 0)) { historyWarnings.add("history_version_unavailable"); return []; }
      if (exact.some(versions => versions.length > 1)) { historyWarnings.add("history_version_ambiguous"); return []; }
      add(projectEventSource("trigger_session", row, { state: row.status, parents: exact.map(versions => ({ kind: "rule_version", id: versions[0].id })) }));
      return [row];
    });
    if (selectedSessions.length) {
      const validations = await db.select().from(choiceValidations).where(and(eq(choiceValidations.userId, userId), inArray(choiceValidations.triggerSessionId, selectedSessions.map(row => row.id))));
      for (const row of validations) add(projectEventSource("choice_validation", row, { parents: [{ kind: "trigger_session", id: row.triggerSessionId }] }));
    }
    return buildEventAgentContext({ accountId: userId, eventId, language, sources: [...collected.values()], historyTruncated: recent.length > 30, readWarnings: [...historyWarnings] });
  });
}
