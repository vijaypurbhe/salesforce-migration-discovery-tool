import type { AnswerMap, Rule, QuestionDefinition } from "./types";
import { QUESTIONS, QUESTION_BY_ID } from "./questionBank";

export type Tri = true | false | "unresolved";

function selectedValues(a: AnswerMap[string] | undefined): string[] {
  const s = a?.value?.selected;
  if (Array.isArray(s)) return s;
  if (typeof s === "string") return [s];
  return [];
}

function numericValue(a: AnswerMap[string] | undefined): number | null {
  const c = a?.value?.count;
  if (c) {
    if (c.mode === "exact" && typeof c.exact === "number") return c.exact;
    if (typeof c.min === "number") return c.min;
  }
  return null;
}

/** Evaluate a declarative rule. Missing / unknown / needs-validation controlling answers yield "unresolved", never false. */
export function evaluate(rule: Rule, answers: AnswerMap): Tri {
  const st = (q: string) => answers[q]?.state;
  const unresolvedIfNotKnown = (q: string): Tri | null => {
    const s = st(q);
    if (s === "not_applicable") return false;
    if (s !== "known") return "unresolved";
    return null;
  };
  switch (rule.op) {
    case "known": {
      const s = st(rule.q);
      if (s === "known") return true;
      if (s === "not_applicable") return false;
      return "unresolved";
    }
    case "confirmed_not_applicable":
      return st(rule.q) === "not_applicable" ? true : st(rule.q) === "known" ? false : "unresolved";
    case "equals": {
      const u = unresolvedIfNotKnown(rule.q); if (u !== null) return u;
      return selectedValues(answers[rule.q]).length === 1 && selectedValues(answers[rule.q])[0] === rule.value;
    }
    case "in": {
      const u = unresolvedIfNotKnown(rule.q); if (u !== null) return u;
      const v = selectedValues(answers[rule.q]);
      return v.length > 0 && v.every((x) => rule.values.includes(x));
    }
    case "contains": {
      const u = unresolvedIfNotKnown(rule.q); if (u !== null) return u;
      return selectedValues(answers[rule.q]).some((x) => rule.values.includes(x));
    }
    case "greater_than": {
      const u = unresolvedIfNotKnown(rule.q); if (u !== null) return u;
      const n = numericValue(answers[rule.q]);
      return n === null ? "unresolved" : n > rule.value;
    }
    case "not": {
      const r = evaluate(rule.rule, answers);
      return r === "unresolved" ? r : !r;
    }
    case "any": {
      const rs = rule.rules.map((r) => evaluate(r, answers));
      if (rs.includes(true)) return true;
      if (rs.includes("unresolved")) return "unresolved";
      return false;
    }
    case "all": {
      const rs = rule.rules.map((r) => evaluate(r, answers));
      if (rs.includes(false)) return false;
      if (rs.includes("unresolved")) return "unresolved";
      return true;
    }
  }
}

export type Applicability = "applicable" | "hidden" | "unresolved" | "bulk_na";

export function applicabilityOf(q: QuestionDefinition, answers: AnswerMap, bulkNa: Record<string, string> = {}): Applicability {
  if (bulkNa[q.module]) return "bulk_na";
  if (!q.visibilityRule) return "applicable";
  const r = evaluate(q.visibilityRule, answers);
  return r === true ? "applicable" : r === false ? "hidden" : "unresolved";
}

export function applicabilityMap(answers: AnswerMap, bulkNa: Record<string, string> = {}): Record<string, Applicability> {
  return Object.fromEntries(QUESTIONS.map((q) => [q.id, applicabilityOf(q, answers, bulkNa)]));
}

/** Questions with stored answers that transition from hidden to visible after a change — these need revalidation. */
export function reactivatedQuestions(before: AnswerMap, after: AnswerMap): string[] {
  const b = applicabilityMap(before);
  const a = applicabilityMap(after);
  return Object.keys(a).filter((id) => b[id] === "hidden" && a[id] !== "hidden" && !!after[id]);
}

/** Questions whose stored answers are now inactive (hidden) but preserved. */
export function inactiveAnswered(answers: AnswerMap): string[] {
  const m = applicabilityMap(answers);
  return Object.keys(answers).filter((id) => QUESTION_BY_ID[id] && m[id] === "hidden");
}
