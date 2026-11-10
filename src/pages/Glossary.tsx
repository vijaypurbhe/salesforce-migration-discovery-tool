import { useState } from "react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/app/bits";
import { FIT_STATUSES } from "@/lib/models";

const TERMS: [string, string][] = [
  ["CPQ", "Salesforce Configure, Price, Quote (the SBQQ managed package) — the legacy source system."],
  ["Revenue Cloud", "The target Salesforce revenue lifecycle platform. Migration is a rebuild in target constructs, not a package upgrade."],
  ["QCP", "Quote Calculator Plugin — custom JavaScript hooks in CPQ pricing. Each hook's business purpose must be assessed and redesigned."],
  ["Known / Unknown / Needs validation / Not applicable", "The four answer states. Unknown never counts as No; N/A needs a reason."],
  ["Confidence", "Self-reported, documented (evidence attached) or tested (verified by test)."],
  ["Capability score C / T", "Evidenced current capability and required capability, 0–5, weighted Must 3 / Should 2 / Could 1. Axes below 70% reviewed coverage are suppressed."],
  ["Gap points", "max(T − C, 0) — only when both scores are explicitly assessed."],
  ["Migration complexity", "Separate 1–5 measure of how hard the migration is. Never blended with capability or readiness."],
  ["Readiness gates", "Ten weighted gates. Go-live readiness requires every applicable gate approved; the percentage cannot override."],
  ["Priority index", "20 × (0.4 impact + 0.2 urgency + 0.25 delivery risk + 0.15 dependency criticality). P1 ≥ 80, P2 ≥ 60, P3 ≥ 40."],
  ["Unestimated work", "Any required package missing quantities or unit hours. Prevents a complete total being shown."],
  ["Snapshot", "Immutable frozen copy of the assessment with template, rubric and rule versions and a content hash."],
  ["Design strategy vs rollout", "Design strategy (partial, full rationalization, reimagine, parity) is a separate decision from deployment model and rollout pattern."],
  ...FIT_STATUSES.map((f) => [`Fit: ${f.label}`, "Mapping fit status. Verified native fit requires a purchased entitlement, validation date and architect verifier."] as [string, string]),
];

export default function Glossary() {
  const [q, setQ] = useState("");
  const list = TERMS.filter(([t, d]) => !q || `${t} ${d}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader kicker="Reference" title="Glossary and method" />
      <Input aria-label="Search glossary" placeholder="Search terms…" className="mb-4 max-w-sm" value={q} onChange={(e) => setQ(e.target.value)} />
      <dl className="card-elevated divide-y">{list.map(([t, d]) => <div key={t} className="p-4"><dt className="font-semibold text-sm">{t}</dt><dd className="text-sm text-muted-foreground mt-1">{d}</dd></div>)}</dl>
    </div>
  );
}
