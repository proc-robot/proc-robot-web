"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { registerDocument } from "@/app/(app)/projects/[id]/documents/actions";
import { ACCEPT_DOCUMENTS, DOCUMENT_TYPES, documentType, uploadProblem } from "@/lib/documents";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Uploads specification files (D1): several at once, by picking or dropping
 * them. Each goes straight from the browser to `spec-files/{org}/{project}/`
 * (the bucket's policies check the folder), then is registered, which starts
 * counting its pages or rows.
 */
export function DocumentUpload({
  organizationId,
  projectId,
  disabled = false,
}: {
  organizationId: string;
  projectId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, startUpload] = useTransition();
  const busy = disabled || isUploading;

  function upload(files: File[]) {
    if (files.length === 0) return;
    startUpload(async () => {
      const supabase = createClient();
      let added = 0;
      for (const file of files) {
        const problem = uploadProblem(file);
        const type = documentType(file.name);
        if (problem || !type) {
          toast.error(problem);
          continue;
        }
        const path = `${organizationId}/${projectId}/${crypto.randomUUID()}.${type}`;
        const { error } = await supabase.storage
          .from("spec-files")
          .upload(path, file, { contentType: DOCUMENT_TYPES[type] });
        if (error) {
          toast.error(`${file.name} couldn't be uploaded. Try again.`);
          continue;
        }
        const result = await registerDocument(projectId, path, file.name);
        if (!result.ok) {
          toast.error(`${file.name}: ${result.error}`);
          await supabase.storage.from("spec-files").remove([path]);
          continue;
        }
        added++;
      }
      if (input.current) input.current.value = "";
      if (added > 0) {
        toast.success(
          added === 1 ? "File uploaded. Counting its pages…" : `${added} files uploaded.`,
        );
        router.refresh();
      }
    });
  }

  return (
    <div
      onDragOver={(event) => {
        if (busy) return;
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        if (!busy) upload([...event.dataTransfer.files]);
      }}
      className={cn(
        "flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-pr-border-dashed bg-white px-6 py-8 text-center transition-colors",
        isDragging && "border-pr-accent bg-pr-success-tint",
        disabled && "opacity-60",
      )}
    >
      <FileUp className="size-8 text-pr-text-tertiary" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium">
          {isUploading ? "Uploading…" : "Drop the customer's specification files here"}
        </p>
        <p className="text-sm text-pr-text-secondary">
          Excel (.xlsx, .xls), CSV or PDF, up to 30 MB each. You see the credit estimate before
          anything is read.
        </p>
      </div>
      <input
        ref={input}
        id="document-files"
        type="file"
        multiple
        accept={ACCEPT_DOCUMENTS}
        className="sr-only"
        aria-label="Upload specification files"
        disabled={busy}
        onChange={(event) => upload([...(event.target.files ?? [])])}
      />
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        Choose files
      </Button>
    </div>
  );
}
