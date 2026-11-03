import type { LucideIcon } from "lucide-react";

/** Roadmap phase from PLAN.md / TASKS.md. */
export type Phase = "MVP" | "P2" | "P3" | "P4";

export type NavItem = {
  label: string;
  /** Route of the page. Items in a later phase have no page yet. */
  href: string;
  icon: LucideIcon;
  /** Items after the MVP render disabled with a phase badge until built. */
  phase: Phase;
  /** One line shown on the placeholder page and as the section's purpose. */
  description: string;
  /** TASKS.md ids that build this section. */
  tasks: string[];
};

export type NavGroup = { label: string; items: NavItem[] };

/** Whether an item links to a page yet (i.e. it is not a later-phase stub). */
export const isLive = (item: NavItem) => item.phase === "MVP";

/**
 * The item whose href best matches `pathname`: the longest href that equals
 * it or is a parent of it. Longest-wins keeps a section root such as `/admin`
 * from staying active on every `/admin/*` page.
 */
export function activeItem(groups: NavGroup[], pathname: string): NavItem | undefined {
  let best: NavItem | undefined;
  for (const item of groups.flatMap((group) => group.items)) {
    if (!isLive(item)) continue;
    const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && (!best || item.href.length > best.href.length)) best = item;
  }
  return best;
}

/** Looks an item up by its href, for a page that renders its own nav entry. */
export function navItem(groups: NavGroup[], href: string): NavItem {
  const item = groups.flatMap((group) => group.items).find((i) => i.href === href);
  if (!item) throw new Error(`No nav item for ${href}`);
  return item;
}
