"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type SectionTab = {
  label: string;
  href: string;
  /** Also active on deeper paths (`/projects/1/items/…`). The section's root tab is exact. */
  prefix?: boolean;
};

/** A page's sections as tabs under its title (settings, a project). Each tab is a route. */
export function SectionTabs({ label, tabs }: { label: string; tabs: SectionTab[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="border-b border-pr-border-card">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || (tab.prefix === true && pathname.startsWith(`${tab.href}/`));
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-block border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "border-pr-accent text-pr-ink"
                    : "border-transparent text-pr-text-secondary hover:text-pr-ink",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
