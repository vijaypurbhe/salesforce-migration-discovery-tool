import type { AnswerMap } from "./types";
import { QUESTIONS } from "./questionBank";
import { applicabilityMap } from "./branching";

export interface Coverage {
  applicable: number;
  answered: number;
  answeredUnknown: number;
  reviewed: number;
  evidenceRequired: number;
  evidenced: number;
  routingUnresolved: number;
  confirmedNa: number;
  answerPct: number | null;
  reviewPct: number | null;
  evidencePct: number | null;
}

/**
 * Answer coverage = substantive (known) answers on applicable questions / applicable questions.
 * Unknown, needs-validation and unresolved required questions stay in the denominator.
 * Confirmed justified N/A is excluded. If everything is N/A the percentage is null (display "N/A").
 */
export function computeCoverage(answers: AnswerMap, evidencedQuestionIds: Set<string>, opts: { modules?: string[]; bulkNa?: Record<string, string>; ids?: string[] } = {}): Coverage {
  const appl = applicabilityMap(answers, opts.bulkNa);
  let qs = QUESTIONS.filter((q) => !opts.modules || opts.modules.includes(q.module));
  if (opts.ids) qs = qs.filter((q) => opts.ids!.includes(q.id));
  let applicable = 0, answered = 0, answeredUnknown = 0, reviewed = 0, evReq = 0, evd = 0, unresolved = 0, na = 0;
  for (const q of qs) {
    const a = answers[q.id];
    const ap = appl[q.id];
    if (ap === "hidden") continue;
    if (ap === "bulk_na" || a?.state === "not_applicable") { na++; continue; }
    if (ap === "unresolved") unresolved++;
    applicable++;
    if (a?.state === "known") answered++;
    if (a?.state === "unknown" || a?.state === "needs_validation") answeredUnknown++;
    if (a?.review_status === "reviewed") reviewed++;
    if (q.evidenceRequired) { evReq++; if (evidencedQuestionIds.has(q.id)) evd++; }
  }
  const pct = (n: number, d: number) => (d === 0 ? null : Math.round((n / d) * 1000) / 10);
  return {
    applicable, answered, answeredUnknown, reviewed, evidenceRequired: evReq, evidenced: evd,
    routingUnresolved: unresolved, confirmedNa: na,
    answerPct: pct(answered, applicable), reviewPct: pct(reviewed, applicable), evidencePct: pct(evd, evReq),
  };
}
