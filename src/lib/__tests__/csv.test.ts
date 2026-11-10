import { describe, it, expect } from "vitest";
import { safeCell, toCsv, parseCsv } from "../csv";
describe("csv safety", () => {
  it("neutralises formula characters", () => {
    expect(safeCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(safeCell("+1")).toBe("'+1"); expect(safeCell("@x")).toBe("'@x"); expect(safeCell("-2")).toBe("'-2");
    expect(safeCell("ok")).toBe("ok");
  });
  it("round-trips quoted values", () => {
    const csv = toCsv([{ a: 'x,"y"', b: "=1" }], ["a", "b"]);
    expect(parseCsv(csv)).toEqual([["a", "b"], ['x,"y"', "'=1"]]);
  });
});
