import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { ProjectFilters } from "@/components/projects/ProjectFilters";
import { ProjectsTable, type ProjectRow } from "@/components/projects/ProjectsTable";
import { Pagination } from "@/components/shared/Pagination";
import { Button } from "@/components/ui/button";
import { requireMember } from "@/lib/auth/session";
import { placeName } from "@/lib/countries";
import { getFormatter } from "@/lib/format-server";
import {
  deadlineRange,
  isFiltered,
  parseProjectFilters,
  searchPattern,
  statusesFor,
  todayIn,
} from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";
import { getCustomerOptions, getMemberNames, getProjectAllowance } from "./data";

export const metadata: Metadata = { title: "Projects" };

const PAGE_SIZE = 25;

/** The project list (W3): search, filter by status, customer, creator and deadline. */
export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const claims = await requireMember();
  const orgId = claims.org_id;
  const filters = parseProjectFilters(await searchParams);
  const [format, customers, memberNames, allowance] = await Promise.all([
    getFormatter(),
    getCustomerOptions(orgId),
    getMemberNames(orgId),
    getProjectAllowance(orgId),
  ]);
  const today = todayIn(format.prefs.timeZone);

  const supabase = await createClient();
  let query = supabase
    .from("projects")
    .select(
      "id, name, reference_no, deadline, delivery_country, delivery_city, status, updated_at, created_by, customers(name)",
      { count: "exact" },
    )
    .eq("organization_id", orgId)
    .in("status", statusesFor(filters.status));
  if (filters.customer) query = query.eq("customer_id", filters.customer);
  if (filters.createdBy) query = query.eq("created_by", filters.createdBy);
  const range = deadlineRange(filters.due, today);
  if (range?.before) query = query.lt("deadline", range.before);
  if (range?.from) query = query.gte("deadline", range.from);
  if (range?.to) query = query.lte("deadline", range.to);
  if (range?.none) query = query.is("deadline", null);
  if (filters.q) {
    const pattern = searchPattern(filters.q);
    const term = filters.q.toLowerCase();
    const customerIds = customers
      .filter((customer) => customer.label.toLowerCase().includes(term))
      .slice(0, 50)
      .map((customer) => customer.value);
    query = query.or(
      [
        `name.ilike.${pattern}`,
        `reference_no.ilike.${pattern}`,
        ...(customerIds.length ? [`customer_id.in.(${customerIds.join(",")})`] : []),
      ].join(","),
    );
  }
  if (filters.sort === "deadline") {
    query = query.order("deadline", { ascending: true, nullsFirst: false }).order("name");
  } else if (filters.sort === "name") {
    query = query.order("name");
  } else {
    query = query.order("updated_at", { ascending: false });
  }
  const from = (filters.page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);

  const rows: ProjectRow[] = (data ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    referenceNo: project.reference_no,
    customerName: project.customers?.name ?? null,
    deadline: project.deadline,
    deadlineText: project.deadline ? format.calendarDate(project.deadline) : null,
    place: placeName(project.delivery_city, project.delivery_country),
    status: project.status,
    createdByName: project.created_by ? (memberNames.get(project.created_by) ?? null) : null,
    updatedText: format.date(project.updated_at),
  }));
  const members = [...memberNames]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader
        title="Projects"
        description={
          <>
            <p>Tenders and jobs: their specifications, items, prices, costing and quotations.</p>
            {allowance.limit !== null && (
              <p className="mt-1 text-sm text-pr-text-tertiary">
                {allowance.open} of {allowance.limit} open projects used on the{" "}
                {allowance.planName ?? "current"} plan. Won, lost and archived projects don&apos;t
                count.
              </p>
            )}
          </>
        }
        actions={
          allowance.full ? (
            <Button disabled>
              <Plus aria-hidden />
              New project
            </Button>
          ) : (
            <Button asChild>
              <Link href="/projects/new">
                <Plus aria-hidden />
                New project
              </Link>
            </Button>
          )
        }
      />
      {allowance.full && (
        <p className="rounded-[10px] bg-pr-warm-tint px-3 py-2 text-sm">
          All your plan&apos;s open projects are in use. Mark one as won or lost, or archive it, to
          start another, or upgrade the plan.
        </p>
      )}

      <ProjectFilters filters={filters} customers={customers} members={members} />

      <section
        aria-label="Project list"
        className="rounded-[14px] border border-pr-border-card bg-white px-4 py-2"
      >
        {rows.length > 0 ? (
          <ProjectsTable rows={rows} today={today} />
        ) : (
          <div className="space-y-2 py-10 text-center">
            {isFiltered(filters) ? (
              <>
                <p className="font-medium">No projects match these filters.</p>
                <p className="text-sm text-pr-text-secondary">
                  <Link href="/projects" className="text-pr-accent hover:underline">
                    Clear the filters
                  </Link>{" "}
                  to see your open projects.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">No open projects yet.</p>
                <p className="text-sm text-pr-text-secondary">
                  A project holds one tender or job: the customer&apos;s specification, its items,
                  prices and the quotation.
                </p>
              </>
            )}
          </div>
        )}
        <Pagination page={filters.page} totalPages={totalPages} />
      </section>
    </div>
  );
}
