import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ADMIN_NAV } from "@/components/admin/nav";
import { APP_NAV } from "@/components/app/nav";
import { activeItem, isLive, type NavGroup } from "./types";

const pagePath = (section: "(app)" | "admin", href: string) =>
  section === "admin" ? `src/app${href}/page.tsx` : `src/app/(app)${href}/page.tsx`;

const items = (groups: NavGroup[]) => groups.flatMap((group) => group.items);

describe("sidebar navigation", () => {
  it.each([
    ["(app)", APP_NAV],
    ["admin", ADMIN_NAV],
  ] as const)("every live %s entry has a page, and no hrefs repeat", (section, groups) => {
    const live = items(groups).filter(isLive);
    for (const item of live) expect(existsSync(pagePath(section, item.href)), item.href).toBe(true);
    const hrefs = items(groups).map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("later-phase entries have no page yet (so they are not half-built)", () => {
    for (const item of items(APP_NAV).filter((i) => !isLive(i))) {
      expect(existsSync(pagePath("(app)", item.href)), item.href).toBe(false);
    }
  });

  it("marks the longest matching entry as active", () => {
    expect(activeItem(ADMIN_NAV, "/admin")?.href).toBe("/admin");
    expect(activeItem(ADMIN_NAV, "/admin/seo/home")?.href).toBe("/admin/seo");
    expect(activeItem(APP_NAV, "/projects/123/costing")?.href).toBe("/projects");
    expect(activeItem(APP_NAV, "/projectsx")).toBeUndefined();
    // A later-phase entry never becomes active.
    expect(activeItem(APP_NAV, "/marketplace")).toBeUndefined();
  });
});
