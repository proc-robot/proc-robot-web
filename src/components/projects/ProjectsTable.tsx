import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isOpen, type ProjectStatus } from "@/lib/projects";
import { Deadline } from "./Deadline";
import { ProjectStatusBadge } from "./ProjectStatusBadge";

export type ProjectRow = {
  id: string;
  name: string;
  referenceNo: string | null;
  customerName: string | null;
  deadline: string | null;
  /** The deadline as the user reads dates, formatted on the server. */
  deadlineText: string | null;
  place: string;
  status: ProjectStatus;
  createdByName: string | null;
  updatedText: string;
};

/** The project list (W3): one row per project, linking to its page. */
export function ProjectsTable({
  rows,
  today,
  showCustomer = true,
}: {
  rows: ProjectRow[];
  today: string;
  /** Off on a customer's own page. */
  showCustomer?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          {showCustomer && <TableHead>Customer</TableHead>}
          <TableHead>Deadline</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden lg:table-cell">Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((project) => (
          <TableRow key={project.id} className="align-top">
            <TableCell className="max-w-[22rem] whitespace-normal">
              <Link
                href={`/projects/${project.id}`}
                className="font-medium text-pr-ink hover:text-pr-accent hover:underline"
              >
                {project.name}
              </Link>
              <p className="text-xs text-pr-text-tertiary">
                {[project.referenceNo, project.place].filter(Boolean).join(" · ")}
              </p>
            </TableCell>
            {showCustomer && (
              <TableCell className="max-w-[14rem] whitespace-normal">
                {project.customerName ?? <span className="text-pr-text-tertiary">—</span>}
              </TableCell>
            )}
            <TableCell>
              <Deadline
                deadline={project.deadline}
                formatted={project.deadlineText}
                today={today}
                open={isOpen(project.status)}
              />
            </TableCell>
            <TableCell>
              <ProjectStatusBadge status={project.status} />
            </TableCell>
            <TableCell className="hidden text-xs text-pr-text-tertiary lg:table-cell">
              <span className="grid">
                <span>{project.updatedText}</span>
                {project.createdByName && <span>Created by {project.createdByName}</span>}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
