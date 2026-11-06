"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { label: "General", href: "/settings" },
  { label: "Public profile", href: "/settings/public-profile" },
  { label: "Members", href: "/settings/members" },
  { label: "Pricing & documents", href: "/settings/defaults" },
];

/** The settings pages, as tabs under the page title. */
export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings sections" className="border-b border-pr-border-card">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {SECTIONS.map((section) => {
          const active = pathname === section.href;
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-block border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "border-pr-accent text-pr-ink"
                    : "border-transparent text-pr-text-secondary hover:text-pr-ink",
                )}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
