import type { Metadata } from "next";
import { AppShell } from "@/components/app/AppShell";
import { AppProviders } from "@/components/providers/AppProviders";
import { getFormatPrefs } from "@/lib/format-server";
import { BodyTheme } from "@/components/shared/BodyTheme";

/**
 * The signed-in workspace (served on app.proc-robot.com once host routing
 * lands in src/proxy.ts). Never indexed: robots.txt is only a crawl hint, so
 * the `noindex` here is what keeps a linked workspace URL out of search.
 *
 * NO AUTH GUARD YET — the Supabase session check arrives with TASKS.md
 * T0.3.3 / T0.3.7. Do not deploy this anywhere public before then.
 */
export const metadata: Metadata = {
  title: { template: "%s · Proc-Robot", default: "Proc-Robot" },
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders formatPrefs={await getFormatPrefs()}>
      <BodyTheme theme="brand" />
      <AppShell>{children}</AppShell>
    </AppProviders>
  );
}
