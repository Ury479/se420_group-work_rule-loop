import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
const actor = vi.hoisted(() => ({ id: "context-owner-a" as string | null }));
vi.mock("@/lib/user", () => ({ getUserId: async () => { if (!actor.id) throw new Error("Unauthorized"); return actor.id; } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
import { loadEventAgentContext } from "../src/lib/agent/event-context-repository";
import { assertSameEventSnapshot } from "../src/lib/agent/event-context";
import { pool } from "@/db";

const url = process.env.AGENT_CONTEXT_ADMIN_URL;
if (url && (!process.env.RULELOOP_CONTEXT_AUDIT || !new URL(url).searchParams.get("host")?.startsWith("/private/tmp/ruleloop-context-candidate-"))) throw new Error("Refuse non-isolated integration database");
const integration = url ? describe : describe.skip;
const admin = url ? new Pool({ connectionString: url }) : null;
const seed = `
TRUNCATE "user" RESTART IDENTITY CASCADE;
INSERT INTO "user" (id,name,email) VALUES ('context-owner-a','Synthetic A','a@example.invalid'),('context-owner-b','Synthetic B','b@example.invalid');
INSERT INTO event_cases (id,"userId",title,event_type,scene,reviewed) VALUES
 (1,'context-owner-a','Current event','study','classroom',true),(2,'context-owner-a','Past event','study','classroom',true),(3,'context-owner-b','PRIVATE_B event','study','classroom',true);
INSERT INTO event_reviews (id,"userId",event_id,what_happened,root_cause) VALUES
 (1,'context-owner-a',1,'I started without clarifying the goal.','incomplete_confirmation'),(2,'context-owner-a',2,'Past self-reported lesson.','incomplete_confirmation'),(3,'context-owner-b',3,'PRIVATE_B review','incomplete_confirmation');
INSERT INTO confirmation_rules (id,"userId",domain,rule_text,trigger_text,recommended_action,trigger_condition,status,is_active,source_type,source_id) VALUES
 (1,'context-owner-a','study','Clarify before coding','Clarify before coding','Write acceptance criteria','The goal is unclear','active',true,'event_review',2),
 (2,'context-owner-b','study','PRIVATE_B rule','PRIVATE_B rule','PRIVATE_B action','PRIVATE_B condition','active',true,'event_review',3);
UPDATE event_reviews SET linked_rule_id=1 WHERE "userId"='context-owner-a';
INSERT INTO event_candidate_rules (id,"userId",rule_text,source_case_id,status) VALUES
 (1,'context-owner-a','Candidate from current event',1,'candidate'),(2,'context-owner-a','Candidate from past event',2,'candidate'),(3,'context-owner-b','PRIVATE_B candidate',3,'candidate');
INSERT INTO intervention_rule_versions (id,"userId",rule_id,version,trigger_text_snapshot,action_snapshot,severity_snapshot) VALUES
 (1,'context-owner-a',1,1,'Clarify before coding','Write acceptance criteria','medium'),(2,'context-owner-b',2,1,'PRIVATE_B rule','PRIVATE_B action','medium');
INSERT INTO trigger_sessions (id,"userId",scene_type,scene_summary,matched_rule_ids,matched_rule_versions,status,idempotency_key) VALUES
 (1,'context-owner-a','study','Past same-version choice','[1]','[1]','validated','synthetic-a-1'),(2,'context-owner-b','study','PRIVATE_B session','[2]','[1]','validated','synthetic-b-1');
INSERT INTO choice_validations (id,"userId",trigger_session_id,actual_outcome,decision_quality,rule_helpfulness) VALUES
 (1,'context-owner-a',1,'I wrote a concrete criterion; outcome self-reported.','better','helpful'),(2,'context-owner-b',2,'PRIVATE_B outcome','better','helpful');
`;

integration("read-only context through the existing account transaction and PostgreSQL RLS", () => {
  beforeAll(async () => { if (!admin) throw new Error("Missing isolated admin"); });
  beforeEach(async () => { actor.id = "context-owner-a"; await admin!.query(seed); });
  afterAll(async () => { await admin!.end(); await pool.end(); });

  it("loads event, review, both rule kinds, current version and actual feedback", async () => {
    const context = await loadEventAgentContext(1,"zh");
    const kinds = new Set(context.payload.sources.map(source=>source.kind));
    for (const kind of ["event","event_review","event_candidate_rule","confirmation_rule","rule_version","trigger_session","choice_validation"]) expect(kinds.has(kind as never)).toBe(true);
    expect(context.payload.ruleCandidates.filter(rule=>rule.kind==="confirmation_rule")[0]).toMatchObject({mayAssessForCurrentSituation:true,applicability:"unassessed"});
    expect(context.payload.sources.find(source=>source.kind==="choice_validation")!.evidenceLimitations).toContain("session_level_not_per_rule");
    expect(JSON.stringify(context.payload)).not.toContain("PRIVATE_B");
    expect(JSON.stringify(context.payload)).not.toContain("context-owner-a");
  });
  it("rejects another account's event and unauthenticated access", async () => {
    actor.id="context-owner-b";
    await expect(loadEventAgentContext(1,"zh")).rejects.toThrow("event_unavailable");
    actor.id=null;
    await expect(loadEventAgentContext(1,"zh")).rejects.toThrow("Unauthorized");
  });
  it("uses a runtime role with no writes and preserves rule counters", async () => {
    const runtime = await pool.query("SELECT current_user, has_table_privilege(current_user,'confirmation_rules','INSERT') AS can_insert, has_table_privilege(current_user,'confirmation_rules','UPDATE') AS can_update");
    expect(runtime.rows[0]).toMatchObject({current_user:"context_reader",can_insert:false,can_update:false});
    const before = await admin!.query("SELECT match_count,hit_count,acted_count,validated_count,helpful_count FROM confirmation_rules WHERE id=1");
    await loadEventAgentContext(1,"en");
    const after = await admin!.query("SELECT match_count,hit_count,acted_count,validated_count,helpful_count FROM confirmation_rules WHERE id=1");
    expect(after.rows).toEqual(before.rows);
  });
  it("invalidates a snapshot after editing a review with no updatedAt column", async () => {
    const before = await loadEventAgentContext(1,"zh");
    await admin!.query("UPDATE event_reviews SET what_happened='Corrected past experience' WHERE id=2");
    const after = await loadEventAgentContext(1,"zh");
    expect(()=>assertSameEventSnapshot(before,after)).toThrow("stale_context");
  });
  it("preserves an old-version outcome with its exact historical snapshot", async () => {
    await admin!.query("UPDATE confirmation_rules SET current_version=2 WHERE id=1");
    await admin!.query("INSERT INTO intervention_rule_versions (id,\"userId\",rule_id,version,trigger_text_snapshot,action_snapshot,severity_snapshot) VALUES (4,'context-owner-a',1,2,'Clarify before coding','Write acceptance criteria','medium')");
    const context=await loadEventAgentContext(1,"th");
    expect(context.payload.sources.find(source=>source.kind==="confirmation_rule")!.version).toBe(2);
    const outcome=context.payload.sources.find(source=>source.kind==="choice_validation")!;
    expect(outcome).toBeDefined();
    const session=context.payload.sources.find(source=>source.ref===outcome.parentRefs[0])!;
    const historical=context.payload.sources.find(source=>source.ref===session.parentRefs[0])!;
    expect(historical.kind).toBe("rule_version");
    expect(historical.version).toBe(1);
    const candidate=context.payload.ruleCandidates.find(rule=>rule.kind==="confirmation_rule")!;
    expect(context.payload.sources.find(source=>source.ref===candidate.versionRef)!.version).toBe(2);
  });
  it("reports missing historical version evidence rather than attaching feedback to a different version", async () => {
    await admin!.query("UPDATE trigger_sessions SET matched_rule_versions='[99]' WHERE id=1");
    const context=await loadEventAgentContext(1,"zh");
    expect(context.payload.sources.some(source=>source.kind==="choice_validation")).toBe(false);
    expect(context.payload.warnings).toContain("history_version_unavailable");
  });
  it("reports malformed historical snapshots without treating them as no prior feedback", async () => {
    await admin!.query("UPDATE trigger_sessions SET matched_rule_versions='not-json' WHERE id=1");
    const context=await loadEventAgentContext(1,"zh");
    expect(context.payload.warnings).toContain("history_invalid_snapshot");
  });
  it("omits a paused main rule while retaining the distinct case candidate", async () => {
    await admin!.query("UPDATE confirmation_rules SET status='paused',is_active=false WHERE id=1");
    const context=await loadEventAgentContext(1,"zh");
    expect(context.payload.sources.some(source=>source.kind==="confirmation_rule")).toBe(false);
    expect(context.payload.sources.some(source=>source.kind==="event_candidate_rule")).toBe(true);
    expect(context.payload.sources.some(source=>source.kind==="choice_validation")).toBe(false);
  });
  it.each(["ash_memo","mistake_review","mind_review"] as const)("follows an existing %s source without inventing a replacement profile table", async kind => {
    if(kind==="ash_memo") await admin!.query("INSERT INTO ash_memos (id,\"userId\",lesson_statement,lesson_status) VALUES (4,'context-owner-a','Source-specific painful lesson','confirmed')");
    if(kind==="mistake_review") await admin!.query("INSERT INTO mistake_reviews (id,\"userId\",mistake_type,lesson_statement,lesson_status) VALUES (4,'context-owner-a','repeated_decision','Source-specific painful lesson','confirmed')");
    if(kind==="mind_review") {
      await admin!.query("INSERT INTO mind_regulation_sessions (id,\"userId\",current_state,energy_level,agitation_level,current_task,intervention_type,recommended_action) VALUES (4,'context-owner-a','unclear',3,3,'Synthetic task','pause','Clarify')");
      await admin!.query("INSERT INTO mind_regulation_reviews (id,\"userId\",session_id,actual_result,state_after,effectiveness,lesson_text) VALUES (4,'context-owner-a',4,'Self-report','calmer','unclear','Source-specific painful lesson')");
    }
    await admin!.query("INSERT INTO confirmation_rules (id,\"userId\",domain,rule_text,trigger_text,recommended_action,trigger_condition,status,is_active,source_type,source_id) VALUES (4,'context-owner-a','purchase','Source rule','Source rule','Concrete action','Specific condition','active',true,$1,4)",[kind]);
    await admin!.query("INSERT INTO intervention_rule_versions (id,\"userId\",rule_id,version,trigger_text_snapshot,action_snapshot,severity_snapshot) VALUES (4,'context-owner-a',4,1,'Source rule','Concrete action','medium')");
    await admin!.query("UPDATE event_reviews SET linked_rule_id=4 WHERE id=1");
    const context=await loadEventAgentContext(1,"zh");
    expect(context.payload.sources.find(source=>source.kind===kind)).toBeDefined();
    expect(JSON.stringify(context.payload)).toContain("Source-specific painful lesson");
  });
});
