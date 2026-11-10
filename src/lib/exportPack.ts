import * as XLSX from "xlsx";
import { db, must, sha256Hex } from "./db";
import { INTERNAL_QUESTION_IDS, QUESTION_BY_ID } from "@/domain/questionBank";
import { safeCell } from "./csv";

export type Audience = "customer" | "internal";
export const CUSTOMER_EXCLUSIONS = [
  "Internal-only questions (" + INTERNAL_QUESTION_IDS.join(", ") + ")",
  "Records marked internal visibility", "Finding internal wording", "Internal notes",
  "Estimate lines, rates, margins and commercial inputs", "Unapproved proposal sections", "Confidential/internal evidence file metadata",
];

const strip = <T extends Record<string, unknown>>(rows: T[], keys: string[]) => rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !keys.includes(k))));

export async function buildPack(assessmentId: string, audience: Audience, includeCommercial: boolean) {
  const q = (t: string) => must<Record<string, any>[]>(db.from(t).select("*").eq("assessment_id", assessmentId));
  const [assessment, answers, regs, reqs, maps, findings, cx, gates, strat, wps, ev, sections] = await Promise.all([
    must<Record<string, any>>(db.from("assessments").select("*").eq("id", assessmentId).single()),
    q("answers"), q("register_items"), q("requirements"), q("mappings"), q("findings"), q("complexity_scores"), q("readiness_gates"), q("strategy_scenarios"), q("work_packages"), q("evidence_files"), q("proposal_sections"),
  ]);
  const cust = audience === "customer";
  const vis = (rows: Record<string, any>[]) => (cust ? rows.filter((r) => r.visibility !== "internal" && !r.archived) : rows);
  const pack: Record<string, any> = {
    generated_at: new Date().toISOString(), audience,
    assessment: { code: assessment.code, name: assessment.name, stage: assessment.stage, template_version: assessment.template_version, rubric_version: assessment.rubric_version, rule_version: assessment.rule_version, target_product: assessment.target_product_name, target_release: assessment.target_release },
    answers: (cust ? answers.filter((a) => !INTERNAL_QUESTION_IDS.includes(a.question_id)) : answers).map((a) => ({ question_id: a.question_id, question: QUESTION_BY_ID[a.question_id]?.text ?? "", instance: a.instance_key, state: a.state, value: a.value, confidence: a.confidence, review_status: a.review_status, revision: a.row_version })),
    registers: vis(regs), requirements: vis(reqs), mappings: vis(maps),
    findings: cust ? strip(vis(findings), ["internal_wording"]) : findings,
    complexity: cx, readiness: gates, strategies: strat, work_packages: vis(wps),
    evidence: (cust ? ev.filter((e) => e.classification !== "internal" && e.classification !== "confidential") : ev).map((e) => ({ file: e.original_filename, question: e.question_id, version: e.version, status: e.status, checksum: e.checksum, classification: e.classification })),
    proposal_sections: cust ? sections.filter((s) => s.approved && !s.internal_only) : sections,
  };
  if (!cust) {
    pack.internal_notes = await q("internal_notes");
    if (includeCommercial) { pack.estimate_lines = await q("estimate_lines"); pack.commercial_inputs = await q("commercial_inputs"); }
  }
  // traceability: requirement -> mapping -> finding -> work package
  pack.traceability = (pack.requirements as any[]).map((r) => {
    const m = (pack.mappings as any[]).filter((x) => x.requirement_ids?.includes(r.id));
    const wp = (pack.work_packages as any[]).filter((w) => w.requirement_ids?.includes(r.id));
    const f = (pack.findings as any[]).filter((x) => r.linked_question_ids?.some((qid: string) => x.linked_question_ids?.includes(qid)));
    return { requirement: r.code, title: r.title, evidence_questions: (r.linked_question_ids ?? []).join("|"), mappings: m.map((x) => x.code).join("|"), findings: f.map((x) => x.code).join("|"), work_packages: wp.map((x) => x.code).join("|"), acceptance: r.acceptance_criteria };
  });
  pack.hash = await sha256Hex(JSON.stringify(pack));
  return pack;
}

const flat = (v: unknown) => safeCell(v);
export function packToXlsx(pack: Record<string, any>): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const meta = [["Revenue Cloud Migration Discovery Studio — " + (pack.audience === "customer" ? "Customer assessment report" : "INTERNAL proposal pack")], ["Assessment", pack.assessment.code + " " + pack.assessment.name], ["Generated", pack.generated_at], ["Template / rubric / rules", `${pack.assessment.template_version} / ${pack.assessment.rubric_version} / ${pack.assessment.rule_version}`], ["Content hash", pack.hash]];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(meta), "Cover");
  for (const [name, rows] of Object.entries(pack)) {
    if (!Array.isArray(rows) || !rows.length) continue;
    const cleaned = rows.map((r: Record<string, unknown>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, flat(v)])));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cleaned), name.slice(0, 31));
  }
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
export function packToHtml(pack: Record<string, any>, sectionTitles: string[]): string {
  const sec = (pack.proposal_sections as any[]).sort((a, b) => a.section_no - b.section_no).map((s) => `<h2>${s.section_no}. ${esc(sectionTitles[s.section_no - 1])}</h2><div class="p">${esc(s.body).replace(/\n/g, "<br/>")}</div>`).join("");
  const table = (title: string, rows: any[], cols: string[]) => rows.length ? `<h2>${title}</h2><table><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>${rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(typeof r[c] === "object" ? JSON.stringify(r[c]) : r[c])}</td>`).join("")}</tr>`).join("")}</table>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(pack.assessment.code)} ${pack.audience === "customer" ? "Assessment report" : "Internal proposal pack"}</title>
<style>body{font:13px/1.5 system-ui,sans-serif;max-width:1000px;margin:32px auto;color:#1b2430}h1{font-size:22px}h2{font-size:16px;margin-top:28px;border-bottom:1px solid #ccd;padding-bottom:4px}table{border-collapse:collapse;width:100%;font-size:11px}td,th{border:1px solid #ccd;padding:4px;text-align:left;vertical-align:top}.banner{padding:8px;border:1px solid #c80;background:#fff6e5;margin:12px 0}</style></head><body>
<h1>${esc(pack.assessment.name)} — ${pack.audience === "customer" ? "Customer assessment report" : "INTERNAL proposal input pack"}</h1>
<div class="banner">Draft proposal input — not a signed SOW. Scope statements are linked to requirements, gaps, assumptions or decisions. Generated ${esc(pack.generated_at)} · hash ${esc(pack.hash.slice(0, 16))} · ${esc(pack.assessment.template_version)} / ${esc(pack.assessment.rubric_version)} / ${esc(pack.assessment.rule_version)}</div>
${sec}
${table("Findings", pack.findings, ["code", "title", "status", "fit_status", "current_state", "required_state", "validation_task"])}
${table("Requirements", pack.requirements, ["code", "title", "priority", "current_score", "target_score", "scope"])}
${table("Work packages", pack.work_packages, ["code", "name", "workstream", "wave", "deliverables", "acceptance_criteria"])}
${table("Risks, assumptions, decisions and dependencies", (pack.registers as any[]).filter((r) => ["risk", "assumption", "decision", "dependency"].includes(r.register_type)).map((r) => ({ ...r, description: r.data?.description, owner: r.data?.owner })), ["register_type", "code", "title", "description", "owner", "status"])}
${table("Traceability annex", pack.traceability, ["requirement", "title", "evidence_questions", "mappings", "findings", "work_packages", "acceptance"])}
</body></html>`;
}
