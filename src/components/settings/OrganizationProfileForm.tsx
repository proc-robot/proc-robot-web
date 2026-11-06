"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Combobox, type ComboboxOption } from "@/components/shared/Combobox";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateOrganizationProfile } from "@/app/(app)/settings/actions";
import {
  organizationProfileSchema,
  type OrganizationProfileValues,
} from "@/app/(app)/settings/schema";
import { applyActionErrors } from "@/lib/forms/apply-action-errors";

/** The organization's own details (O1): name, country, currency, address, tax ID. */
export function OrganizationProfileForm({
  defaultValues,
  countries,
  currencies,
  canEdit,
}: {
  defaultValues: OrganizationProfileValues;
  countries: ComboboxOption[];
  currencies: ComboboxOption[];
  canEdit: boolean;
}) {
  const form = useForm<OrganizationProfileValues>({
    resolver: zodResolver(organizationProfileSchema),
    defaultValues,
  });

  async function onSubmit(values: OrganizationProfileValues) {
    const result = await updateOrganizationProfile(values);
    if (!result.ok) return applyActionErrors(form, result);
    toast.success("Organization saved.");
    form.reset(values);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <fieldset disabled={!canEdit} className="contents">
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="org-name">Organization name</FieldLabel>
                <Input
                  {...field}
                  id="org-name"
                  autoComplete="organization"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="country"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="org-country">Country</FieldLabel>
                  <Combobox
                    id="org-country"
                    options={countries}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select a country"
                    searchPlaceholder="Search countries…"
                    invalid={fieldState.invalid}
                  />
                  <FieldDescription>Where online prices are searched by default.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="currency"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="org-currency">Default currency</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="org-currency"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue placeholder="Select a currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>For new quotations and RFQs.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>
          <Controller
            name="address"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="org-address">Address</FieldLabel>
                <Textarea
                  {...field}
                  id="org-address"
                  rows={3}
                  autoComplete="street-address"
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>Printed on your quotations and RFQs.</FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="taxId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="sm:max-w-xs">
                <FieldLabel htmlFor="org-tax-id">Tax ID</FieldLabel>
                <Input {...field} id="org-tax-id" aria-invalid={fieldState.invalid} />
                <FieldDescription>e.g. UEN, NPWP or VAT number.</FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          {canEdit && (
            <div>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || !form.formState.isDirty}
              >
                {form.formState.isSubmitting ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </FieldGroup>
      </fieldset>
    </form>
  );
}
