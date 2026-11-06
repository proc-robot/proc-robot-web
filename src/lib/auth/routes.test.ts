import { describe, expect, it } from "vitest";
import { ADMIN_NAV } from "@/components/admin/nav";
import { APP_NAV } from "@/components/app/nav";
import { STATIC_PAGE_SEO_DEFS } from "@/lib/page-seo-registry";
import { routeKind, safeNextPath } from "./routes";

const hrefs = (groups: typeof APP_NAV) => groups.flatMap((group) => group.items.map((i) => i.href));

describe("routeKind", () => {
  it("protects every workspace sidebar entry, including later phases", () => {
    for (const href of hrefs(APP_NAV)) {
      expect(routeKind(href), href).toBe("workspace");
      expect(routeKind(`${href}/123/edit`), href).toBe("workspace");
    }
  });

  it("protects the account page, which is reached from the account menu", () => {
    expect(routeKind("/account")).toBe("workspace");
  });

  it("treats every admin entry as admin", () => {
    for (const href of hrefs(ADMIN_NAV)) expect(routeKind(href), href).toBe("admin");
  });

  it("leaves the marketing site public", () => {
    for (const def of STATIC_PAGE_SEO_DEFS) expect(routeKind(def.path)).toBe("public");
    expect(routeKind("/robots.txt")).toBe("public");
    expect(routeKind("/does-not-exist")).toBe("public");
  });

  it("does not match look-alike paths", () => {
    expect(routeKind("/projectsx")).toBe("public");
    expect(routeKind("/administrator")).toBe("public");
  });

  it("knows the auth pages", () => {
    expect(routeKind("/sign-in")).toBe("sign-in");
    expect(routeKind("/onboarding")).toBe("onboarding");
    expect(routeKind("/auth/callback")).toBe("auth-callback");
    expect(routeKind("/auth/confirm")).toBe("auth-callback");
  });
});

describe("safeNextPath", () => {
  it("keeps paths on this site", () => {
    expect(safeNextPath("/projects/42?tab=costing")).toBe("/projects/42?tab=costing");
  });

  it("refuses anything that leaves the site", () => {
    for (const value of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "projects",
      "",
      null,
    ]) {
      expect(safeNextPath(value), String(value)).toBe("/dashboard");
    }
  });
});
