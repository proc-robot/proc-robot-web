import { describe, expect, it } from "vitest";
import { GENERIC_ERROR, rpcErrorMessage, rpcFieldErrors } from "./rpc-errors";

describe("rpcErrorMessage", () => {
  it("explains plan limits by the limit's name", () => {
    expect(rpcErrorMessage({ message: "plan_limit_reached", details: "seats" })).toMatch(
      /no free seats/,
    );
    expect(rpcErrorMessage({ message: "plan_limit_reached", details: "active_projects" })).toMatch(
      /open projects/,
    );
  });

  it("says how many credits are left", () => {
    expect(rpcErrorMessage({ message: "insufficient_credits", details: "12" })).toBe(
      "Not enough credits: 12 left. Plan credits renew every month.",
    );
  });

  it("maps known codes and hides everything else", () => {
    expect(rpcErrorMessage({ message: "invite_not_found" })).toMatch(/no longer valid/);
    expect(rpcErrorMessage({ message: 'duplicate key value violates unique constraint "x"' })).toBe(
      GENERIC_ERROR,
    );
    expect(rpcErrorMessage(null, "Fallback")).toBe("Fallback");
  });
});

describe("invalid fields", () => {
  it("names the field the database refused", () => {
    expect(rpcErrorMessage({ message: "invalid_field", details: "whatsapp_number" })).toMatch(
      /country code/,
    );
    expect(rpcErrorMessage({ message: "invalid_field", details: "nope" })).toMatch(/not valid/);
  });

  it("puts the message under the form's own field", () => {
    const error = { message: "invalid_field", details: "settings.tax_rate" };
    expect(rpcFieldErrors(error, { "settings.tax_rate": "taxRate" })).toEqual({
      taxRate: "Enter a tax rate from 0 to 100.",
    });
    expect(rpcFieldErrors(error, {})).toBeUndefined();
    expect(rpcFieldErrors({ message: "not_allowed" }, { x: "y" })).toBeUndefined();
  });
});
