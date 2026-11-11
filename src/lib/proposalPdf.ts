import { jsPDF } from "jspdf";
import type { AiResult } from "./aiFindings";

export interface ProposalDocument {
  audience: string; generated_at: string; hash: string;
  assessment: { name: string; code: string; stage: string; target_product: string; target_release: string; template_version: string; rubric_version: string; rule_version: string };
  proposal_sections: { section_no: number; body: string; approved: boolean; internal_only: boolean }[];
  findings: { code: string; title: string; current_state?: string; required_state?: string; proposed_treatment?: string; validation_task?: string; status?: string }[];
  work_packages: { code: string; name: string; deliverables?: string; acceptance_criteria?: string; dependencies?: string; wave?: string }[];
  ai_discovery: { approved: boolean; result: AiResult }[];
}

export function proposalReady(pack: ProposalDocument) {
  return pack.audience === "customer" && pack.proposal_sections.some(s => s.approved && !s.internal_only && s.body.trim()) && ["proposal", "baselined"].includes(pack.assessment.stage);
}

export function packToPdf(pack: ProposalDocument, titles: string[]): Blob {
  if (!proposalReady(pack)) throw new Error("Set the assessment to Proposal or Baselined and approve at least one client narrative section before exporting.");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  // Read semantic print roles from the app theme rather than duplicating a palette.
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => {
    const probe = document.createElement("span");
    probe.style.color = `hsl(${css.getPropertyValue(name).trim()})`;
    document.body.appendChild(probe);
    const values = getComputedStyle(probe).color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
    probe.remove();
    return values?.length === 3 ? values : [0, 0, 0];
  };
  const ink = token("--primary"), accent = token("--teal"), muted = token("--muted-foreground"), line = token("--border");
  const color = (rgb: number[]) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const width = 170, left = 20;
  let y = 28;
  const page = () => { doc.addPage(); y = 28; };
  const ensure = (height: number) => { if (y + height > 270) page(); };
  const write = (text: unknown, size = 10, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); color(ink);
    const lines: string[] = doc.splitTextToSize(String(text ?? "").replace(/[\u2013\u2014]/g, "-").replace(/\u2019/g, "'"), width);
    const height = size * 0.48;
    for (const row of lines) { ensure(height); doc.text(row, left, y); y += height; }
    y += 3;
  };
  const heading = (title: string) => { ensure(20); y += 5; doc.setDrawColor(accent[0], accent[1], accent[2]); doc.setLineWidth(0.7); doc.line(left, y, left + 12, y); y += 8; write(title, 15, true); };
  const item = (title: string, body: string) => { ensure(22); write(title, 11, true); write(body); y += 2; };
  doc.setFillColor(ink[0], ink[1], ink[2]); doc.rect(0, 0, 210, 9, "F");
  y = 35; color(accent); doc.setFontSize(10); doc.text("REVENUE CLOUD MIGRATION DISCOVERY STUDIO", left, y);
  y = 57; write("Client proposal", 30, true); y += 6; write(pack.assessment.name, 22, true);
  write(`${pack.assessment.code}  |  ${pack.assessment.target_product || "Revenue Cloud"}${pack.assessment.target_release ? ` / ${pack.assessment.target_release}` : ""}`, 12);
  y = 112; heading("Discovery-led migration roadmap");
  write("Approved discovery findings, migration recommendations and the next steps for delivery.", 13);
  y = 167; write(`${pack.findings.length} findings   /   ${pack.work_packages.length} work packages   /   ${pack.ai_discovery.filter(x => x.approved).length} approved AI reviews`, 11, true);
  y = 214; write(`Prepared ${new Date(pack.generated_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`);
  write("Client review copy. This proposal is not a signed statement of work. Product availability and licensing remain subject to validation.", 9);
  page();
  heading("Proposal narrative");
  for (const section of [...pack.proposal_sections].filter(s => s.approved && !s.internal_only && s.body.trim()).sort((a,b) => a.section_no - b.section_no)) {
    heading(titles[section.section_no - 1] ?? `Section ${section.section_no}`); write(section.body);
  }
  heading("Discovery findings");
  if (!pack.findings.length) write("No client-visible findings were recorded at export time.");
  for (const f of pack.findings) item(`${f.code} | ${f.title}`, [f.current_state && `Current state: ${f.current_state}`, f.required_state && `Required outcome: ${f.required_state}`, f.status && `Status: ${f.status}`].filter(Boolean).join("\n"));
  for (const review of pack.ai_discovery.filter(x => x.approved)) {
    heading("Approved discovery intelligence"); write(review.result.summary);
    for (const t of review.result.themes) item(`Theme: ${t.title}`, `${t.detail}\nEvidence: ${t.source}`);
    for (const r of review.result.risks) item(`${r.severity.toUpperCase()} risk | ${r.title}`, `${r.detail}\nMitigation: ${r.mitigation}\nEvidence: ${r.source}`);
    heading("Recommended next steps");
    for (const r of review.result.recommendations) item(`${r.priority.toUpperCase()} | ${r.title}`, `${r.detail}\nSuggested owner: ${r.owner}\nSuccess criterion: ${r.success_criterion}\nEvidence: ${r.source}`);
    if (review.result.unknowns.length) { heading("Open validation questions"); review.result.unknowns.forEach(x => write(`- ${x}`)); }
  }
  heading("Finding-led actions");
  const actions = pack.findings.filter(f => f.proposed_treatment || f.validation_task);
  if (!actions.length) write("Next steps have not yet been recorded in the findings register.");
  for (const f of actions) item(`${f.code} | ${f.title}`, [f.proposed_treatment && `Treatment: ${f.proposed_treatment}`, f.validation_task && `Next validation: ${f.validation_task}`].filter(Boolean).join("\n"));
  heading("Delivery work packages");
  for (const w of pack.work_packages) item(`${w.code} | ${w.name}${w.wave ? ` / ${w.wave}` : ""}`, [w.deliverables && `Deliverables: ${w.deliverables}`, w.acceptance_criteria && `Acceptance: ${w.acceptance_criteria}`, w.dependencies && `Dependencies: ${w.dependencies}`].filter(Boolean).join("\n") || "Deliverables and acceptance criteria pending validation.");
  heading("Document provenance"); write(`Template ${pack.assessment.template_version} / rubric ${pack.assessment.rubric_version} / rules ${pack.assessment.rule_version}\nContent hash: ${pack.hash}`, 8);
  const pages = doc.getNumberOfPages();
  for (let n = 1; n <= pages; n++) {
    doc.setPage(n); doc.setDrawColor(line[0], line[1], line[2]); doc.setLineWidth(0.2); doc.line(20, 278, 190, 278);
    color(muted); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(`${pack.assessment.code} | Client proposal`, 20, 284); doc.text(`${n} / ${pages}`, 190, 284, { align: "right" });
    if (n > 1) { doc.setFontSize(8); doc.text("REVENUE CLOUD MIGRATION | CLIENT REVIEW COPY", 20, 15); }
  }
  return doc.output("blob");
}

export async function deliverProposal(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return; }
    catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}