"use client";

import { ExternalLink } from "lucide-react";
import { SectionShell } from "@/components/navigation/SectionShell";
import type { Account } from "@/lib/auth/session";
import { ADMIN_NAV } from "./nav";

/**
 * The Super Admin chrome: plain shadcn zinc, like SurvPay's admin
 * (design/THEME.md §7). A Client Component of its own because the nav config
 * holds icon components, which cannot cross the server → client boundary.
 */
export function AdminShell({ account, children }: { account: Account; children: React.ReactNode }) {
  return (
    <SectionShell
      account={account}
      sectionLabel="Super Admin"
      homeHref="/admin"
      groups={ADMIN_NAV}
      footerLinks={[{ label: "View public site", href: "/", icon: ExternalLink }]}
      className="bg-background text-foreground"
    >
      {children}
    </SectionShell>
  );
}
