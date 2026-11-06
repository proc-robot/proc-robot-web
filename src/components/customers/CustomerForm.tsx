"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type Control } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCustomer, updateCustomer } from "@/app/(app)/customers/actions";
import { customerSchema, type CustomerValues } from "@/app/(app)/customers/schema";
import { applyActionErrors } from "@/lib/forms/apply-action-errors";

function TextField({
  control,
  name,
  label,
  idPrefix,
  description,
  type = "text",
  autoComplete,
  multiline = false,
}: {
  control: Control<CustomerValues>;
  name: keyof CustomerValues;
  label: string;
  idPrefix: string;
  description?: string;
  type?: string;
  autoComplete?: string;
  multiline?: boolean;
}) {
  const id = `${idPrefix}-${name}`;
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {multiline ? (
            <Textarea {...field} id={id} rows={3} aria-invalid={fieldState.invalid} />
          ) : (
            <Input
              {...field}
              id={id}
              type={type}
              autoComplete={autoComplete}
              aria-invalid={fieldState.invalid}
            />
          )}
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

/**
 * A customer (Q1): company, contact, address and tax ID.
 * - `create`: adds one, then opens it, or hands it to `onCreated` (the
 *   project form's "New customer" dialog, which shows only the `quick` fields).
 * - `edit`: saves in place.
 */
export function CustomerForm({
  mode,
  customerId,
  defaultValues,
  quick = false,
  onCreated,
  onCancel,
  cancelHref,
}: {
  mode: "create" | "edit";
  customerId?: string;
  defaultValues: CustomerValues;
  quick?: boolean;
  onCreated?: (customer: { id: string; name: string }) => void;
  onCancel?: () => void;
  cancelHref?: string;
}) {
  const router = useRouter();
  const form = useForm<CustomerValues>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  });
  const idPrefix = quick ? "new-customer" : "customer";

  async function onSubmit(values: CustomerValues) {
    if (mode === "edit" && customerId) {
      const result = await updateCustomer(customerId, values);
      if (!result.ok) return applyActionErrors(form, result);
      toast.success("Customer saved.");
      form.reset(values);
      router.refresh();
      return;
    }
    const result = await createCustomer(values);
    if (!result.ok) return applyActionErrors(form, result);
    toast.success(`${result.data.name} added.`);
    if (onCreated) onCreated(result.data);
    else router.push(`/customers/${result.data.id}`);
  }

  const { isSubmitting, isDirty } = form.formState;

  return (
    <form
      // Inside the project form's dialog, React would bubble this submit to
      // the project form as well (portals keep the React tree): stop it here.
      onSubmit={(event) => {
        event.stopPropagation();
        void form.handleSubmit(onSubmit)(event);
      }}
      noValidate
    >
      <FieldGroup>
        <TextField
          control={form.control}
          name="name"
          label="Company name"
          idPrefix={idPrefix}
          autoComplete="organization"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="contactName"
            label="Contact person"
            idPrefix={idPrefix}
          />
          <TextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            idPrefix={idPrefix}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            control={form.control}
            name="phone"
            label="Phone"
            type="tel"
            idPrefix={idPrefix}
          />
          {!quick && (
            <TextField
              control={form.control}
              name="taxId"
              label="Tax ID"
              idPrefix={idPrefix}
              description="e.g. UEN, NPWP or VAT number."
            />
          )}
        </div>
        {!quick && (
          <>
            <TextField
              control={form.control}
              name="address"
              label="Address"
              idPrefix={idPrefix}
              description="Printed on the quotations you send them."
              multiline
            />
            <TextField
              control={form.control}
              name="notes"
              label="Notes"
              idPrefix={idPrefix}
              description="For your team only."
              multiline
            />
          </>
        )}
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={isSubmitting || (mode === "edit" && !isDirty)}>
            {isSubmitting ? "Saving…" : mode === "edit" ? "Save customer" : "Add customer"}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {cancelHref && (
            <Button asChild variant="ghost">
              <Link href={cancelHref}>Cancel</Link>
            </Button>
          )}
        </div>
      </FieldGroup>
    </form>
  );
}
