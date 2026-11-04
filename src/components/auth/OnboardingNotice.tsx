"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { continueToWorkspace } from "@/app/(auth)/onboarding/actions";
import { signOut } from "@/lib/auth/actions";

/**
 * Shown on /onboarding to a user who already has an organization:
 * - `stale`: their token predates joining (another tab, an admin change);
 *   continuing refreshes it.
 * - `suspended`: the organization is suspended, so the token carries no org.
 */
export function OnboardingNotice({ state }: { state: "stale" | "suspended" }) {
  const [isPending, startTransition] = useTransition();

  if (state === "suspended") {
    return (
      <section className="w-full max-w-md space-y-4">
        <h1 className="font-newsreader text-[32px] leading-tight font-normal">
          Your organization is suspended
        </h1>
        <p className="text-[15px] text-pr-text-secondary">
          Its workspace is unavailable for now. Contact Proc-Robot support to restore access.
        </p>
        <Button
          variant="outline"
          onClick={() => startTransition(() => signOut())}
          disabled={isPending}
        >
          Sign out
        </Button>
      </section>
    );
  }

  return (
    <section className="w-full max-w-md space-y-4">
      <h1 className="font-newsreader text-[32px] leading-tight font-normal">You’re all set</h1>
      <p className="text-[15px] text-pr-text-secondary">
        You already belong to an organization. Continue to your workspace.
      </p>
      <Button onClick={() => startTransition(() => continueToWorkspace())} disabled={isPending}>
        Continue
      </Button>
    </section>
  );
}
