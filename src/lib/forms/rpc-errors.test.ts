import { describe, expect, it } from "vitest";
import { GENERIC_ERROR, rpcErrorMessage } from "./rpc-errors";

describe("rpcErrorMessage", () => {
  it("explains plan limits by the limit's name", () => {
    expect(rpcErrorMessage({ message: "plan_limit_reached", details: "seats" })).toMatch(
      /no free seats/,
    );
    expect(rpcErrorMessage({ message: "plan_limit_reached", details: "active_projects" })).toMatch(
      /open projects/,
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
