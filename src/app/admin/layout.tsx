import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * The Super Admin console. `robots.ts` already disallows `/admin/`, but
 * robots.txt is a crawl instruction, not an indexing one: a URL linked from
 * elsewhere can still be indexed without being fetched. `noindex` is what
 * actually keeps these pages out.
 *
 * NO AUTH GUARD YET — the `app_role = 'super_admin'` check arrives with
 * TASKS.md T0.3.5 / T0.3.7. Do not deploy this anywhere public before then.
 */
export const metadata: Metadata = {
  title: { template: "%s · Proc-Robot Admin", default: "Proc-Robot Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
