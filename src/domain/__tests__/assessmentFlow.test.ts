import { describe, it, expect } from "vitest";
import { discoveryCompleted, proposalCreated } from "../assessmentFlow";
describe("Assessment funnel milestones", () => {
  it("tracks discovery completion only on leaving discovery for review or delivery", () => {
    expect(discoveryCompleted("discovery", "architect_review")).toBe(true);
    expect(discoveryCompleted("discovery", "archived")).toBe(false);
    expect(discoveryCompleted("architect_review", "proposal")).toBe(false);
    expect(discoveryCompleted("discovery", "discovery")).toBe(false);
  });
  it("tracks proposal creation only on entering the proposal stage", () => {
    expect(proposalCreated("architect_review", "proposal")).toBe(true);
    expect(proposalCreated("proposal", "proposal")).toBe(false);
    expect(proposalCreated("proposal", "baselined")).toBe(false);
  });
});