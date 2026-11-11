import { describe, expect, it } from "vitest";
import { surveyIsOpen, allowedSurveyQuestion } from "../../../supabase/functions/customer-survey/policy";
import { createCapability, isCapability } from "../../../supabase/functions/customer-survey/capability";
import bank from "../../../supabase/functions/customer-survey/questions.json";
import { QUESTIONS, QUICK_START_IDS } from "../questionBank";
describe("customer survey protection", () => {
  const s = { revoked_at: null, submitted_at: null, expires_at: "2026-12-01T00:00:00Z" };
  it("allows only questions assigned to this survey", () => { expect(allowedSurveyQuestion("B01", ["B01"])).toBe(true); expect(allowedSurveyQuestion("C01", ["B01"])).toBe(false); });
  it("never exposes internal questions", () => { expect(allowedSurveyQuestion("B07", ["B07"])).toBe(false); expect(allowedSurveyQuestion("T08", ["T08"])).toBe(false); });
  it("rejects revoked survey writes", () => { expect(surveyIsOpen({ ...s, revoked_at: "2026-11-11" }, 0)).toBe(false); });
  it("rejects edits after customer submission", () => { expect(surveyIsOpen({ ...s, submitted_at: "2026-11-11" }, 0)).toBe(false); });
  it("expires survey access", () => { expect(surveyIsOpen(s, Date.parse("2026-12-01T00:00:00Z"))).toBe(false); expect(surveyIsOpen(s, Date.parse("2026-11-11T00:00:00Z"))).toBe(true); });
  it("provides the exact 20 quick-start customer questions", () => { expect(bank.quickStart).toEqual(QUICK_START_IDS); expect(bank.quickStart).toHaveLength(20); });
  it("keeps all 125 customer-safe questions synchronized with discovery", () => { expect(bank.questions.filter(q => q.customerVisible).map(q => q.id)).toEqual(QUESTIONS.filter(q => q.customerVisible).map(q => q.id)); expect(bank.questions.filter(q => q.customerVisible)).toHaveLength(125); });
  it("uses independent 256-bit capabilities", () => { const token = createCapability(); expect(token).toHaveLength(64); expect(isCapability(token)).toBe(true); expect(createCapability()).not.toBe(token); expect(isCapability("survey-verification@example.com")).toBe(false); });
});