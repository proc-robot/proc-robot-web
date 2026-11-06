"use client";

import { useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { refreshAccess, signOut } from "@/lib/auth/actions";

/**
 * Shown instead of the workspace when the user's access changed elsewhere
 * (removed from the organization, organization deleted). Refreshing the
 * session picks up the change; the proxy then sends them where they belong.
 */
export function RefreshAccess() {
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => refreshAccess());
  }, []);

  return (
    <section className="w-full max-w-md space-y-4 text-center" aria-live="polite">
      <h1 className="font-newsreader text-[32px] leading-tight font-normal">
        Your access has changed
      </h1>
      <p className="text-[15px] text-pr-text-secondary">
        Your organization membership was updated. One moment while we refresh your session.
      </p>
      <div className="flex justify-center gap-2">
        <Button onClick={() => startTransition(() => refreshAccess())} disabled={isPending}>
          {isPending ? "Refreshing…" : "Continue"}
        </Button>
        <Button
          variant="outline"
          onClick={() => startTransition(() => signOut())}
          disabled={isPending}
        >
          Sign out
        </Button>
      </div>
    </section>
  );
}
