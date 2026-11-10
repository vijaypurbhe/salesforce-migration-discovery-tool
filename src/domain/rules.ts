import type { AnswerMap } from "./types";
import { QUESTIONS } from "./questionBank";
import { applicabilityMap } from "./branching";

export const RULE_VERSION = "rules-1.0";

export interface RuleContext {
  answers: AnswerMap;
  registers: { id: string; register_type: string; code: string; title: string; data: Record<string, unknown>; archived?: boolean }[];
  requirements: { id: string; code: string; title: string; priority: string; scope: string; critical: boolean; archived?: boolean }[];
  evidencedQuestionIds: Set<string>;
}

export interface CandidateFinding {
  rule_id: string;
  finding_key: string;
  title: string;
  domain: string;
  kinds: ("delta" | "fitgap" | "risk" | "decision")[];
  categories: string[];
  current_state: string;
  required_state: string;
  delta_type: string;
  fit_status: string;
  proposed_treatment: string;
  validation_task: string;
  acceptance_criterion: string;
  is_blocker: boolean;
  linked_question_ids: string[];
}

const sel = (a: AnswerMap, q: string): string[] => {
  const s = a[q]?.value?.selected;
  return Array.isArray(s) ? s : typeof s === "string" ? [s] : [];
};
const known = (a: AnswerMap, q: string) => a[q]?.state === "known";
const has = (a: AnswerMap, q: string, ...v: string[]) => known(a, q) && sel(a, q).some((x) => v.includes(x));
const notKnown = (a: AnswerMap, q: string) => !a[q] || a[q].state === "unknown" || a[q].state === "needs_validation";
const items = (a: AnswerMap, q: string) => (known(a, q) ? a[q].value?.items ?? [] : []);
const countPositive = (a: AnswerMap, q: string) => {
  const c = a[q]?.value?.count;
  if (!known(a, q) || !c) return false;
  if (c.mode === "exact") return (c.exact ?? 0) > 0;
  return (c.min ?? 0) > 0 || (c.band !== undefined && c.band !== "0" && c.band !== null);
};

function f(p: Partial<CandidateFinding> & Pick<CandidateFinding, "rule_id" | "title" | "domain" | "linked_question_ids">): CandidateFinding {
  return {
    finding_key: "", kinds: ["delta"], categories: [], current_state: "", required_state: "", delta_type: "Redesign",
    fit_status: "validation_pending", proposed_treatment: "", validation_task: "", acceptance_criterion: "", is_blocker: false, ...p,
  };
}

/** Deterministic, idempotent candidate-finding rules G01–G24. Same inputs always yield the same (rule_id, finding_key) set. */
export function runRules(ctx: RuleContext): CandidateFinding[] {
  const a = ctx.answers;
  const out: CandidateFinding[] = [];
  const appl = applicabilityMap(a);
  const lifecycleApplicable = appl["A01"] === "applicable" || appl["A01"] === "unresolved";

  if (has(a, "P06", "yes")) out.push(f({ rule_id: "G01", title: "Pricing code (QCP / custom calculation) redesign assessment", domain: "Pricing", kinds: ["delta", "fitgap"], categories: ["functional", "architecture"],
    current_state: "Custom pricing code is used in the calculation sequence.", required_state: "Each hook and business purpose decomposed and mapped to target pricing constructs or a justified extension.",
    delta_type: "Redesign", proposed_treatment: "Decompose QCP by hook/purpose in the logic register; propose native vs extension per capability; prove with source quotes.",
    validation_task: "Complete logic-register entries for every QCP capability and attach pricing proof.", acceptance_criterion: "Representative source quotes reproduce expected totals within tolerance.", linked_question_ids: ["P06", "X03"] }));

  const l01 = sel(a, "L01");
  if (notKnown(a, "L01") || l01.includes("industries_cpq") || (known(a, "L01") && !l01.includes("salesforce_cpq_sbqq")))
    out.push(f({ rule_id: "G02", title: "Source-path validation gate", domain: "Strategy", kinds: ["decision", "risk"], categories: ["licensing", "architecture"], is_blocker: true,
      current_state: notKnown(a, "L01") ? "Installed source product not confirmed." : "Source includes a path other than the SBQQ package.", required_state: "Verified source product and applicable assessment template.",
      delta_type: "Validation", proposed_treatment: "Verify installed packages; configure an applicable template before claiming SBQQ coverage.", validation_task: "Attach installed-package evidence (L01).", linked_question_ids: ["L01"] }));

  const l03 = items(a, "L03");
  if (notKnown(a, "L03") || l03.length === 0 || l03.some((i) => (i.fields.entitlement_status ?? "") !== "purchased"))
    out.push(f({ rule_id: "G03", title: "Target licensing / entitlement dependency", domain: "Strategy", kinds: ["risk", "decision"], categories: ["licensing"],
      current_state: "Target entitlement not confirmed as purchased.", required_state: "Confirmed entitlement for each target capability in scope.",
      delta_type: "Dependency", proposed_treatment: "Affected target capabilities stay validation pending until entitlement evidence is supplied.", validation_task: "Obtain order form / entitlement evidence for L03.", linked_question_ids: ["L03", "L09"] }));

  if (has(a, "L04", "existing_different_org", "new_org")) out.push(f({ rule_id: "G04", title: "Org migration impact assessment", domain: "Strategy", kinds: ["delta", "risk"], categories: ["architecture", "data", "integration"],
    current_state: "Target is a different or new org.", required_state: "Shared identity, master data and other-cloud dependencies governed across orgs.",
    proposed_treatment: "Assess identity, master data, shared records and wider cloud dependencies.", linked_question_ids: ["L04", "L07"] }));

  if (has(a, "L05", "yes")) out.push(f({ rule_id: "G05", title: "Coexistence governance and transaction routing", domain: "Strategy", kinds: ["delta", "decision"], categories: ["process", "architecture"],
    current_state: "Legacy CPQ and target will run concurrently.", required_state: "Documented routing rules, shared-record governance and duplicate prevention.",
    proposed_treatment: "Decide transaction routing owner and duplicate-prevention approach.", linked_question_ids: ["L05"] }));

  if (has(a, "L05", "yes") && (has(a, "B03", "billing") || a.L06?.value?.details?.systems_affected?.toLowerCase().includes("migrate")))
    out.push(f({ rule_id: "G06", title: "Coexistence with target billing requires architecture validation", domain: "Orders & billing", kinds: ["risk", "decision"], categories: ["architecture", "licensing"], is_blocker: true,
      current_state: "Coexistence and target billing are both planned.", required_state: "Combination validated against currently supported configurations (see SF07).",
      delta_type: "Validation", proposed_treatment: "Do not infer supported coexistence; validate the exact combination with the vendor.", validation_task: "Architect validation against SF07 for the chosen release.", linked_question_ids: ["L05", "L06", "B03"] }));

  if (has(a, "C03", "nested_bundle", "dynamic_bundle")) out.push(f({ rule_id: "G07", title: "Configurator model and scenario proof for nested / dynamic bundles", domain: "Catalog", kinds: ["delta", "fitgap"], categories: ["functional"],
    current_state: "Nested or dynamic bundles in use.", required_state: "Target configurator reproduces valid combinations and option cardinality.", proposed_treatment: "Model in target catalog structures; prove with C10 scenarios.", linked_question_ids: ["C03", "C05", "C10"] }));

  if (has(a, "C02", "ramped_multi_period")) out.push(f({ rule_id: "G08", title: "Multi-period commercial lifecycle design and test spike", domain: "Pricing", kinds: ["delta", "fitgap"], categories: ["functional"],
    current_state: "MDQ / ramped deals in use.", required_state: "Segment dates, quantities and prices survive amendments and renewals.", proposed_treatment: "Run a design spike subject to feature proof.", linked_question_ids: ["C02", "A05"] }));

  if (has(a, "P07", "cross_line_totals", "percent_of_total", "proration", "custom_uplift", "multi_pass_recalculation") || has(a, "P01", "percent_of_total"))
    out.push(f({ rule_id: "G09", title: "Pricing outcome reconciliation package", domain: "Pricing", kinds: ["delta", "fitgap"], categories: ["functional", "data"],
      current_state: "Cross-line, POT, proration or rounding behaviours are business-critical.", required_state: "Target totals reconcile to source outcomes within tolerance.", proposed_treatment: "Build reconciliation scenarios in the scenario register.", linked_question_ids: ["P07", "P01", "P09"] }));

  if (has(a, "Q06", "advanced_approvals_package", "flow_custom", "external")) out.push(f({ rule_id: "G10", title: "Approval redesign and parity validation", domain: "Docs & approvals", kinds: ["delta", "fitgap"], categories: ["process", "functional"],
    current_state: "Advanced or custom approvals in use.", required_state: "Routing, recall, resubmission, delegation and audit parity.", proposed_treatment: "Redesign approvals in the supported target approach.", linked_question_ids: ["Q06", "Q07"] }));

  if (known(a, "K02") && sel(a, "K02").length > 0) out.push(f({ rule_id: "G11", title: "Document rebuild and legal regression coverage", domain: "Docs & approvals", kinds: ["delta"], categories: ["functional", "change"],
    current_state: "Nontrivial template logic or signatures.", required_state: "Rebuilt or retained document solution validated by legal.", proposed_treatment: "Inventory templates; plan rebuild with K06 regression samples.", linked_question_ids: ["K02", "K03", "K06"] }));

  if (lifecycleApplicable && (notKnown(a, "A04") || (known(a, "A04") && !has(a, "A04", "complete"))))
    out.push(f({ rule_id: "G12", title: "Lifecycle history / lineage remediation — first renewal & amendment gate", domain: "Lifecycle", kinds: ["fitgap", "risk", "decision"], categories: ["data", "functional"], is_blocker: true,
      current_state: notKnown(a, "A04") ? "Lifecycle history completeness unknown." : "Lifecycle history incomplete.", required_state: "Complete lineage so the first post-migration renewal and amendment work.",
      delta_type: "Remediation", proposed_treatment: "Remediate history; validate the first lifecycle operation before cutover.", validation_task: "Run A09 golden lifecycle scenarios.", acceptance_criterion: "First renewal and amendment produce correct dates, quantities and prices.", linked_question_ids: ["A04", "A09"] }));

  if (has(a, "A07", "direct_asset_creation_subject_to_validation")) out.push(f({ rule_id: "G13", title: "Asset migration method validation", domain: "Lifecycle", kinds: ["decision", "risk"], categories: ["data", "architecture"],
    current_state: "Direct asset creation proposed.", required_state: "Method validated including required related lifecycle data (see SF06).", proposed_treatment: "Architect validates method; compare with historical-order approach.", linked_question_ids: ["A07"] }));

  if (items(a, "A08").length > 0 || countPositive(a, "O06")) {
    const cohorts = items(a, "A08");
    if (cohorts.length) cohorts.forEach((c) => out.push(f({ rule_id: "G14", finding_key: c.id, title: `In-flight cohort transition decision: ${c.fields.cohort || "cohort"}`, domain: "Lifecycle", kinds: ["decision"], categories: ["process", "data"],
      current_state: `${c.fields.count || "Unknown number of"} in-flight transactions.`, required_state: "Cohort-specific transition decision and reconciliation.", proposed_treatment: c.fields.treatment || "Decision pending", linked_question_ids: ["A08"] })));
    else out.push(f({ rule_id: "G14", title: "In-flight order transition decision", domain: "Orders & billing", kinds: ["decision"], categories: ["process"], current_state: "In-flight orders exist.", required_state: "Signed transition rule and reconciliation.", linked_question_ids: ["O06"] }));
  }

  const sbqqInterfaces = ctx.registers.filter((r) => r.register_type === "integration" && !r.archived && (r.data?.legacy_references as string | undefined)?.toString().trim());
  if (known(a, "I04") || sbqqInterfaces.length) {
    if (sbqqInterfaces.length) sbqqInterfaces.forEach((r) => out.push(f({ rule_id: "G15", finding_key: r.id, title: `Interface contract remapping: ${r.title}`, domain: "Integrations", kinds: ["delta", "fitgap"], categories: ["integration"],
      current_state: `References legacy objects/APIs: ${r.data.legacy_references}`, required_state: "Remapped contract, external owner commitment and integration test package.", proposed_treatment: "Remap payloads/endpoints; agree test contract with external owner.", linked_question_ids: ["I04", "I02"] })));
    else out.push(f({ rule_id: "G15", title: "Interface contract remapping for legacy references", domain: "Integrations", kinds: ["delta"], categories: ["integration"], current_state: "Interfaces reference SBQQ semantics.", required_state: "Remapped contracts and tests.", linked_question_ids: ["I04"] }));
  }

  const q01 = a.Q01?.value?.metrics;
  if (notKnown(a, "Q01") || !q01 || q01.typical_p95_max_lines_per_quote?.value == null || notKnown(a, "Q09"))
    out.push(f({ rule_id: "G16", title: "Performance discovery / proof task", domain: "Quoting", kinds: ["decision", "risk"], categories: ["performance"],
      current_state: "P95/max quote size unknown or untested.", required_state: "Measured workload and target performance proof.", delta_type: "Validation", proposed_treatment: "Measure workload and run a performance proof; no unsupported size threshold claims.", linked_question_ids: ["Q01", "Q09"] }));

  if (known(a, "X01") && !has(a, "X01", "none") && sel(a, "X01").length) out.push(f({ rule_id: "G17", title: "Dependency-driven refactor inventory and tests", domain: "Customization", kinds: ["delta"], categories: ["architecture"],
    current_state: `CPQ-dependent components: ${sel(a, "X01").join(", ")}`, required_state: "Each component dispositioned with tests.", proposed_treatment: "Populate the custom component register and X08 treatments.", linked_question_ids: ["X01", "X02", "X08"] }));

  if (known(a, "D03") && !has(a, "D03", "none_proven") && sel(a, "D03").length) out.push(f({ rule_id: "G18", title: "Data cleansing ownership, rules and reconciliation", domain: "Data", kinds: ["delta", "risk"], categories: ["data"],
    current_state: `Measured issues: ${sel(a, "D03").join(", ")}`, required_state: "Named cleansing owner, rules, sizing units and reconciliation.", linked_question_ids: ["D03", "D04", "D09"] }));

  if (countPositive(a, "R01")) out.push(f({ rule_id: "G19", title: "Report / metric rebuild and history bridge", domain: "Reporting", kinds: ["delta"], categories: ["functional", "data"],
    current_state: "Required reports reference CPQ records.", required_state: "Rebuilt reporting with a history bridge.", linked_question_ids: ["R01", "R02", "R03"] }));

  for (const q of QUESTIONS) {
    if (!q.evidenceRequired || q.criticality === "normal") continue;
    if (appl[q.id] === "hidden" || a[q.id]?.state === "not_applicable") continue;
    if (notKnown(a, q.id)) out.push(f({ rule_id: "G20", finding_key: q.id, title: `Open validation task: ${q.id} ${q.label}`, domain: "Validation", kinds: ["decision"], categories: ["operations"],
      current_state: a[q.id] ? `Answer state: ${a[q.id].state.replace("_", " ")}` : "Not yet answered", required_state: "Evidenced answer.", delta_type: "Validation",
      proposed_treatment: "Open validation task — not a functional gap.", validation_task: `Obtain evidence for ${q.id}.`, linked_question_ids: [q.id] }));
  }

  if (has(a, "I06", "vendor_lead_time", "erp_release_window", "security_review") || (known(a, "I08") === false && known(a, "I01")))
    out.push(f({ rule_id: "G21", title: "External delivery dependency and schedule exposure", domain: "Integrations", kinds: ["risk"], categories: ["operations"],
      current_state: "External team dates uncommitted.", required_state: "Committed dates from external owners.", linked_question_ids: ["I06", "I08"] }));

  for (const s of ctx.registers.filter((r) => r.register_type === "scenario" && !r.archived)) {
    const exp = Number(s.data?.expected_amount); const act = Number(s.data?.target_result); const tol = Number(s.data?.tolerance ?? 0);
    if (s.data?.target_result !== undefined && s.data?.target_result !== "" && Number.isFinite(exp) && Number.isFinite(act) && Math.abs(exp - act) > tol)
      out.push(f({ rule_id: "G22", finding_key: s.id, title: `Confirmed test gap: ${s.code} ${s.title}`, domain: "Pricing", kinds: ["fitgap"], categories: ["functional"], fit_status: "known_unmet",
        current_state: `Expected ${exp}, observed ${act} (tolerance ${tol}).`, required_state: "Observed target result within tolerance.", delta_type: "Test failure", proposed_treatment: "Diagnose calculation difference and retest.", linked_question_ids: ["P09", "T02"] }));
  }

  for (const r of ctx.requirements.filter((r) => !r.archived && (r.priority === "out" || ["Later phase", "Retire"].includes(r.scope)) && r.critical))
    out.push(f({ rule_id: "G23", finding_key: r.id, title: `Scope delta: ${r.code} ${r.title} deferred/removed`, domain: "Strategy", kinds: ["delta", "decision"], categories: ["change"],
      current_state: "Required capability deliberately deferred or removed.", required_state: "Recorded business decision.", fit_status: "out_of_scope", linked_question_ids: ["B10"] }));

  if (has(a, "D10", "archive_then_decommission") && (notKnown(a, "D06") || notKnown(a, "X02")))
    out.push(f({ rule_id: "G24", title: "Decommission readiness gate", domain: "Data", kinds: ["risk", "decision"], categories: ["operations", "data"], is_blocker: true,
      current_state: "Legacy uninstall planned before retention / dependency decisions.", required_state: "Retention and dependency decisions approved before uninstall.", linked_question_ids: ["D10", "D06", "X02"] }));

  // de-duplicate by (rule_id, finding_key)
  const seen = new Set<string>();
  return out.filter((x) => { const k = `${x.rule_id}|${x.finding_key}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

export function answerVersions(answers: AnswerMap, ids: string[]): Record<string, number> {
  return Object.fromEntries(ids.filter((i) => answers[i]).map((i) => [i, answers[i].row_version]));
}
