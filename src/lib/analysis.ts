import { db, must, sha256Hex } from "./db";
import { runRules, answerVersions, RULE_VERSION } from "@/domain/rules";
import type { AnswerMap, AnswerRow } from "@/domain/types";
import type { Finding, RegisterItem, Requirement } from "./models";

/** Run the deterministic rules and upsert findings idempotently. Manual decisions are preserved; changed inputs flag findings for review. */
export async function runAnalysis(assessmentId: string, projectId: string, userId: string) {
  const [rows, regs, reqs, existing] = await Promise.all([
    must<AnswerRow[]>(db.from("answers").select("*").eq("assessment_id", assessmentId).eq("instance_key", "")),
    must<RegisterItem[]>(db.from("register_items").select("*").eq("assessment_id", assessmentId)),
    must<Requirement[]>(db.from("requirements").select("*").eq("assessment_id", assessmentId)),
    must<Finding[]>(db.from("findings").select("*").eq("assessment_id", assessmentId)),
  ]);
  const answers: AnswerMap = Object.fromEntries(rows.map((r) => [r.question_id, r]));
  const candidates = runRules({ answers, registers: regs, requirements: reqs, evidencedQuestionIds: new Set() });
  const inputHash = await sha256Hex(JSON.stringify({ a: rows.map((r) => [r.question_id, r.row_version]).sort(), r: regs.map((r) => [r.id, r.row_version]).sort(), q: reqs.map((r) => r.id).sort() }));
  const run = await must<{ id: string }>(db.from("analysis_runs").insert({ assessment_id: assessmentId, project_id: projectId, rule_version: RULE_VERSION, input_hash: inputHash, created_by: userId }).select("id").single());
  let created = 0, updated = 0, flagged = 0;
  const key = (r: string, k: string) => `${r}|${k}`;
  const exMap = new Map(existing.filter((f) => !f.manual).map((f) => [key(f.rule_id, f.finding_key), f]));
  let seq = existing.length;
  for (const c of candidates) {
    const versions = answerVersions(answers, c.linked_question_ids);
    const prev = exMap.get(key(c.rule_id, c.finding_key));
    if (!prev) {
      seq += 1;
      const { error } = await db.from("findings").insert({
        assessment_id: assessmentId, project_id: projectId, code: `F-${String(seq).padStart(3, "0")}`, rule_id: c.rule_id, finding_key: c.finding_key, rule_version: RULE_VERSION, analysis_run_id: run.id,
        title: c.title, domain: c.domain, kinds: c.kinds, categories: c.categories, current_state: c.current_state, required_state: c.required_state, delta_type: c.delta_type,
        fit_status: c.fit_status, proposed_treatment: c.proposed_treatment, validation_task: c.validation_task, acceptance_criterion: c.acceptance_criterion, is_blocker: c.is_blocker,
        linked_question_ids: c.linked_question_ids, source_answer_versions: versions, created_by: userId,
      });
      if (!error) created++;
      continue;
    }
    exMap.delete(key(c.rule_id, c.finding_key));
    const changed = JSON.stringify(prev.source_answer_versions ?? {}) !== JSON.stringify(versions);
    const hasDecision = !!prev.decision || ["accepted", "closed"].includes(prev.status);
    const patch: Record<string, unknown> = { title: c.title, current_state: c.current_state, required_state: c.required_state, linked_question_ids: c.linked_question_ids, analysis_run_id: run.id, rule_version: RULE_VERSION, source_answer_versions: versions };
    if (changed && hasDecision) { patch.needs_review = true; if (prev.status === "closed") patch.status = "reopened"; flagged++; }
    await db.from("findings").update(patch).eq("id", prev.id);
    updated++;
  }
  // Findings whose trigger no longer fires are flagged, never deleted.
  for (const stale of exMap.values()) {
    if (stale.status !== "closed" && !stale.needs_review) { await db.from("findings").update({ needs_review: true, evidence_note: (stale.evidence_note ? stale.evidence_note + " | " : "") + "Trigger no longer active in latest analysis run" }).eq("id", stale.id); flagged++; }
  }
  await db.from("analysis_runs").update({ created_count: created, updated_count: updated, flagged_count: flagged }).eq("id", run.id);
  return { created, updated, flagged, runId: run.id };
}

/** Freeze a full structured snapshot of the assessment. */
export async function buildSnapshotPayload(assessmentId: string, includeCommercial: boolean) {
  const tables = ["answers", "register_items", "requirements", "mappings", "findings", "complexity_scores", "readiness_gates", "strategy_scenarios", "work_packages", "evidence_files"];
  const out: Record<string, unknown> = {};
  await Promise.all(tables.map(async (t) => { out[t] = await must(db.from(t).select("*").eq("assessment_id", assessmentId)); }));
  if (includeCommercial) {
    out.estimate_lines = await must(db.from("estimate_lines").select("*").eq("assessment_id", assessmentId));
    out.commercial_inputs = await must(db.from("commercial_inputs").select("*").eq("assessment_id", assessmentId));
  }
  out.source_references = await must(db.from("source_references").select("*"));
  return out;
}
