import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { AppShell } from "@/components/app/AppShell";
import { AppProviders } from "@/components/providers/AppProviders";
import { getAccount, requireMember } from "@/lib/auth/session";
import { getFormatPrefs } from "@/lib/format-server";
import { BodyTheme } from "@/components/shared/BodyTheme";

/**
 * The signed-in workspace (served on app.proc-robot.com once host routing
 * lands in src/proxy.ts). Never indexed: robots.txt is only a crawl hint, so
 * the `noindex` here is what keeps a linked workspace URL out of search.
 *
 * Signed-in members only: src/proxy.ts redirects everyone else, and
 * requireMember() checks again here. RLS scopes every query to the org.
 */
export const metadata: Metadata = {
  title: { template: "%s · Proc-Robot", default: "Proc-Robot" },
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireMember();
  const account = await getAccount();
  if (!account) redirect(SIGN_IN_PATH);

  return (
    <AppProviders formatPrefs={await getFormatPrefs()}>
      <BodyTheme theme="brand" />
      <AppShell account={account}>{children}</AppShell>
    </AppProviders>
  );
}
