"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CircleAlert,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  MoreHorizontal,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  deleteDocument,
  extractDocument,
  retryDocument,
} from "@/app/(app)/projects/[id]/documents/actions";
import { isFinished, useJob } from "@/hooks/use-job";
import { DOCUMENT_STATUS_LABELS, type DocumentStatus } from "@/lib/documents";
import { cn } from "@/lib/utils";

export type DocumentEntry = {
  id: string;
  fileName: string;
  isPdf: boolean;
  /** "12 pages (scanned) · 1.2 MB", built on the server. */
  details: string;
  uploaded: string;
  status: DocumentStatus;
  estimatedCredits: number | null;
  error: string | null;
  jobId: string | null;
  itemCount: number | null;
};

const creditsText = (count: number | null) => `${count ?? 0} ${count === 1 ? "credit" : "credits"}`;

const TONES: Record<DocumentStatus, string> = {
  uploaded: "bg-pr-neutral-chip text-pr-text-secondary",
  ready: "bg-pr-warm-tint-strong text-pr-warm",
  extracting: "bg-pr-neutral-chip text-pr-ink",
  extracted: "bg-pr-success-tint text-pr-accent",
  failed: "bg-pr-destructive-tint text-pr-destructive",
};

/** Follows a running inspection or extraction, and reloads the page when it ends. */
function useRunningJob(document: DocumentEntry) {
  const router = useRouter();
  const running = document.status === "uploaded" || document.status === "extracting";
  const job = useJob(running ? document.jobId : null);
  const refreshed = useRef<string | null>(null);
  useEffect(() => {
    if (job && isFinished(job) && refreshed.current !== job.id) {
      refreshed.current = job.id;
      router.refresh();
    }
  }, [job, router]);
  return running ? job : null;
}

function DocumentRow({
  document,
  projectId,
  credits,
}: {
  document: DocumentEntry;
  projectId: string;
  credits: number;
}) {
  const router = useRouter();
  const job = useRunningJob(document);
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<"extract" | "delete" | null>(null);
  const busy = document.status === "uploaded" || document.status === "extracting";
  const Icon = document.isPdf ? FileText : FileSpreadsheet;

  function retry() {
    startTransition(async () => {
      const result = await retryDocument(document.id, projectId);
      if (result.ok) router.refresh();
      else toast.error(result.error);
    });
  }

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-pr-text-tertiary" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="truncate font-medium">{document.fileName}</p>
          <p className="text-xs text-pr-text-tertiary">
            {document.details} · {document.uploaded}
          </p>
          {busy && (
            <div className="space-y-1 pt-1" aria-live="polite">
              <Progress
                value={job?.progress ?? 0}
                className="h-1.5 w-64 max-w-full"
                aria-label={`Progress for ${document.fileName}`}
              />
              <p className="flex items-center gap-1.5 text-xs text-pr-text-secondary">
                <LoaderCircle className="size-3 animate-spin" aria-hidden />
                {job?.progress_message ??
                  (document.status === "uploaded" ? "Counting pages…" : "Waiting for the reader…")}
              </p>
            </div>
          )}
          {document.status === "failed" && document.error && (
            <p className="flex items-start gap-1.5 text-sm text-pr-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {document.error}
            </p>
          )}
          {document.status === "extracted" && (
            <p className="text-sm text-pr-text-secondary">
              {document.itemCount ?? 0} items extracted.{" "}
              <Link
                href={`/projects/${projectId}/items`}
                className="font-medium text-pr-accent hover:underline"
              >
                See the items
              </Link>
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 pl-8 sm:pl-0">
        <Badge
          variant="outline"
          className={cn("rounded-full border-pr-border-card font-medium", TONES[document.status])}
        >
          {DOCUMENT_STATUS_LABELS[document.status]}
        </Badge>
        {document.status === "ready" && document.estimatedCredits !== null && (
          <Button size="sm" disabled={isPending} onClick={() => setConfirm("extract")}>
            <Sparkles aria-hidden />
            Read items · {creditsText(document.estimatedCredits)}
          </Button>
        )}
        {document.status === "failed" && (
          <Button size="sm" variant="outline" disabled={isPending} onClick={retry}>
            <RotateCcw aria-hidden />
            Try again
          </Button>
        )}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={busy || isPending}
              aria-label={`Actions for ${document.fileName}`}
            >
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("delete")}>
              <Trash2 aria-hidden />
              Delete document
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmAction
        open={confirm === "extract"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Read the items in ${document.fileName}?`}
        description={
          <>
            <p>
              This uses <strong>{creditsText(document.estimatedCredits)}</strong> of your{" "}
              {creditsText(credits)}. If reading fails, the credits are returned.
            </p>
            <p>You review and confirm the items before any prices are searched.</p>
          </>
        }
        confirmLabel={`Use ${creditsText(document.estimatedCredits)}`}
        onConfirm={async () => {
          const result = await extractDocument(document.id, projectId);
          if (result.ok) router.refresh();
          return result;
        }}
      />
      <ConfirmAction
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Delete ${document.fileName}?`}
        description={
          <p>
            The file and its unconfirmed items are removed. Items already confirmed stay in the
            project.
          </p>
        }
        confirmLabel="Delete document"
        destructive
        successMessage="Document deleted."
        onConfirm={async () => {
          const result = await deleteDocument(document.id, projectId);
          if (result.ok) router.refresh();
          return result;
        }}
      />
    </li>
  );
}

/** The project's specification documents and where each one stands (D9). */
export function DocumentList({
  documents,
  projectId,
  credits,
}: {
  documents: DocumentEntry[];
  projectId: string;
  credits: number;
}) {
  if (documents.length === 0) {
    return <p className="text-sm text-pr-text-tertiary">No documents yet.</p>;
  }
  return (
    <ul className="divide-y divide-pr-border-hairline">
      {documents.map((document) => (
        <DocumentRow
          key={document.id}
          document={document}
          projectId={projectId}
          credits={credits}
        />
      ))}
    </ul>
  );
}
