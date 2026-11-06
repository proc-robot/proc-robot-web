"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Button } from "@/components/ui/button";
import { deleteMyAccount, exportMyData } from "@/app/(app)/account/actions";

/**
 * Your data (A6): download everything Proc-Robot holds about you, or delete
 * the account. An Owner transfers ownership first (or deletes the org).
 */
export function YourDataSection({ email, isOwner }: { email: string; isOwner: boolean }) {
  const [isExporting, startExport] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function download() {
    startExport(async () => {
      const result = await exportMyData();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const url = URL.createObjectURL(new Blob([result.data], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `proc-robot-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Download your data</h3>
        <p className="text-sm text-pr-text-secondary">
          Your account, profile, invites and activity, as a JSON file. Your organization’s projects,
          suppliers and quotations belong to the organization.
        </p>
        <Button variant="outline" onClick={download} disabled={isExporting}>
          <Download aria-hidden />
          {isExporting ? "Preparing…" : "Download my data"}
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-pr-destructive">Delete your account</h3>
        {isOwner ? (
          <p className="text-sm text-pr-text-secondary">
            You are the Owner of your organization.{" "}
            <Link href="/settings/members" className="font-medium text-pr-accent underline">
              Transfer ownership
            </Link>{" "}
            to another member first, or delete the organization in{" "}
            <Link href="/settings" className="font-medium text-pr-accent underline">
              Settings
            </Link>
            .
          </p>
        ) : (
          <p className="text-sm text-pr-text-secondary">
            Removes your account, profile and sign-in for good. What you created for your
            organization stays with it.
          </p>
        )}
        <Button variant="destructive" disabled={isOwner} onClick={() => setConfirming(true)}>
          <Trash2 aria-hidden />
          Delete my account
        </Button>
      </div>

      <ConfirmAction
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete your account?"
        description={
          <p>
            This can’t be undone. You lose access to your organization, and your profile and sign-in
            are removed.
          </p>
        }
        confirmText={email}
        confirmTextLabel="Your email address"
        confirmLabel="Delete my account"
        destructive
        onConfirm={(typed) => deleteMyAccount(typed)}
      />
    </div>
  );
}
