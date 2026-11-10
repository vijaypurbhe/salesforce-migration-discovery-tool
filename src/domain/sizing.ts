export interface EstimateLine {
  id?: string;
  work_package_id: string;
  unit_type: string;
  quantity_mode: "exact" | "band";
  qty_low: number | null; qty_likely: number | null; qty_high: number | null;
  hours_low: number | null; hours_likely: number | null; hours_high: number | null;
  allocation_pct: number;
  is_fixed_task: boolean;
}
export interface Triple { low: number; likely: number; high: number }
export interface PackageEstimate { work_package_id: string; complete: boolean; missing: string[]; base: Triple | null; partial: Triple }

const MAX = 1e9;

export function validateLine(l: EstimateLine): string[] {
  const errs: string[] = [];
  const nums = [l.qty_low, l.qty_likely, l.qty_high, l.hours_low, l.hours_likely, l.hours_high];
  if (nums.some((n) => n !== null && (n < 0 || !Number.isFinite(n)))) errs.push("Values must be nonnegative numbers");
  if (nums.some((n) => n !== null && n > MAX)) errs.push("Value too large");
  const ord = (a: number | null, b: number | null, c: number | null) =>
    (a === null || b === null || a <= b) && (b === null || c === null || b <= c) && (a === null || c === null || a <= c);
  if (!ord(l.qty_low, l.qty_likely, l.qty_high)) errs.push("Quantity low ≤ likely ≤ high");
  if (!ord(l.hours_low, l.hours_likely, l.hours_high)) errs.push("Hours low ≤ likely ≤ high");
  if (!(l.allocation_pct > 0 && l.allocation_pct <= 100)) errs.push("Allocation must be within 0–100%");
  return errs;
}

function qty(l: EstimateLine): Triple | null {
  if (l.is_fixed_task) return { low: 1, likely: 1, high: 1 };
  if (l.quantity_mode === "exact") {
    const q = l.qty_likely ?? l.qty_low ?? l.qty_high;
    return q === null || q === undefined ? null : { low: q, likely: q, high: q };
  }
  if (l.qty_low === null || l.qty_high === null) return null;
  const mid = l.qty_likely ?? (l.qty_low + l.qty_high) / 2;
  return { low: l.qty_low, likely: mid, high: l.qty_high };
}

const r1 = (n: number) => Math.round(n * 100) / 100;

/** base_hours = Σ quantity × unit_hours (+ fixed tasks). Missing hours or quantities produce "Unestimated", never zero. */
export function estimatePackage(work_package_id: string, lines: EstimateLine[]): PackageEstimate {
  const mine = lines.filter((l) => l.work_package_id === work_package_id);
  const missing: string[] = [];
  const sum: Triple = { low: 0, likely: 0, high: 0 };
  if (mine.length === 0) missing.push("No estimate lines");
  for (const l of mine) {
    const q = qty(l);
    if (!q) { missing.push(`${l.unit_type}: quantity missing`); continue; }
    if (l.hours_low === null || l.hours_likely === null || l.hours_high === null) { missing.push(`${l.unit_type}: unit effort missing`); continue; }
    const a = l.allocation_pct / 100;
    sum.low += q.low * l.hours_low * a;
    sum.likely += q.likely * l.hours_likely * a;
    sum.high += q.high * l.hours_high * a;
  }
  const partial = { low: r1(sum.low), likely: r1(sum.likely), high: r1(sum.high) };
  return { work_package_id, complete: missing.length === 0, missing, base: missing.length === 0 ? partial : null, partial };
}

export type Contingency = { model: "none" } | { model: "percentage"; pct: number } | { model: "risk_hours"; hours: Triple };

/** Contingency is applied once to the declared base, using exactly one model. */
export function applyContingency(base: Triple, c: Contingency): Triple {
  if (c.model === "percentage") {
    if (c.pct < 0 || c.pct > 100) throw new Error("Contingency percentage must be 0–100");
    const f = 1 + c.pct / 100;
    return { low: r1(base.low * f), likely: r1(base.likely * f), high: r1(base.high * f) };
  }
  if (c.model === "risk_hours") return { low: r1(base.low + c.hours.low), likely: r1(base.likely + c.hours.likely), high: r1(base.high + c.hours.high) };
  return base;
}

export interface ProgrammeEstimate { complete: boolean; unestimatedPackages: string[]; total: Triple | null; partial: Triple; coverage: number }
export function estimateProgramme(requiredPackageIds: string[], lines: EstimateLine[], c: Contingency = { model: "none" }): ProgrammeEstimate {
  const pk = requiredPackageIds.map((id) => estimatePackage(id, lines));
  const partial = pk.reduce((s, p) => ({ low: s.low + p.partial.low, likely: s.likely + p.partial.likely, high: s.high + p.partial.high }), { low: 0, likely: 0, high: 0 });
  const un = pk.filter((p) => !p.complete).map((p) => p.work_package_id);
  const complete = un.length === 0 && pk.length > 0;
  return {
    complete, unestimatedPackages: un,
    total: complete ? applyContingency(partial, c) : null,
    partial: applyContingency({ low: r1(partial.low), likely: r1(partial.likely), high: r1(partial.high) }, c),
    coverage: pk.length ? (pk.length - un.length) / pk.length : 0,
  };
}

/** Whole-person staffing: headcount rounded up; utilisation explained separately. */
export function staffing(hours: number, hoursPerPersonWeek: number, weeks: number): { headcount: number; utilisation: number } {
  if (hoursPerPersonWeek <= 0 || weeks <= 0) throw new Error("Capacity and duration must be positive");
  const fte = hours / (hoursPerPersonWeek * weeks);
  const headcount = Math.max(1, Math.ceil(fte - 1e-9));
  return { headcount, utilisation: Math.round((fte / headcount) * 1000) / 10 };
}

export function roleCost(hours: number, split: Record<string, number>, rates: Record<string, number>): { cost: number | null; missing: string[] } {
  const missing: string[] = [];
  let cost = 0;
  const total = Object.values(split).reduce((s, x) => s + x, 0);
  if (Math.abs(total - 100) > 0.01) missing.push("Role split must total 100%");
  for (const [role, pct] of Object.entries(split)) {
    const r = rates[role];
    if (r === undefined || r === null || Number.isNaN(r)) { missing.push(`Rate for ${role}`); continue; }
    if (r < 0) missing.push(`Negative rate for ${role}`);
    cost += hours * (pct / 100) * r;
  }
  return { cost: missing.length ? null : Math.round(cost * 100) / 100, missing };
}
