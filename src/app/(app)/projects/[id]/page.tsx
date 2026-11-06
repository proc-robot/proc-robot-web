import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/app/SectionCard";
import { Deadline } from "@/components/projects/Deadline";
import { requireMember } from "@/lib/auth/session";
import { countryName, placeName } from "@/lib/countries";
import { getFormatter } from "@/lib/format-server";
import { isOpen, todayIn } from "@/lib/projects";
import { getMemberNames, getProject } from "../data";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const claims = await requireMember();
  const project = await getProject((await params).id, claims.org_id);
  return { title: project?.name ?? "Project" };
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-semibold tracking-[0.06em] text-pr-text-tertiary uppercase">
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

const NONE = <span className="text-pr-text-tertiary">—</span>;

/** The project's overview: its details and notes (W1). */
export default async function ProjectOverviewPage({ params }: Props) {
  const claims = await requireMember();
  const { id } = await params;
  const [project, format, memberNames] = await Promise.all([
    getProject(id, claims.org_id),
    getFormatter(),
    getMemberNames(claims.org_id),
  ]);
  if (!project) notFound();
  const today = todayIn(format.prefs.timeZone);
  const country = countryName(project.delivery_country);
  const createdBy = project.created_by ? memberNames.get(project.created_by) : null;

  return (
    <div className="space-y-6">
      <SectionCard id="details" title="Details">
        <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <Detail label="Customer">
            {project.customers ? (
              <Link
                href={`/customers/${project.customers.id}`}
                className="text-pr-accent hover:underline"
              >
                {project.customers.name}
              </Link>
            ) : (
              NONE
            )}
          </Detail>
          <Detail label="Reference">{project.reference_no ?? NONE}</Detail>
          <Detail label="Deadline">
            <Deadline
              deadline={project.deadline}
              formatted={project.deadline ? format.calendarDate(project.deadline) : null}
              today={today}
              open={isOpen(project.status)}
              inline
            />
          </Detail>
          <Detail label="Delivery">
            <span className="grid">
              <span>{placeName(project.delivery_city, project.delivery_country)}</span>
              <span className="text-xs text-pr-text-tertiary">
                Online prices are searched in {country}.
              </span>
            </span>
          </Detail>
          <Detail label="Created">
            {format.date(project.created_at)}
            {createdBy && <span className="text-pr-text-secondary"> by {createdBy}</span>}
          </Detail>
          <Detail label="Last updated">{format.dateTime(project.updated_at)}</Detail>
        </dl>
      </SectionCard>

      <SectionCard id="notes" title="Notes">
        {project.notes ? (
          <p className="text-sm whitespace-pre-line">{project.notes}</p>
        ) : (
          <p className="text-sm text-pr-text-tertiary">
            No notes.{" "}
            <Link href={`/projects/${id}/edit`} className="text-pr-accent hover:underline">
              Add notes
            </Link>{" "}
            for the team: scope, site details, contacts.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
