import { describe, it, expect } from "vitest";
import { aiResultSchema } from "../aiFindings";
describe("AI discovery output", () => {
  it("requires themes, risks and actionable recommendations", () => { expect(aiResultSchema.safeParse({ summary: "Only summary" }).success).toBe(false); });
  it("requires recommendation owner and measurable success criterion", () => { expect(aiResultSchema.safeParse({ summary: "Summary", themes: [], risks: [], unknowns: [], recommendations: [{ title: "Validate pricing", detail: "Review rules", source: "Custom discounts", priority: "now" }] }).success).toBe(false); });
});