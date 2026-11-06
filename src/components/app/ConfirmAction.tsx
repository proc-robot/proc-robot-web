"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/forms/action-result";

/**
 * A confirmation dialog for one consequential action (remove a member,
 * transfer ownership, delete). With `confirmText`, the user must type it
 * first, e.g. the organization's name. The action may redirect; if it
 * returns a failure, the message is shown and the dialog stays open.
 */
export function ConfirmAction({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmText,
  confirmTextLabel,
  destructive = false,
  onConfirm,
  successMessage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  confirmText?: string;
  confirmTextLabel?: string;
  destructive?: boolean;
  onConfirm: (typed: string) => Promise<ActionResult<unknown> | void>;
  successMessage?: string;
}) {
  const [typed, setTyped] = useState("");
  const [isPending, startTransition] = useTransition();
  const matches = !confirmText || typed.trim().toLowerCase() === confirmText.trim().toLowerCase();

  function confirm() {
    startTransition(async () => {
      const result = await onConfirm(typed);
      if (result && !result.ok) {
        toast.error(result.error);
        return;
      }
      if (successMessage) toast.success(successMessage);
      setTyped("");
      onOpenChange(false);
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setTyped("");
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {confirmText && (
          <Field>
            <FieldLabel htmlFor="confirm-text">{confirmTextLabel ?? "Type to confirm"}</FieldLabel>
            <Input
              id="confirm-text"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
            />
            <FieldDescription>
              Type <strong>{confirmText}</strong> to confirm.
            </FieldDescription>
          </Field>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          {/* A plain Button, not AlertDialogAction: that one closes the dialog before the action ends. */}
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={confirm}
            disabled={!matches || isPending}
          >
            {isPending ? "Working…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
