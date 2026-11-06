import { deadlineNote } from "@/lib/projects";
import { cn } from "@/lib/utils";

/**
 * A project's deadline: the date, and for open projects how close it is
 * ("Due in 3 days", "2 days overdue"). Dates come formatted by the caller.
 */
export function Deadline({
  deadline,
  formatted,
  today,
  open,
  inline = false,
}: {
  deadline: string | null;
  formatted: string | null;
  today: string;
  open: boolean;
  /** One line ("Dec 1, 2026 · Due in 3 days") instead of two. */
  inline?: boolean;
}) {
  if (!deadline || !formatted) return <span className="text-pr-text-tertiary">—</span>;
  const note = open ? deadlineNote(deadline, today) : null;
  return (
    <span className={cn(inline ? "inline-flex flex-wrap gap-x-1.5" : "grid")}>
      <time dateTime={deadline} className="tabular-nums">
        {formatted}
      </time>
      {note && (
        <span
          className={cn(
            "text-xs",
            inline && "text-sm",
            note.overdue
              ? "font-medium text-pr-destructive"
              : note.urgent
                ? "font-medium text-pr-warm"
                : "text-pr-text-tertiary",
          )}
        >
          {inline && "· "}
          {note.text}
        </span>
      )}
    </span>
  );
}
