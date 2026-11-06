"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { CustomerPicker } from "@/components/customers/CustomerPicker";
import { Combobox, type ComboboxOption } from "@/components/shared/Combobox";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProject, updateProject } from "@/app/(app)/projects/actions";
import { projectSchema, type ProjectValues } from "@/app/(app)/projects/schema";
import { applyActionErrors } from "@/lib/forms/apply-action-errors";

/**
 * Creates or edits a project (W1): name, customer, tender reference,
 * deadline and the delivery place, which sets where prices are searched.
 */
export function ProjectForm({
  mode,
  projectId,
  defaultValues,
  customers,
  countries,
  disabled = false,
  cancelHref,
}: {
  mode: "create" | "edit";
  projectId?: string;
  defaultValues: ProjectValues;
  customers: ComboboxOption[];
  countries: ComboboxOption[];
  /** Create only: the plan's open-project limit is reached. */
  disabled?: boolean;
  cancelHref: string;
}) {
  const router = useRouter();
  const form = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues,
  });

  async function onSubmit(values: ProjectValues) {
    if (mode === "edit" && projectId) {
      const result = await updateProject(projectId, values);
      if (!result.ok) return applyActionErrors(form, result);
      toast.success("Project saved.");
      router.push(`/projects/${projectId}`);
      return;
    }
    const result = await createProject(values);
    if (!result.ok) return applyActionErrors(form, result);
    toast.success("Project created.");
    router.push(`/projects/${result.data.id}`);
  }

  const { isSubmitting } = form.formState;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <fieldset disabled={disabled} className="contents">
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="project-name">Project name</FieldLabel>
                <Input
                  {...field}
                  id="project-name"
                  placeholder="e.g. CCTV – Office Tower"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="customerId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="project-customer">Customer</FieldLabel>
                <CustomerPicker
                  id="project-customer"
                  customers={customers}
                  value={field.value}
                  onChange={field.onChange}
                  invalid={fieldState.invalid}
                />
                <FieldDescription>Optional. Who the quotation is for.</FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="referenceNo"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="project-reference">Reference or tender number</FieldLabel>
                  <Input {...field} id="project-reference" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="deadline"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="project-deadline">Deadline</FieldLabel>
                  <Input
                    {...field}
                    id="project-deadline"
                    type="date"
                    min="2000-01-01"
                    max="2100-12-31"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>When the quotation or tender is due.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="deliveryCountry"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="project-country">Delivery country</FieldLabel>
                  <Combobox
                    id="project-country"
                    options={countries}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select a country"
                    searchPlaceholder="Search countries…"
                    invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    Online prices are searched in this country, in its currency.
                  </FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="deliveryCity"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="project-city">Delivery city</FieldLabel>
                  <Input {...field} id="project-city" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>
          <Controller
            name="notes"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="project-notes">Notes</FieldLabel>
                <Textarea
                  {...field}
                  id="project-notes"
                  rows={4}
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>For your team: scope, site details, contacts.</FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : mode === "edit" ? "Save project" : "Create project"}
            </Button>
            <Button asChild variant="ghost">
              <Link href={cancelHref}>Cancel</Link>
            </Button>
          </div>
        </FieldGroup>
      </fieldset>
    </form>
  );
}
