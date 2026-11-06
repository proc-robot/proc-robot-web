import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Archive } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionTabs } from "@/components/app/SectionTabs";
import { ProjectActions } from "@/components/projects/ProjectActions";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { getAccount, isOrgAdmin, requireMember } from "@/lib/auth/session";
import { isUuid } from "@/lib/projects";
import { getProject } from "../data";

/**
 * A project (W2): its name, status and actions, and a tab per stage of the
 * work — specification documents, items, prices, costing, RFQs and
 * quotations. Every member of the organization can open it (W4).
 */
export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const claims = await requireMember();
  const account = await getAccount();
  if (!account) redirect(SIGN_IN_PATH);
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const project = await getProject(id, claims.org_id);
  if (!project) notFound();

  const base = `/projects/${id}`;
  const tabs = [
    { label: "Overview", href: base },
    { label: "Documents", href: `${base}/documents`, prefix: true },
    { label: "Items", href: `${base}/items`, prefix: true },
    { label: "Prices", href: `${base}/prices`, prefix: true },
    { label: "Costing", href: `${base}/costing`, prefix: true },
    { label: "RFQs & Quotations", href: `${base}/quotations`, prefix: true },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-pr-text-secondary hover:text-pr-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Projects
      </Link>
      <PageHeader
        title={project.name}
        description={
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <ProjectStatusBadge status={project.status} />
            {project.customers && (
              <Link
                href={`/customers/${project.customers.id}`}
                className="hover:text-pr-ink hover:underline"
              >
                {project.customers.name}
              </Link>
            )}
            {project.reference_no && <span>· Ref. {project.reference_no}</span>}
          </p>
        }
        actions={
          <ProjectActions
            id={project.id}
            name={project.name}
            status={project.status}
            canDelete={isOrgAdmin(account)}
          />
        }
      />
      {project.status === "archived" && (
        <p className="flex items-center gap-2 rounded-[10px] bg-pr-neutral-chip px-3 py-2 text-sm text-pr-text-secondary">
          <Archive className="size-4 shrink-0" aria-hidden />
          This project is archived. Set its status back to Active to work on it again.
        </p>
      )}
      <SectionTabs label="Project sections" tabs={tabs} />
      <div>{children}</div>
    </div>
  );
}
