"use client";

import { useTransition } from "react";
import { Copy, RotateCw, X } from "lucide-react";
import { toast } from "sonner";
import { useFormatter } from "@/components/providers/FormatProvider";
import { Button } from "@/components/ui/button";
import { inviteMember, revokeInvite } from "@/app/(app)/settings/actions";
import { RoleBadge } from "./RoleBadge";

export type Invite = {
  id: string;
  email: string;
  role: "admin" | "member";
  expiresAt: string;
  invitedBy: string | null;
};

/**
 * Open invites (O3): each holds a seat until accepted, revoked or expired
 * (7 days). Resending renews the 7 days; revoking frees the seat.
 */
export function PendingInvites({ invites, now }: { invites: Invite[]; now: string }) {
  const format = useFormatter();
  const [isPending, startTransition] = useTransition();

  if (invites.length === 0) {
    return <p className="text-sm text-pr-text-tertiary">No pending invites.</p>;
  }

  function resend(invite: Invite) {
    startTransition(async () => {
      const result = await inviteMember({ email: invite.email, role: invite.role });
      if (result.ok) toast.success(`Invite for ${invite.email} renewed for 7 days.`);
      else toast.error(result.error);
    });
  }

  function revoke(invite: Invite) {
    startTransition(async () => {
      const result = await revokeInvite(invite.id);
      if (result.ok) toast.success(`Invite for ${invite.email} revoked.`);
      else toast.error(result.error);
    });
  }

  async function copySignInLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/sign-in`);
    toast.success("Sign-in link copied. Send it with a note to use the invited email address.");
  }

  return (
    <ul className="divide-y divide-pr-border-hairline">
      {invites.map((invite) => {
        const expired = Date.parse(invite.expiresAt) <= Date.parse(now);
        return (
          <li
            key={invite.id}
            className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="grid min-w-0 gap-0.5">
              <span className="flex items-center gap-2">
                <span className="truncate font-medium">{invite.email}</span>
                <RoleBadge role={invite.role} />
              </span>
              <span className="text-xs text-pr-text-tertiary">
                {expired ? "Expired " : "Expires "}
                {format.date(invite.expiresAt)}
                {invite.invitedBy ? ` · invited by ${invite.invitedBy}` : ""}
              </span>
            </span>
            <span className="flex flex-wrap gap-1">
              <Button variant="ghost" size="sm" onClick={copySignInLink}>
                <Copy aria-hidden />
                Copy sign-in link
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => resend(invite)}
                aria-label={`Resend invite to ${invite.email}`}
              >
                <RotateCw aria-hidden />
                Resend
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => revoke(invite)}
                aria-label={`Revoke invite to ${invite.email}`}
              >
                <X aria-hidden />
                Revoke
              </Button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
