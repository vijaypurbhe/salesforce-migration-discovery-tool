export const GATES: { no: number; name: string; weight: number }[] = [
  { no: 1, name: "Source/target and licensing", weight: 10 },
  { no: 2, name: "Scope, strategy, org and coexistence", weight: 10 },
  { no: 3, name: "Catalog / configuration proof", weight: 10 },
  { no: 4, name: "Pricing parity proof", weight: 15 },
  { no: 5, name: "Asset / lifecycle continuity", weight: 15 },
  { no: 6, name: "Data quality / reconciliation", weight: 10 },
  { no: 7, name: "Integrations, environments, external commitments", weight: 10 },
  { no: 8, name: "Access / security", weight: 5 },
  { no: 9, name: "UAT / performance acceptance", weight: 10 },
  { no: 10, name: "Cutover, adoption and support", weight: 5 },
];
export const GATE_STATES = ["Not started", "In progress", "Evidence submitted", "Approved"];

export interface GateInput { gate_no: number; state: number; applicable: boolean; na_reviewed: boolean; assessed: boolean }
export interface ReadinessBlockers { openP1Blockers: number; mandatoryAcceptanceFailed: boolean; criticalDecisionUnresolved: boolean }

export function readinessScore(gates: GateInput[]): number | null {
  // Justified N/A reweights only when architect-reviewed; otherwise the gate stays applicable.
  const rows = GATES.map((g) => {
    const s = gates.find((x) => x.gate_no === g.no);
    const applicable = !(s && !s.applicable && s.na_reviewed);
    return { weight: g.weight, state: s?.state ?? 0, applicable };
  });
  const totalW = rows.filter((r) => r.applicable).reduce((s, r) => s + r.weight, 0);
  if (!totalW) return null;
  const v = rows.filter((r) => r.applicable).reduce((s, r) => s + r.weight * (r.state / 3), 0);
  return Math.round((100 * v) / totalW * 10) / 10;
}

export function readinessCategory(score: number | null): string {
  if (score === null) return "N/A";
  if (score < 40) return "Early discovery";
  if (score < 70) return "Developing";
  if (score < 90) return "Near readiness";
  return "High readiness";
}

/** Go-live ready only when every applicable gate is approved and no blocker conditions exist. Percentage cannot override gates. */
export function goLiveReady(gates: GateInput[], b: ReadinessBlockers): { ready: boolean; reasons: string[] } {
  const reasons: string[] = [];
  for (const g of GATES) {
    const s = gates.find((x) => x.gate_no === g.no);
    const na = s && !s.applicable && s.na_reviewed;
    if (!na && (s?.state ?? 0) < 3) reasons.push(`Gate ${g.no} (${g.name}) not approved`);
    if (s && !s.applicable && !s.na_reviewed) reasons.push(`Gate ${g.no} N/A awaiting architect review`);
  }
  if (b.openP1Blockers > 0) reasons.push(`${b.openP1Blockers} open P1/blocker finding(s)`);
  if (b.mandatoryAcceptanceFailed) reasons.push("Mandatory acceptance test failing");
  if (b.criticalDecisionUnresolved) reasons.push("Critical applicability or entitlement decision unresolved");
  return { ready: reasons.length === 0, reasons };
}
