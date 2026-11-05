import { cn } from "@/lib/utils";
import type { NavItem } from "./types";

/**
 * Placeholder for a sidebar section that exists in the plan but is not built
 * yet: the section's name, what it will do, and which TASKS.md ids build it.
 * Replace the page's body with the real feature; keep the nav entry.
 */
export function ComingSoon({ item, brand = false }: { item: NavItem; brand?: boolean }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1
          className={cn(
            brand
              ? "font-newsreader text-[32px] leading-tight font-normal"
              : "text-xl font-semibold",
          )}
        >
          {item.label}
        </h1>
        <p className="text-[15px] text-muted-foreground">{item.description}</p>
      </div>

      <div className="rounded-[14px] border border-dashed bg-card p-6">
        <p className="text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          Not built yet
        </p>
        {item.tasks.length > 0 && (
          <p className="mt-2 text-sm">
            Built by{" "}
            {item.tasks.map((task, index) => (
              <span key={task}>
                {index > 0 && ", "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{task}</code>
              </span>
            ))}{" "}
            in <code className="font-mono text-xs">TASKS.md</code>.
          </p>
        )}
      </div>
    </div>
  );
}
