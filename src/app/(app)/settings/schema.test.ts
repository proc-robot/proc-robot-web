import { describe, expect, it } from "vitest";
import { fromSettings, organizationSettingsSchema, toSettings } from "./schema";

const KIGEN = {
  tax_rate: 9,
  default_markup_pct: 25,
  minimum_margin_pct: 10,
  numbering: { sales_quote: "KIGEN-QUO-{YYYY}-{NNNN}", rfq: "KIGEN-RFQ-{YYYY}-{NNNN}" },
};

describe("organization settings", () => {
  it("round-trips the stored settings through the form", () => {
    expect(toSettings(fromSettings(KIGEN), KIGEN)).toEqual(KIGEN);
  });

  it("drops emptied fields and keeps keys the form does not manage", () => {
    const values = { ...fromSettings(KIGEN), taxRate: "", rfqNumbering: "" };
    expect(toSettings(values, { ...KIGEN, default_template_id: "t1" })).toEqual({
      default_markup_pct: 25,
      minimum_margin_pct: 10,
      numbering: { sales_quote: "KIGEN-QUO-{YYYY}-{NNNN}" },
      default_template_id: "t1",
    });
  });

  it("stores rounding only when a mode is chosen", () => {
    const values = { ...fromSettings({}), roundingMode: "up" as const, roundingIncrement: "100" };
    expect(toSettings(values, {})).toEqual({ rounding: { mode: "up", increment: 100 } });
    expect(fromSettings({ rounding: { mode: "up", increment: 100 } }).roundingIncrement).toBe(
      "100",
    );
  });

  it("checks ranges and needs a rounding step", () => {
    const valid = fromSettings(KIGEN);
    expect(organizationSettingsSchema.safeParse(valid).success).toBe(true);
    expect(organizationSettingsSchema.safeParse({ ...valid, taxRate: "150" }).success).toBe(false);
    expect(
      organizationSettingsSchema.safeParse({ ...valid, minimumMarginPct: "100" }).success,
    ).toBe(false);
    const rounding = organizationSettingsSchema.safeParse({ ...valid, roundingMode: "nearest" });
    expect(rounding.success).toBe(false);
    expect(rounding.error?.issues[0]?.path).toEqual(["roundingIncrement"]);
  });
});
