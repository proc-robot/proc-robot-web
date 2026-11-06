import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { CustomersTable, type CustomerRow } from "@/components/customers/CustomersTable";
import { Pagination } from "@/components/shared/Pagination";
import { SearchInput } from "@/components/shared/SearchInput";
import { Button } from "@/components/ui/button";
import { requireMember } from "@/lib/auth/session";
import { searchPattern } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Customers" };

const PAGE_SIZE = 25;

/** The customer directory (Q1): every member adds and edits customers. */
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const claims = await requireMember();
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(params.page ?? "", 10) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("id, name, contact_name, email, phone, projects(count)", { count: "exact" })
    .eq("organization_id", claims.org_id);
  if (q) {
    const pattern = searchPattern(q);
    query = query.or(`name.ilike.${pattern},contact_name.ilike.${pattern},email.ilike.${pattern}`);
  }
  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await query.order("name").range(from, from + PAGE_SIZE - 1);

  const rows: CustomerRow[] = (data ?? []).map((customer) => ({
    id: customer.id,
    name: customer.name,
    contactName: customer.contact_name,
    email: customer.email,
    phone: customer.phone,
    projects: customer.projects[0]?.count ?? 0,
  }));

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="Customers"
        description="The companies you quote for. Choose one on a project and its quotations."
        actions={
          <Button asChild>
            <Link href="/customers/new">
              <Plus aria-hidden />
              New customer
            </Link>
          </Button>
        }
      />
      <SearchInput label="Search customers" placeholder="Search by name, contact or email…" />
      <section
        aria-label="Customer list"
        className="rounded-[14px] border border-pr-border-card bg-white px-4 py-2"
      >
        {rows.length > 0 ? (
          <CustomersTable rows={rows} />
        ) : (
          <div className="space-y-2 py-10 text-center">
            <p className="font-medium">{q ? `No customer matches “${q}”.` : "No customers yet."}</p>
            {!q && (
              <p className="text-sm text-pr-text-secondary">
                Add them here, or from a project&apos;s form when you create it.
              </p>
            )}
          </div>
        )}
        <Pagination page={page} totalPages={Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))} />
      </section>
    </div>
  );
}
