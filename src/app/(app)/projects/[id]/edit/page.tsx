import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/app/SectionCard";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { requireMember } from "@/lib/auth/session";
import { countryOptions } from "@/lib/countries";
import { getCustomerOptions, getProject } from "../../data";

export const metadata: Metadata = { title: "Edit project" };

/** Edits a project's details (W1). Any member may (W4). */
export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const claims = await requireMember();
  const { id } = await params;
  const [project, customers] = await Promise.all([
    getProject(id, claims.org_id),
    getCustomerOptions(claims.org_id),
  ]);
  if (!project) notFound();

  return (
    <SectionCard id="edit-project" title="Edit project">
      <ProjectForm
        mode="edit"
        projectId={project.id}
        defaultValues={{
          name: project.name,
          customerId: project.customer_id ?? "",
          referenceNo: project.reference_no ?? "",
          deadline: project.deadline ?? "",
          deliveryCountry: project.delivery_country,
          deliveryCity: project.delivery_city ?? "",
          notes: project.notes ?? "",
        }}
        customers={customers}
        countries={countryOptions()}
        cancelHref={`/projects/${project.id}`}
      />
    </SectionCard>
  );
}
