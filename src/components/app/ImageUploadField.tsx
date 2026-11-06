"use client";

import { useRef, useTransition } from "react";
import { ImageUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/forms/action-result";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * A picture (profile avatar, organization logo) uploaded straight from the
 * browser to a public Storage bucket under `{folder}/…` (the bucket's
 * policies check the folder), then saved with `onSave(path)`, which also
 * deletes the previous file. `onSave(null)` removes the picture.
 */
export function ImageUploadField({
  label,
  bucket,
  folder,
  imageUrl,
  fallback,
  shape = "circle",
  disabled = false,
  onSave,
}: {
  label: string;
  bucket: "avatars" | "org-logos";
  folder: string;
  imageUrl: string | null;
  /** Shown when there is no picture, e.g. initials. */
  fallback: string;
  shape?: "circle" | "square";
  disabled?: boolean;
  onSave: (path: string | null) => Promise<ActionResult>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function upload(file: File) {
    const extension = TYPES[file.type];
    if (!extension) return toast.error("Choose a JPG, PNG or WebP image.");
    if (file.size > MAX_BYTES) return toast.error("Choose an image under 2 MB.");

    startTransition(async () => {
      const path = `${folder}/${Date.now()}.${extension}`;
      const { error } = await createClient()
        .storage.from(bucket)
        .upload(path, file, { contentType: file.type });
      if (error) {
        toast.error("The upload failed. Try again.");
        return;
      }
      const result = await onSave(path);
      if (result.ok) toast.success(`${label} updated.`);
      else toast.error(result.error);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await onSave(null);
      if (result.ok) toast.success(`${label} removed.`);
      else toast.error(result.error);
    });
  }

  const rounded = shape === "circle" ? "rounded-full" : "rounded-[10px]";
  return (
    <div className="flex items-center gap-4">
      <Avatar className={cn("size-16 border border-pr-border-card", rounded)}>
        {imageUrl && <AvatarImage src={imageUrl} alt={label} className="object-cover" />}
        <AvatarFallback className={cn("bg-pr-neutral-chip text-lg font-semibold", rounded)}>
          {fallback}
        </AvatarFallback>
      </Avatar>
      {!disabled && (
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept={Object.keys(TYPES).join(",")}
            className="sr-only"
            aria-label={`Upload ${label.toLowerCase()}`}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) upload(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => input.current?.click()}
          >
            <ImageUp aria-hidden />
            {isPending ? "Saving…" : imageUrl ? "Change" : "Upload"}
          </Button>
          {imageUrl && (
            <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={remove}>
              <Trash2 aria-hidden />
              Remove
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
