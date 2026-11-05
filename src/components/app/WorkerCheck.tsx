"use client";

import { useEffect, useState, useTransition } from "react";
import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { runWorkerCheck } from "@/app/(app)/dashboard/actions";
import { Button } from "@/components/ui/button";
import { isFinished, useJob } from "@/hooks/use-job";

/**
 * The worker check (TASKS.md T0.6.8): proves the background-job path end to
 * end — RPC → queue → Railway worker → ai_jobs → Realtime → this card.
 * Every long-running feature (extraction, price discovery, rendering)
 * reports progress the same way, through useJob(). Temporary: it moves to
 * the Super Admin's jobs monitor when the real dashboard ships (T1.1.7).
 */
export function WorkerCheck() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [isSlow, setIsSlow] = useState(false);
  const [isStarting, startCheck] = useTransition();
  const job = useJob(jobId);
  const done = isFinished(job);

  useEffect(() => {
    if (!jobId) return;
    const slow = setTimeout(() => setIsSlow(true), 10_000);
    return () => clearTimeout(slow);
  }, [jobId]);

  function start() {
    startCheck(async () => {
      const result = await runWorkerCheck();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setIsSlow(false);
      setJobId(result.data.jobId);
    });
  }

  const seconds =
    job?.finished_at && job.created_at
      ? (Date.parse(job.finished_at) - Date.parse(job.created_at)) / 1000
      : null;

  return (
    <section
      aria-labelledby="worker-check-heading"
      className="max-w-2xl space-y-4 rounded-[14px] border border-pr-border-card bg-white p-6"
    >
      <div className="space-y-1">
        <h2 id="worker-check-heading" className="text-sm font-semibold">
          System check: background jobs
        </h2>
        <p className="text-sm text-pr-text-secondary">
          Sends a test job through the queue to the worker and shows its progress live — the same
          path document extraction and price discovery will use.
        </p>
      </div>

      <div aria-live="polite" className="min-h-6 text-sm">
        {jobId && !job && <Status icon="spinner">Sending the check…</Status>}
        {job?.status === "queued" && (
          <Status icon="spinner">
            Waiting for the worker…
            {isSlow && " No worker has picked it up yet — make sure one is running."}
          </Status>
        )}
        {job?.status === "running" && (
          <Status icon="spinner">
            {job.progress_message ?? "Running…"} ({job.progress}%)
          </Status>
        )}
        {job?.status === "succeeded" && (
          <Status icon="ok">
            Background jobs work.
            {seconds !== null && ` Round trip ${seconds.toFixed(1)} s.`}
          </Status>
        )}
        {(job?.status === "failed" || job?.status === "cancelled") && (
          <Status icon="error">{job.error ?? "The check failed."}</Status>
        )}
      </div>

      <Button variant="outline" onClick={start} disabled={isStarting || (Boolean(jobId) && !done)}>
        {done ? "Run again" : "Run check"}
      </Button>
    </section>
  );
}

function Status({
  icon,
  children,
}: {
  icon: "spinner" | "ok" | "error";
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-center gap-2">
      {icon === "spinner" && (
        <LoaderCircle className="size-4 animate-spin text-pr-accent-soft" aria-hidden />
      )}
      {icon === "ok" && <CircleCheck className="size-4 text-pr-accent" aria-hidden />}
      {icon === "error" && <CircleX className="size-4 text-pr-destructive" aria-hidden />}
      <span>{children}</span>
    </p>
  );
}
