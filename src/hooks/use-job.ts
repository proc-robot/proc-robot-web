"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export type Job = Pick<
  Database["public"]["Tables"]["ai_jobs"]["Row"],
  | "id"
  | "status"
  | "progress"
  | "progress_message"
  | "error"
  | "result"
  | "created_at"
  | "updated_at"
  | "finished_at"
>;

const COLUMNS =
  "id, status, progress, progress_message, error, result, created_at, updated_at, finished_at";

export const isFinished = (job: Pick<Job, "status"> | null | undefined) =>
  job?.status === "succeeded" || job?.status === "failed" || job?.status === "cancelled";

/** Of two versions of the row, the later one (events can arrive late or out of order). */
function newest(current: Job | undefined, next: Job): Job {
  if (!current) return next;
  return Date.parse(next.updated_at) >= Date.parse(current.updated_at) ? next : current;
}

/**
 * Follows a background job (public.ai_jobs) until it finishes: Realtime
 * pushes each change at once, and a poll every `pollMs` covers what Realtime
 * can miss (a job that finishes while the subscription is still starting, a
 * dropped connection). The poll stops when the job is done.
 *
 * Use it for every job-progress UI: extraction, price discovery, rendering.
 */
export function useJob(jobId: string | null, pollMs = 2000) {
  const queryClient = useQueryClient();
  const queryKey = ["ai-job", jobId] as const;

  const query = useQuery({
    queryKey,
    enabled: Boolean(jobId),
    queryFn: async (): Promise<Job> => {
      const { data, error } = await createClient()
        .from("ai_jobs")
        .select(COLUMNS)
        .eq("id", jobId!)
        .single();
      if (error) throw error;
      return newest(queryClient.getQueryData<Job>(queryKey), data);
    },
    refetchInterval: (current) => (isFinished(current.state.data) ? false : pollMs),
  });

  useEffect(() => {
    if (!jobId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`ai-job-${jobId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ai_jobs", filter: `id=eq.${jobId}` },
        (change) =>
          queryClient.setQueryData<Job>(["ai-job", jobId], (current) =>
            newest(current, change.new as Job),
          ),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [jobId, queryClient]);

  return query.data ?? null;
}
