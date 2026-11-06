import type { Metadata } from "next";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { requireMember } from "@/lib/auth/session";
import { countryOptions } from "@/lib/countries";
import { isUuid } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";
import { getCustomerOptions, getProjectAllowance } from "../data";

export const metadata: Metadata = { title: "New project" };

/** Creates a project (W1). `?customer=` preselects the customer (from a customer's page). */
export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const claims = await requireMember();
  const { customer } = await searchParams;
  const supabase = await createClient();
  const [customers, allowance, { data: org }] = await Promise.all([
    getCustomerOptions(claims.org_id),
    getProjectAllowance(claims.org_id),
    supabase.from("organizations").select("country").eq("id", claims.org_id).single(),
  ]);
  const customerId =
    isUuid(customer) && customers.some((option) => option.value === customer) ? customer : "";

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="New project"
        description="One tender or job. You upload its specification documents next."
      />
      {allowance.full && (
        <p className="rounded-[10px] bg-pr-warm-tint px-3 py-2 text-sm">
          All {allowance.limit} open projects of the {allowance.planName ?? "current"} plan are in
          use. Mark one as won or lost, or archive it, to start another, or upgrade the plan.
        </p>
      )}
      <SectionCard id="project" title="Project details">
        <ProjectForm
          mode="create"
          defaultValues={{
            name: "",
            customerId,
            referenceNo: "",
            deadline: "",
            deliveryCountry: org?.country ?? "",
            deliveryCity: "",
            notes: "",
          }}
          customers={customers}
          countries={countryOptions()}
          disabled={allowance.full}
          cancelHref="/projects"
        />
      </SectionCard>
    </div>
  );
}
