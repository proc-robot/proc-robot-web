import { describeActivity } from "@/lib/activity";
import { getFormatter } from "@/lib/format-server";
import { createClient } from "@/lib/supabase/server";

/**
 * Recent organization activity (O6), newest first. Today it covers the
 * organization, its members and its projects; uploads, quotations, prices and
 * quote requests join as those features ship (they add their actions to
 * `org_activity()`).
 */
export async function ActivityFeed({ limit = 15 }: { limit?: number }) {
  const supabase = await createClient();
  const [{ data: entries }, format] = await Promise.all([
    supabase.rpc("org_activity", { p_limit: limit }),
    getFormatter(),
  ]);

  if (!entries?.length) {
    return <p className="text-sm text-pr-text-tertiary">Nothing yet.</p>;
  }

  return (
    <ol className="divide-y divide-pr-border-hairline">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:justify-between sm:gap-4"
        >
          <span className="text-sm">
            {describeActivity({
              action: entry.action,
              actorName: entry.actor_name,
              metadata: (entry.metadata ?? {}) as Record<string, unknown>,
            })}
          </span>
          <time dateTime={entry.occurred_at} className="shrink-0 text-xs text-pr-text-tertiary">
            {format.dateTime(entry.occurred_at)}
          </time>
        </li>
      ))}
    </ol>
  );
}
