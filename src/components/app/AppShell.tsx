"use client";

import { SectionShell } from "@/components/navigation/SectionShell";
import { APP_NAV } from "./nav";

/**
 * The workspace chrome. A Client Component of its own because the nav config
 * holds icon components, which cannot be passed from a Server Component layout
 * as props — it is imported here, on the client side of the boundary.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SectionShell
      sectionLabel="Workspace"
      homeHref="/dashboard"
      groups={APP_NAV}
      className="theme-brand bg-pr-bg text-pr-ink"
    >
      {children}
    </SectionShell>
  );
}
