import { describe, it, expect } from "vitest";
import { QUESTIONS, QUICK_START_IDS, QUESTION_BY_ID } from "../questionBank";
import { axisScore, priorityIndex, priorityBand, gapPoints } from "../scoring";
import { readinessScore, goLiveReady, GATES } from "../readiness";
import { estimatePackage, estimateProgramme, applyContingency, staffing, validateLine, type EstimateLine } from "../sizing";
import { evaluate, applicabilityOf, reactivatedQuestions } from "../branching";
import { computeCoverage } from "../coverage";
import { runRules } from "../rules";
import type { AnswerMap } from "../types";

const ans = (state: any, value: any = null, v = 1) => ({ state, value, row_version: v, review_status: "draft" as const });

describe("question bank", () => {
  it("has exactly 127 unique questions across 15 modules", () => {
    expect(QUESTIONS.length).toBe(127);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(127);
    expect(new Set(QUESTIONS.map((q) => q.module)).size).toBe(15);
  });
  it("has the 20 quick-start ids in order", () => {
    expect(QUICK_START_IDS).toEqual(["B01","B02","B03","B06","L01","L03","L04","L05","L06","C01","C03","P01","P06","Q01","A01","A04","I01","D01","X01","T01"]);
    QUICK_START_IDS.forEach((id) => expect(QUESTION_BY_ID[id].quickStart).toBe(true));
  });
  it("marks evidence-required rows and internal-only rows", () => {
    expect(QUESTION_BY_ID.L01.evidenceRequired).toBe(true);
    expect(QUESTION_BY_ID.B01.evidenceRequired).toBe(false);
    expect(QUESTION_BY_ID.B07.customerVisible).toBe(false);
  });
});

describe("capability scoring fixture", () => {
  const r = (id: string, W: "must" | "could", C: number | null, T: number | null, reviewed = true) =>
    ({ id, axis: 3, priority: W, applicability: "applicable" as const, critical: false, current_score: C, target_score: T, score_reviewed: reviewed });
  it("computes current 2.75, target 3.75, gap 1.50 (not 1.00)", () => {
    const s = axisScore(3, [r("r1", "must", 2, 4), r("r2", "could", 5, 3)]);
    expect(s.current).toBe(2.75); expect(s.target).toBe(3.75); expect(s.gap).toBe(1.5); expect(s.gap).not.toBe(1);
    expect(s.suppressed).toBe(false);
  });
  it("suppresses axis at 40% coverage", () => {
    const s = axisScore(3, [r("r1", "must", 2, 4), r("r2", "could", 5, 3), r("r3", "must", null, null, false), r("r4", "must", null, null, false)]);
    expect(s.coverage).toBeCloseTo(0.4); expect(s.suppressed).toBe(true);
  });
  it("missing scores stay null", () => expect(gapPoints(null, 4)).toBeNull());
});

describe("priority index", () => {
  it("is unscored when an input is missing", () => expect(priorityBand({ impact: 5, urgency: null, delivery_risk: 5, dependency_criticality: 5 })).toBe("Unscored"));
  it("max inputs give 100 / P1", () => { expect(priorityIndex({ impact: 5, urgency: 5, delivery_risk: 5, dependency_criticality: 5 })).toBe(100); });
  it("min inputs give 20 / P4", () => expect(priorityBand({ impact: 1, urgency: 1, delivery_risk: 1, dependency_criticality: 1 })).toBe("P4"));
});

describe("readiness fixture", () => {
  const all = (state: number) => GATES.map((g) => ({ gate_no: g.no, state, applicable: true, na_reviewed: false, assessed: true }));
  it("all approved = 100, all zero = 0", () => { expect(readinessScore(all(3))).toBe(100); expect(readinessScore(all(0))).toBe(0); });
  it("P1 blocker prevents go-live-ready even at 100", () => {
    expect(goLiveReady(all(3), { openP1Blockers: 1, mandatoryAcceptanceFailed: false, criticalDecisionUnresolved: false }).ready).toBe(false);
    expect(goLiveReady(all(3), { openP1Blockers: 0, mandatoryAcceptanceFailed: false, criticalDecisionUnresolved: false }).ready).toBe(true);
  });
  it("reviewed N/A reweights; unreviewed N/A does not", () => {
    const g = all(3); g[3] = { ...g[3], state: 0, applicable: false, na_reviewed: true };
    expect(readinessScore(g)).toBe(100);
    g[3] = { ...g[3], na_reviewed: false };
    expect(readinessScore(g)).toBe(85);
  });
});

describe("sizing fixture", () => {
  const line = (wp: string, h: [number | null, number | null, number | null]): EstimateLine => ({ work_package_id: wp, unit_type: "bundle_complex", quantity_mode: "exact", qty_low: 3, qty_likely: 3, qty_high: 3, hours_low: h[0], hours_likely: h[1], hours_high: h[2], allocation_pct: 100, is_fixed_task: false });
  it("3 units at 4/6/10 => 12/18/30; +10% => 13.2/19.8/33", () => {
    const e = estimatePackage("wp1", [line("wp1", [4, 6, 10])]);
    expect(e.base).toEqual({ low: 12, likely: 18, high: 30 });
    expect(applyContingency(e.base!, { model: "percentage", pct: 10 })).toEqual({ low: 13.2, likely: 19.8, high: 33 });
  });
  it("missing effort makes the programme incomplete with no total", () => {
    const p = estimateProgramme(["wp1", "wp2"], [line("wp1", [4, 6, 10]), line("wp2", [null, null, null])]);
    expect(p.complete).toBe(false); expect(p.total).toBeNull(); expect(p.unestimatedPackages).toEqual(["wp2"]);
  });
  it("rejects inverted bands", () => expect(validateLine(line("w", [10, 6, 4])).length).toBeGreaterThan(0));
  it("staffing rounds up to whole people", () => expect(staffing(500, 40, 10).headcount).toBe(2));
});

describe("branching & unknowns", () => {
  it("unknown controlling answer is unresolved, not false", () => {
    expect(evaluate({ op: "contains", q: "C02", values: ["recurring"] }, { C02: ans("unknown") })).toBe("unresolved");
  });
  it("changing recurring route hides lifecycle answers but preserves and flags on reactivation", () => {
    const withRecurring: AnswerMap = { C02: ans("known", { selected: ["recurring"] }), B03: ans("known", { selected: ["configure_price_quote"] }), A01: ans("known", { selected: ["renew"] }), A02: ans("known", { count: { mode: "exact", exact: 5 } }) };
    const without: AnswerMap = { ...withRecurring, C02: ans("known", { selected: ["one_time"] }, 2), A01: ans("not_applicable") };
    expect(applicabilityOf(QUESTION_BY_ID.A02, without)).toBe("hidden");
    expect(without.A02).toBeDefined();
    expect(reactivatedQuestions(without, { ...without, C02: ans("known", { selected: ["recurring"] }, 3) })).toContain("A02");
  });
  it("unknown stays in coverage denominator; all N/A shows null", () => {
    const c = computeCoverage({ B01: ans("unknown"), B02: ans("known", { items: [] }) }, new Set(), { ids: ["B01", "B02"] });
    expect(c.applicable).toBe(2); expect(c.answered).toBe(1); expect(c.answerPct).toBe(50);
    const n = computeCoverage({ B01: ans("not_applicable"), B02: ans("not_applicable") }, new Set(), { ids: ["B01", "B02"] });
    expect(n.answerPct).toBeNull();
  });
});

describe("rules engine", () => {
  const ctx = (answers: AnswerMap, registers: any[] = []) => ({ answers, registers, requirements: [], evidencedQuestionIds: new Set<string>() });
  it("QCP=Yes yields G01; SBQQ interface yields G15; idempotent", () => {
    const a: AnswerMap = { P06: ans("known", { selected: "yes" }) };
    const regs = [{ id: "int1", register_type: "integration", code: "INT-01", title: "ERP orders", data: { legacy_references: "SBQQ__Quote__c" } }];
    const r1 = runRules(ctx(a, regs)); const r2 = runRules(ctx(a, regs));
    expect(r1.find((f) => f.rule_id === "G01")).toBeDefined();
    expect(r1.find((f) => f.rule_id === "G15" && f.finding_key === "int1")).toBeDefined();
    expect(r1.map((f) => f.rule_id + f.finding_key)).toEqual(r2.map((f) => f.rule_id + f.finding_key));
  });
  it("scenario outside tolerance yields G22", () => {
    const regs = [{ id: "s1", register_type: "scenario", code: "SC-01", title: "Bundle quote", data: { expected_amount: 1000, target_result: 1040, tolerance: 1 } }];
    expect(runRules(ctx({}, regs)).find((f) => f.rule_id === "G22")).toBeDefined();
  });
});
