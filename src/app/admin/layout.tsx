import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { AdminShell } from "@/components/admin/AdminShell";
import { AppProviders } from "@/components/providers/AppProviders";
import { getAccount, requireSuperAdmin } from "@/lib/auth/session";
import { getFormatPrefs } from "@/lib/format-server";

/**
 * The Super Admin console. `robots.ts` already disallows `/admin/`, but
 * robots.txt is a crawl instruction, not an indexing one: a URL linked from
 * elsewhere can still be indexed without being fetched. `noindex` is what
 * actually keeps these pages out.
 *
 * Super Admins only: src/proxy.ts sends other users to their dashboard, and
 * requireSuperAdmin() returns a 404 here as the second check.
 */
export const metadata: Metadata = {
  title: { template: "%s · Proc-Robot Admin", default: "Proc-Robot Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();
  const account = await getAccount();
  if (!account) redirect(SIGN_IN_PATH);

  return (
    <AppProviders formatPrefs={await getFormatPrefs()}>
      <AdminShell account={account}>{children}</AdminShell>
    </AppProviders>
  );
}
