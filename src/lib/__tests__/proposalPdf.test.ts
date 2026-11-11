import { describe, it, expect } from "vitest";
import { proposalReady, type ProposalDocument } from "../proposalPdf";
const pack = (stage: string, approved = true, internal_only = false): ProposalDocument => ({ audience: "customer", generated_at: "2026-11-11", hash: "test", assessment: { stage, name: "Client", code: "A01", target_product: "Revenue Cloud", target_release: "", template_version: "1", rubric_version: "1", rule_version: "1" }, proposal_sections: [{ section_no: 1, body: "Approved scope", approved, internal_only }], findings: [], work_packages: [], ai_discovery: [] });
describe("Completed client proposal export", () => {
  it("requires an approved client section", () => { expect(proposalReady(pack("proposal", false))).toBe(false); expect(proposalReady(pack("proposal"))).toBe(true); });
  it("never treats internal-only narrative as client approval", () => { expect(proposalReady(pack("proposal", true, true))).toBe(false); });
  it("requires proposal or baselined stage", () => { expect(proposalReady(pack("discovery"))).toBe(false); expect(proposalReady(pack("baselined"))).toBe(true); });
});