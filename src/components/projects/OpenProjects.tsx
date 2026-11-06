import Link from "next/link";
import { countryName } from "@/lib/countries";
import { getFormatter } from "@/lib/format-server";
import { OPEN_STATUSES, todayIn } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";
import { Deadline } from "./Deadline";
import { ProjectStatusBadge } from "./ProjectStatusBadge";

/** The dashboard's open projects, the nearest deadline first. */
export async function OpenProjects({ orgId, limit = 6 }: { orgId: string; limit?: number }) {
  const supabase = await createClient();
  const [format, { data: projects, count }] = await Promise.all([
    getFormatter(),
    supabase
      .from("projects")
      .select("id, name, deadline, delivery_country, delivery_city, status, customers(name)", {
        count: "exact",
      })
      .eq("organization_id", orgId)
      .in("status", [...OPEN_STATUSES])
      .order("deadline", { ascending: true, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .limit(limit),
  ]);
  const today = todayIn(format.prefs.timeZone);

  if (!projects?.length) {
    return (
      <p className="text-sm text-pr-text-tertiary">
        No open projects.{" "}
        <Link href="/projects/new" className="text-pr-accent hover:underline">
          Create a project
        </Link>{" "}
        to start a quotation.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-pr-border-hairline">
        {projects.map((project) => (
          <li key={project.id} className="flex items-start justify-between gap-4 py-2.5">
            <span className="grid min-w-0">
              <Link
                href={`/projects/${project.id}`}
                className="truncate text-sm font-medium hover:text-pr-accent hover:underline"
              >
                {project.name}
              </Link>
              <span className="truncate text-xs text-pr-text-tertiary">
                {[
                  project.customers?.name,
                  project.delivery_city ?? countryName(project.delivery_country),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1 text-right text-sm">
              <ProjectStatusBadge status={project.status} />
              {project.deadline && (
                <Deadline
                  deadline={project.deadline}
                  formatted={format.calendarDate(project.deadline)}
                  today={today}
                  open
                />
              )}
            </span>
          </li>
        ))}
      </ul>
      {(count ?? 0) > projects.length && (
        <Link href="/projects" className="text-sm font-medium text-pr-accent hover:underline">
          All {count} open projects
        </Link>
      )}
    </div>
  );
}
