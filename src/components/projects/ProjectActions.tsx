"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteProject, duplicateProject, setProjectStatus } from "@/app/(app)/projects/actions";
import {
  isProjectStatus,
  PROJECT_STATUSES,
  STATUS_LABELS,
  type ProjectStatus,
} from "@/lib/projects";

const STATUS_DONE: Record<ProjectStatus, string> = {
  active: "The project is active again.",
  submitted: "Marked as submitted.",
  won: "Marked as won.",
  lost: "Marked as lost.",
  archived: "Project archived.",
};

/**
 * A project's actions (W1, W3): change its status (archive included), edit,
 * duplicate, and delete for the Owner and Admins.
 */
export function ProjectActions({
  id,
  name,
  status,
  canDelete,
}: {
  id: string;
  name: string;
  status: ProjectStatus;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function changeStatus(next: string) {
    if (!isProjectStatus(next) || next === status) return;
    startTransition(async () => {
      const result = await setProjectStatus(id, next);
      if (result.ok) {
        toast.success(STATUS_DONE[next]);
        router.refresh();
      } else toast.error(result.error);
    });
  }

  function duplicate() {
    startTransition(async () => {
      const result = await duplicateProject(id);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Copy created. Give it a name, reference and deadline.");
      router.push(`/projects/${result.data.id}/edit`);
    });
  }

  return (
    <>
      {/* Not modal: a modal menu would hand focus back after the dialog opened. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isPending}>
            Status: {STATUS_LABELS[status]}
            <ChevronDown aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Project status</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={status} onValueChange={changeStatus}>
            {PROJECT_STATUSES.map((option) => (
              <DropdownMenuRadioItem key={option} value={option}>
                {STATUS_LABELS[option]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button asChild variant="outline">
        <Link href={`/projects/${id}/edit`}>
          <Pencil aria-hidden />
          Edit
        </Link>
      </Button>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending} aria-label="More actions">
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={duplicate}>
            <Copy aria-hidden />
            Duplicate project
          </DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                <Trash2 aria-hidden />
                Delete project
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmAction
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${name}?`}
        description={
          <p>
            The project and everything in it are deleted for the whole team, and this can&apos;t be
            undone. To keep it out of the way instead, archive it.
          </p>
        }
        confirmLabel="Delete project"
        destructive
        onConfirm={() => deleteProject(id)}
      />
    </>
  );
}
