import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { DeleteCustomerSection } from "@/components/customers/DeleteCustomerSection";
import { ProjectsTable, type ProjectRow } from "@/components/projects/ProjectsTable";
import { Button } from "@/components/ui/button";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { getAccount, isOrgAdmin, requireMember } from "@/lib/auth/session";
import { placeName } from "@/lib/countries";
import { getFormatter } from "@/lib/format-server";
import { isUuid, projectListSearch, DEFAULT_PROJECT_FILTERS, todayIn } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

const getCustomer = cache(async (id: string, orgId: string) => {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, name, contact_name, email, phone, address, tax_id, notes, created_at")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();
  return data;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const claims = await requireMember();
  const customer = await getCustomer((await params).id, claims.org_id);
  return { title: customer?.name ?? "Customer" };
}

const RECENT = 10;

/** A customer (Q1): their details, their projects, and deleting them. */
export default async function CustomerPage({ params }: Props) {
  const claims = await requireMember();
  const account = await getAccount();
  if (!account) redirect(SIGN_IN_PATH);
  const { id } = await params;
  const customer = await getCustomer(id, claims.org_id);
  if (!customer) notFound();

  const supabase = await createClient();
  const [format, { data: projects, count }] = await Promise.all([
    getFormatter(),
    supabase
      .from("projects")
      .select(
        "id, name, reference_no, deadline, delivery_country, delivery_city, status, updated_at",
        {
          count: "exact",
        },
      )
      .eq("organization_id", claims.org_id)
      .eq("customer_id", customer.id)
      .order("updated_at", { ascending: false })
      .limit(RECENT),
  ]);
  const today = todayIn(format.prefs.timeZone);
  const rows: ProjectRow[] = (projects ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    referenceNo: project.reference_no,
    customerName: customer.name,
    deadline: project.deadline,
    deadlineText: project.deadline ? format.calendarDate(project.deadline) : null,
    place: placeName(project.delivery_city, project.delivery_country),
    status: project.status,
    createdByName: null,
    updatedText: format.date(project.updated_at),
  }));
  const total = count ?? 0;
  const allProjects = `/projects${projectListSearch({ ...DEFAULT_PROJECT_FILTERS, status: "all", customer: customer.id })}`;

  return (
    <div className="max-w-5xl space-y-6">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-sm text-pr-text-secondary hover:text-pr-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Customers
      </Link>
      <PageHeader
        title={customer.name}
        description={`Customer since ${format.date(customer.created_at)}.`}
        actions={
          <Button asChild>
            <Link href={`/projects/new?customer=${customer.id}`}>
              <Plus aria-hidden />
              New project
            </Link>
          </Button>
        }
      />

      <SectionCard
        id="customer-projects"
        title={`Projects (${total})`}
        description={
          total > RECENT ? (
            <p>
              The {RECENT} most recently updated.{" "}
              <Link href={allProjects} className="text-pr-accent hover:underline">
                See all {total}
              </Link>
              .
            </p>
          ) : undefined
        }
      >
        {rows.length > 0 ? (
          <ProjectsTable rows={rows} today={today} showCustomer={false} />
        ) : (
          <p className="text-sm text-pr-text-tertiary">No projects for this customer yet.</p>
        )}
      </SectionCard>

      <SectionCard id="customer-details" title="Details">
        <CustomerForm
          mode="edit"
          customerId={customer.id}
          defaultValues={{
            name: customer.name,
            contactName: customer.contact_name ?? "",
            email: customer.email ?? "",
            phone: customer.phone ?? "",
            address: customer.address ?? "",
            taxId: customer.tax_id ?? "",
            notes: customer.notes ?? "",
          }}
        />
      </SectionCard>

      {isOrgAdmin(account) && (
        <SectionCard id="delete-customer" title="Delete customer" tone="danger">
          <DeleteCustomerSection id={customer.id} name={customer.name} projects={total} />
        </SectionCard>
      )}
    </div>
  );
}
