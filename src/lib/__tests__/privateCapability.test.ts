import { describe, expect, it } from "vitest";
import { createCapability, isCapability } from "../../../supabase/functions/workspace-access/capability";

describe("private workspace access", () => {
  it("creates independent 256-bit access capabilities rather than deriving them from email", () => {
    const first = createCapability();
    const second = createCapability();
    expect(first).toHaveLength(64);
    expect(isCapability(first)).toBe(true);
    expect(first).not.toBe(second);
  });
  it("does not accept an email address or short string as a private access token", () => {
    expect(isCapability("someone@example.com")).toBe(false);
    expect(isCapability("a".repeat(63))).toBe(false);
    expect(isCapability(null)).toBe(false);
  });
});