import { describe, expect, it } from "vitest";
import { isNumberFormat, previewNumber } from "./numbering";

const NOV_2026 = new Date("2026-11-04T00:00:00Z");

describe("number formats", () => {
  it("accepts the documented codes and needs a counter", () => {
    expect(isNumberFormat("KIGEN-QUO-{YYYY}-{NNNN}")).toBe(true);
    expect(isNumberFormat("RFQ/{YY}{MM}/{NNN}")).toBe(true);
    expect(isNumberFormat("KIGEN-QUO-{YYYY}")).toBe(false);
    expect(isNumberFormat("QUO {NNNN}")).toBe(false);
    expect(isNumberFormat("QUO-{NN}")).toBe(false);
    expect(isNumberFormat(`${"X".repeat(55)}{NNNN}`)).toBe(false);
  });

  it("previews a number", () => {
    expect(previewNumber("KIGEN-QUO-{YYYY}-{NNNN}", NOV_2026)).toBe("KIGEN-QUO-2026-0001");
    expect(previewNumber("RFQ/{YY}{MM}/{NNN}", NOV_2026, 42)).toBe("RFQ/2611/042");
  });
});
