"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Combobox, type ComboboxOption } from "@/components/shared/Combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EMPTY_CUSTOMER } from "@/app/(app)/customers/schema";
import { CustomerForm } from "./CustomerForm";

const NO_CUSTOMER: ComboboxOption = { value: "", label: "No customer" };

/**
 * Picks the customer of a project or quotation (Q1), or adds a new one
 * without leaving the form.
 */
export function CustomerPicker({
  id,
  customers,
  value,
  onChange,
  invalid,
}: {
  id: string;
  customers: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  const [options, setOptions] = useState(customers);
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex gap-2">
      <Combobox
        id={id}
        options={[NO_CUSTOMER, ...options]}
        value={value}
        onChange={onChange}
        placeholder="No customer"
        searchPlaceholder="Search customers…"
        emptyText="No customer by that name. Add it as new."
        invalid={invalid}
        className="min-w-0 flex-1"
      />
      <Button type="button" variant="outline" onClick={() => setAdding(true)}>
        <Plus aria-hidden />
        New customer
      </Button>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New customer</DialogTitle>
            <DialogDescription>
              Add the address and tax ID later from the customer&apos;s page.
            </DialogDescription>
          </DialogHeader>
          <CustomerForm
            mode="create"
            defaultValues={EMPTY_CUSTOMER}
            quick
            onCancel={() => setAdding(false)}
            onCreated={(customer) => {
              setOptions((current) =>
                [...current, { value: customer.id, label: customer.name }].sort((a, b) =>
                  a.label.localeCompare(b.label),
                ),
              );
              onChange(customer.id);
              setAdding(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
