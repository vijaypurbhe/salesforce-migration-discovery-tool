export type Priority = "must" | "should" | "could" | "out";
export const WEIGHT: Record<Priority, number> = { must: 3, should: 2, could: 1, out: 0 };

export interface ScoredRequirement {
  id: string;
  axis: number;
  priority: Priority;
  applicability: "applicable" | "unresolved" | "not_applicable";
  critical: boolean;
  current_score: number | null;
  target_score: number | null;
  score_reviewed: boolean;
  scope?: string;
}

export interface AxisScore {
  axis: number;
  current: number | null;
  target: number | null;
  gap: number | null;
  coverage: number | null; // 0..1
  reviewedCount: number;
  applicableCount: number;
  suppressed: boolean;
  reason: string | null;
}

/** gap_points = max(T - C, 0) only when both are explicitly assessed; otherwise null. */
export function gapPoints(C: number | null, T: number | null): number | null {
  if (C === null || C === undefined || T === null || T === undefined) return null;
  return Math.max(T - C, 0);
}

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export function axisScore(axis: number, reqs: ScoredRequirement[]): AxisScore {
  const onAxis = reqs.filter((r) => r.axis === axis && r.priority !== "out" && r.applicability !== "not_applicable");
  const A = onAxis.filter((r) => r.applicability === "applicable");
  const E = A.filter((r) => r.score_reviewed && r.current_score !== null && r.target_score !== null);
  const wA = A.reduce((s, r) => s + WEIGHT[r.priority], 0);
  const wE = E.reduce((s, r) => s + WEIGHT[r.priority], 0);
  const base: AxisScore = { axis, current: null, target: null, gap: null, coverage: wA ? wE / wA : null, reviewedCount: E.length, applicableCount: A.length, suppressed: true, reason: null };
  if (onAxis.length === 0) return { ...base, reason: "No applicable requirements" };
  if (onAxis.some((r) => r.critical && r.applicability === "unresolved")) return { ...base, reason: "Critical requirement has unresolved applicability" };
  if (A.some((r) => r.critical && !E.includes(r))) {
    const c = wE ? { current: round(sumW(E, "c") / wE), target: round(sumW(E, "t") / wE), gap: round(sumGap(E) / wE) } : {};
    return { ...base, ...c, reason: "Critical requirement lacks a reviewed score" };
  }
  if (!wE) return { ...base, reason: "Insufficient evidence" };
  const current = round(sumW(E, "c") / wE);
  const target = round(sumW(E, "t") / wE);
  const gap = round(sumGap(E) / wE);
  const coverage = wE / wA;
  if (coverage < 0.7) return { ...base, current, target, gap, coverage, reason: "Insufficient evidence (coverage below 70%)" };
  return { ...base, current, target, gap, coverage, suppressed: false };
}

function sumW(rs: ScoredRequirement[], k: "c" | "t") {
  return rs.reduce((s, r) => s + WEIGHT[r.priority] * (k === "c" ? r.current_score! : r.target_score!), 0);
}
function sumGap(rs: ScoredRequirement[]) {
  return rs.reduce((s, r) => s + WEIGHT[r.priority] * Math.max(r.target_score! - r.current_score!, 0), 0);
}

export function allAxisScores(reqs: ScoredRequirement[]): AxisScore[] {
  return Array.from({ length: 12 }, (_, i) => axisScore(i + 1, reqs));
}

export interface PriorityInputs { impact: number | null; urgency: number | null; delivery_risk: number | null; dependency_criticality: number | null; is_blocker?: boolean }
/** 20 * (0.4*impact + 0.2*urgency + 0.25*deliveryRisk + 0.15*dependencyCriticality); null when any input is missing. */
export function priorityIndex(p: PriorityInputs): number | null {
  const v = [p.impact, p.urgency, p.delivery_risk, p.dependency_criticality];
  if (v.some((x) => x === null || x === undefined)) return null;
  return round(20 * (0.4 * p.impact! + 0.2 * p.urgency! + 0.25 * p.delivery_risk! + 0.15 * p.dependency_criticality!), 1);
}
export function priorityBand(p: PriorityInputs): "P1" | "P2" | "P3" | "P4" | "Blocker" | "Unscored" {
  if (p.is_blocker) return "Blocker";
  const i = priorityIndex(p);
  if (i === null) return "Unscored";
  if (i >= 80) return "P1";
  if (i >= 60) return "P2";
  if (i >= 40) return "P3";
  return "P4";
}
