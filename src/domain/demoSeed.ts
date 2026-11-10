/* Synthetic NorthStar Equipment demo story. Every value is fictional and labelled DEMO. Used only in is_demo projects. */
import { db } from "@/lib/db";
import { QUESTIONS, QUICK_START_IDS, COUNT_BANDS } from "./questionBank";
import { MAPPING_SEEDS } from "./mappingSeeds";
import { runAnalysis } from "@/lib/analysis";
import type { AnswerValue, QuestionDefinition } from "./types";

const UNKNOWN = new Set(["P04", "A04", "D04", "I06"]);
const VALIDATE = new Set(["P02", "A02", "X02", "U01"]);

function demoValue(q: QuestionDefinition, i: number): AnswerValue | null {
  const opts = q.options.filter((o) => !o.value.startsWith("none") && o.value !== "other" && o.value !== "unknown" && o.value !== "undecided");
  switch (q.control) {
    case "single": return opts.length ? { selected: opts[i % Math.min(opts.length, 3)].value } : null;
    case "multi": return opts.length ? { selected: opts.slice(0, Math.min(2, opts.length)).map((o) => o.value) } : null;
    case "count": { const bands = Object.keys(COUNT_BANDS); return i % 2 ? { count: { mode: "exact", exact: 40 + i * 7 } } : { count: { mode: "band", band: bands[Math.min(2, bands.length - 1)] } }; }
    case "number": return { metrics: { value: { value: 120 + i * 13, status: "estimated" } } };
    case "date": return { start: "2027-03-31" };
    case "dateRange": return { start: "2027-01-15", end: "2027-09-30", reason: "DEMO: fiscal-year planning window" };
    case "repeatable": case "table": return { items: [{ id: crypto.randomUUID(), fields: Object.fromEntries((q.subfields.length ? q.subfields : [{ key: "name" }]).map((s) => [s.key, `DEMO ${s.key}`])) }] };
    default: return { text: `DEMO: synthetic answer for ${q.id} — Northstar runs CPQ with QCP-heavy configured pricing for EMEA and NA business units.` };
  }
}

export async function seedDemo(assessmentId: string, projectId: string, userId: string) {
  const ids = Array.from(new Set([...QUICK_START_IDS, "B02", "B05", "L02", "C02", "C05", "P02", "P03", "P06", "Q02", "Q06", "K01", "A02", "A04", "O02", "I02", "I06", "X02", "D02", "D04", "R02", "S02", "T01", "U01"]));
  let i = 0;
  for (const id of ids) {
    const q = QUESTIONS.find((x) => x.id === id); if (!q) continue;
    i++;
    const state = UNKNOWN.has(id) ? "unknown" : VALIDATE.has(id) ? "needs_validation" : "known";
    const value = state === "unknown" ? null : demoValue(q, i);
    if (state !== "unknown" && !value) continue;
    await db.rpc("save_answer", { p_assessment: assessmentId, p_question: id, p_instance: "", p_state: state, p_value: value, p_notes: "DEMO synthetic", p_na_reason: null, p_confidence: i % 3 === 0 ? "documented" : "self_reported", p_expected_version: null, p_owner: state === "unknown" ? "DEMO pricing SME" : null, p_due: null });
  }
  const base = { assessment_id: assessmentId, project_id: projectId, created_by: userId };
  const reg = (register_type: string, code: string, title: string, data: Record<string, unknown>, q: string[]) => ({ ...base, register_type, code, title, data, linked_question_ids: q });
  await db.from("register_items").insert([
    reg("catalog", "CAT-001", "DEMO Turbine control bundle", { family: "Controls", sku: "NS-TC-100", status: "active", bundle_relationships: "3 nested option groups", proposed_treatment: "reconfigure" }, ["C01"]),
    reg("catalog", "CAT-002", "DEMO Field service subscription", { family: "Services", sku: "NS-FS-SUB", status: "sold last 12 months", selling_model: "Term subscription", proposed_treatment: "transform/migrate" }, ["C01"]),
    reg("logic", "LOG-001", "DEMO QCP onAfterCalculate regional uplift", { logic_type: "QCP hook", active: "yes", business_intent: "Apply regional uplift for EMEA", target_treatment: "redesign", golden_tests: "" }, ["P02"]),
    reg("logic", "LOG-002", "DEMO Volume discount schedule", { logic_type: "discount schedule", active: "yes", target_treatment: "reconfigure" }, ["P06"]),
    reg("integration", "INT-001", "DEMO ERP order sync", { source_target: "Salesforce → SAP S/4", direction: "outbound", legacy_references: "SBQQ__Quote__c, SBQQ__QuoteLine__c", middleware: "MuleSoft (DEMO)", readiness: "not started" }, ["I01"]),
    reg("document", "DOC-001", "DEMO Multi-language quote template", { artifact: "template", entity_language: "EN, DE, FR", generator: "CPQ templates" }, ["K01"]),
    reg("data", "DAT-001", "DEMO Active subscriptions", { source_object: "SBQQ__Subscription__c", volume: "18,400 (DEMO)", treatment: "migrate", quality_defects: "6% missing end dates" }, ["D01"]),
    reg("component", "CMP-001", "DEMO QuoteLine trigger handler", { component_type: "Apex", purpose: "Margin guard", disposition: "rebuild" }, ["X01"]),
    reg("report", "RPT-001", "DEMO ARR by region", { measure: "ARR", formula: "Sum of annualised subscription net price", audience: "Finance" }, ["R01"]),
    reg("scenario", "SCN-001", "DEMO Golden quote: EMEA bundle with uplift", { inputs: "2 bundles, EMEA, 3-yr term", expected_amount: 412000, tolerance: 1, result: "not run" }, ["P09"]),
    reg("risk", "RIS-001", "DEMO Amendment continuity for migrated assets", { description: "Migrated subscriptions may not amend correctly without full lineage.", impact: "High", probability: "medium", owner: "DEMO architect" }, ["A01"]),
    reg("assumption", "ASS-001", "DEMO Billing remains in ERP for wave 1", { description: "No target billing in initial scope.", owner: "DEMO sponsor" }, ["O01"]),
    reg("decision", "DEC-001", "DEMO Same-org deployment", { description: "Deploy in existing production org.", owner: "DEMO CIO" }, ["L04"]),
  ]);
  const rq = (code: string, title: string, axis: number, priority: string, c: number | null, t: number | null, reviewed: boolean, critical = false) => ({ ...base, code, title, axis, priority, current_score: c, target_score: t, score_reviewed: reviewed, critical, requirement_type: "Functional", scope: "In initial migration", applicability: "applicable", linked_question_ids: [] });
  await db.from("requirements").insert([
    rq("REQ-001", "DEMO Governed migration roadmap", 1, "must", 2, 4, true), rq("REQ-002", "DEMO Rationalised catalog with attributes", 2, "must", 2, 4, true, true),
    rq("REQ-003", "DEMO Regional pricing parity", 3, "must", 3, 5, true, true), rq("REQ-004", "DEMO Discount schedule parity", 3, "should", 3, 4, true),
    rq("REQ-005", "DEMO Guided seller experience", 4, "should", 2, 4, true), rq("REQ-006", "DEMO Multi-language documents", 5, "must", 3, 4, true),
    rq("REQ-007", "DEMO Amend/renew continuity", 6, "must", 2, 5, true, true), rq("REQ-008", "DEMO ERP order hand-off", 7, "must", 3, 4, true),
    rq("REQ-009", "DEMO API contract remap", 8, "must", 2, 4, true), rq("REQ-010", "DEMO Retire QCP custom code", 9, "should", 1, 4, true),
    rq("REQ-011", "DEMO Reconciled subscription migration", 10, "must", 2, 5, true), rq("REQ-012", "DEMO ARR reporting history bridge", 11, "could", 2, 3, false),
    rq("REQ-013", "DEMO Least-privilege price visibility", 12, "must", 3, 4, true),
  ]);
  await db.from("mappings").insert(MAPPING_SEEDS.slice(0, 12).map(([l, t, p], k) => ({ ...base, code: `MAP-${String(k + 1).padStart(3, "0")}`, legacy_area: l, candidate_target: t, discovery_proof: p, is_seed_prompt: true, fit_status: ["candidate_fit", "configuration_required", "extension_required", "validation_pending"][k % 4], entitlement_status: "under_evaluation" })));
  await db.from("work_packages").insert(["Discovery/design", "Catalog/configuration", "Pricing", "Lifecycle/assets", "Integrations", "Data", "Testing/performance", "Cutover"].map((w, k) => ({ assessment_id: assessmentId, project_id: projectId, code: `WP-${String(k + 1).padStart(2, "0")}`, name: `DEMO ${w}`, workstream: w, required: true, deliverables: `DEMO deliverables for ${w}` })));
  await db.from("readiness_gates").insert([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((g) => ({ assessment_id: assessmentId, project_id: projectId, gate_no: g, state: g <= 2 ? 2 : g <= 5 ? 1 : 0, assessed: true })));
  await db.from("complexity_scores").insert([3, 4, 5, 3, 4, 3, 4, 4, 3, 2, 3, 3].map((s, k) => ({ assessment_id: assessmentId, project_id: projectId, axis: k + 1, score: s, rationale: "DEMO synthetic rationale", reviewed: k < 9, uncertainty: k === 5 })));
  await db.from("strategy_scenarios").insert([
    { ...base, name: "DEMO A — Targeted rationalization, wave by region", design_strategy: "partial", deployment_model: "Same production org", rollout_pattern: "By BU/region", details: { split_rules: "DEMO: mixed-region deals stay in legacy until wave 2" }, criteria_scores: { speed: 4, disruption: 4, simplicity: 3, coverage: 3, continuity: 4, dependencies: 3, cost: 4 } },
    { ...base, name: "DEMO B — Full rationalization, single cutover", design_strategy: "full_rationalization", deployment_model: "Same production org", rollout_pattern: "One cutover", criteria_scores: { speed: 2, disruption: 2, simplicity: 5, coverage: 4 } },
  ]);
  await runAnalysis(assessmentId, projectId, userId);
}
