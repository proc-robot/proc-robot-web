import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type ProjectStatus } from "@/lib/projects";
import { cn } from "@/lib/utils";

const TONES: Record<ProjectStatus, string> = {
  active: "bg-pr-success-tint text-pr-accent",
  submitted: "bg-pr-warm-tint-strong text-pr-warm",
  won: "bg-pr-accent text-white border-pr-accent",
  lost: "bg-pr-destructive-tint text-pr-destructive",
  archived: "bg-pr-neutral-chip text-pr-text-secondary",
};

/** A project's status (W1) as a chip. */
export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full border-pr-border-card font-medium", TONES[status])}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
