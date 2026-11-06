import { cn } from "@/lib/utils";

/**
 * One titled block of a workspace page (profile, sessions, members, …): a
 * flat card with an `<h2>`. `tone="danger"` marks irreversible actions.
 */
export function SectionCard({
  id,
  title,
  description,
  tone = "default",
  children,
}: {
  /** Used for the heading's id, so the section is labelled by it. */
  id: string;
  title: string;
  description?: React.ReactNode;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className={cn(
        "rounded-[14px] border bg-white",
        tone === "danger" ? "border-pr-destructive/40" : "border-pr-border-card",
      )}
    >
      <div className="space-y-1 border-b border-pr-border-hairline px-6 py-4">
        <h2
          id={`${id}-heading`}
          className={cn("text-base font-semibold", tone === "danger" && "text-pr-destructive")}
        >
          {title}
        </h2>
        {description && <div className="text-sm text-pr-text-secondary">{description}</div>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}
