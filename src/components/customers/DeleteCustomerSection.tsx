"use client";

import { useState } from "react";
import { ConfirmAction } from "@/components/app/ConfirmAction";
import { Button } from "@/components/ui/button";
import { deleteCustomer } from "@/app/(app)/customers/actions";

/** Owner and Admins delete a customer; its projects stay, without a customer. */
export function DeleteCustomerSection({
  id,
  name,
  projects,
}: {
  id: string;
  name: string;
  projects: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-pr-text-secondary">
        {projects > 0
          ? `Its ${projects === 1 ? "project stays" : `${projects} projects stay`}, without a customer.`
          : "No project uses this customer."}
      </p>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete customer
      </Button>
      <ConfirmAction
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${name}?`}
        description={
          <p>
            The customer is removed from your directory. Projects and quotations keep their data but
            are no longer linked to it.
          </p>
        }
        confirmLabel="Delete customer"
        destructive
        onConfirm={() => deleteCustomer(id)}
      />
    </div>
  );
}
