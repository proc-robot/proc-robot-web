"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Button } from "@/components/ui/button";
import { deleteOrganization } from "@/app/(app)/settings/actions";

/** Delete the organization (O7): Owner only, restorable for 30 days. */
export function DeleteOrganizationSection({ name }: { name: string }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="space-y-3">
      <p className="text-sm text-pr-text-secondary">
        Everyone loses access at once. For 30 days you can restore the organization; after that, its
        projects, suppliers, prices, quotations and files are removed for good.
      </p>
      <Button variant="destructive" onClick={() => setConfirming(true)}>
        <Trash2 aria-hidden />
        Delete organization
      </Button>
      <ConfirmAction
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete ${name}?`}
        description={
          <p>
            All members lose access now. You can restore it within 30 days; then everything is
            removed.
          </p>
        }
        confirmText={name}
        confirmTextLabel="Organization name"
        confirmLabel="Delete organization"
        destructive
        onConfirm={(typed) => deleteOrganization(typed)}
      />
    </div>
  );
}
