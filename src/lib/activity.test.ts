import { describe, expect, it } from "vitest";
import { describeActivity } from "./activity";

const entry = (
  action: string,
  metadata: Record<string, unknown> = {},
  actorName: string | null = "Leo Tan",
) => ({
  action,
  actorName,
  metadata,
});

describe("describeActivity", () => {
  it("describes membership changes", () => {
    expect(
      describeActivity(entry("member.invited", { email: "a@b.test", org_role: "admin" })),
    ).toBe("Leo Tan invited a@b.test as an Admin");
    expect(describeActivity(entry("member.invited", { email: "a@b.test", resent: true }))).toBe(
      "Leo Tan renewed the invite for a@b.test",
    );
    expect(describeActivity(entry("member.role_changed", { name: "Ratna", to: "member" }))).toBe(
      "Leo Tan made Ratna a Member",
    );
    expect(describeActivity(entry("member.joined", { org_role: "member" }, "Ratna"))).toBe(
      "Ratna joined as a Member",
    );
    expect(
      describeActivity(entry("organization.ownership_transferred", { from: "Leo", to: "Ratna" })),
    ).toBe("Leo made Ratna the Owner");
  });

  it("names the settings areas that changed, once each", () => {
    expect(
      describeActivity(entry("organization.updated", { fields: ["email", "website", "settings"] })),
    ).toBe("Leo Tan updated the public profile and the pricing & document defaults");
    expect(describeActivity(entry("organization.updated", { fields: ["logo_path"] }))).toBe(
      "Leo Tan updated the logo",
    );
  });

  it("never shows a deleted user's name", () => {
    expect(describeActivity(entry("account.deleted", {}, null))).toBe(
      "A member deleted their account",
    );
  });
});
