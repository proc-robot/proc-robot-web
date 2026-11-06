"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Button } from "@/components/ui/button";
import { deleteMyAccount } from "@/app/(app)/account/actions";
import {
  continueToWorkspace,
  leaveDeletedOrganization,
  restoreOrganization,
} from "@/app/(auth)/onboarding/actions";
import { signOut } from "@/lib/auth/actions";
import type { ActionResult } from "@/lib/forms/action-result";

export type OnboardingNoticeState =
  | { kind: "stale" }
  | { kind: "suspended" }
  | {
      kind: "deleted";
      organizationName: string;
      /** Already formatted for the user, e.g. "Dec 6, 2026". */
      purgeDate: string;
      isOwner: boolean;
      email: string;
    };

/**
 * Shown on /onboarding to a user who already has an organization:
 * - `stale`: their token predates joining (another tab, an admin change);
 *   continuing refreshes it.
 * - `suspended`: the organization is suspended, so the token carries no org.
 * - `deleted`: the Owner deleted it (O7). The Owner can restore it for 30
 *   days or delete their own account; members can leave and start over.
 */
export function OnboardingNotice({ state }: { state: OnboardingNoticeState }) {
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const run = (action: () => Promise<ActionResult | void>) =>
    startTransition(async () => {
      const result = await action();
      if (result && !result.ok) toast.error(result.error);
    });

  const signOutButton = (
    <Button variant="outline" onClick={() => run(signOut)} disabled={isPending}>
      Sign out
    </Button>
  );

  if (state.kind === "suspended") {
    return (
      <section className="w-full max-w-md space-y-4">
        <h1 className="font-newsreader text-[32px] leading-tight font-normal">
          Your organization is suspended
        </h1>
        <p className="text-[15px] text-pr-text-secondary">
          Its workspace is unavailable for now. Contact Proc-Robot support to restore access.
        </p>
        {signOutButton}
      </section>
    );
  }

  if (state.kind === "deleted") {
    return (
      <section className="w-full max-w-md space-y-4">
        <h1 className="font-newsreader text-[32px] leading-tight font-normal">
          {state.organizationName} was deleted
        </h1>
        {state.isOwner ? (
          <p className="text-[15px] text-pr-text-secondary">
            You can restore it, with everything in it, until {state.purgeDate}. After that it is
            removed for good.
          </p>
        ) : (
          <p className="text-[15px] text-pr-text-secondary">
            Its Owner deleted it, so its workspace is closed. It is removed for good on{" "}
            {state.purgeDate}. You can leave it and join or create another organization.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {state.isOwner ? (
            <Button onClick={() => run(restoreOrganization)} disabled={isPending}>
              Restore organization
            </Button>
          ) : (
            <Button onClick={() => run(leaveDeletedOrganization)} disabled={isPending}>
              Leave and start over
            </Button>
          )}
          {signOutButton}
        </div>
        {state.isOwner && (
          <>
            <Button
              variant="link"
              className="h-auto px-0 text-pr-destructive"
              onClick={() => setConfirmingDelete(true)}
              disabled={isPending}
            >
              Delete my account instead
            </Button>
            <ConfirmAction
              open={confirmingDelete}
              onOpenChange={setConfirmingDelete}
              title="Delete your account?"
              description={
                <p>This can’t be undone, and the organization can no longer be restored by you.</p>
              }
              confirmText={state.email}
              confirmTextLabel="Your email address"
              confirmLabel="Delete my account"
              destructive
              onConfirm={(typed) => deleteMyAccount(typed)}
            />
          </>
        )}
      </section>
    );
  }

  return (
    <section className="w-full max-w-md space-y-4">
      <h1 className="font-newsreader text-[32px] leading-tight font-normal">You’re all set</h1>
      <p className="text-[15px] text-pr-text-secondary">
        You already belong to an organization. Continue to your workspace.
      </p>
      <Button onClick={() => run(continueToWorkspace)} disabled={isPending}>
        Continue
      </Button>
    </section>
  );
}
