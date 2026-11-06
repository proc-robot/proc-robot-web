"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updatePublicProfile } from "@/app/(app)/settings/actions";
import { publicProfileSchema, type PublicProfileValues } from "@/app/(app)/settings/schema";
import { applyActionErrors } from "@/lib/forms/apply-action-errors";

export type CategoryGroup = {
  slug: string;
  name: string;
  children: { slug: string; name: string }[];
};

/**
 * The public supplier profile (O2): how other organizations reach you when
 * they find your published items (P3). WhatsApp is checked as E.164, so a
 * `wa.me` link always works.
 */
export function PublicProfileForm({
  defaultValues,
  categories,
  canEdit,
}: {
  defaultValues: PublicProfileValues;
  categories: CategoryGroup[];
  canEdit: boolean;
}) {
  const form = useForm<PublicProfileValues>({
    resolver: zodResolver(publicProfileSchema),
    defaultValues,
  });

  async function onSubmit(values: PublicProfileValues) {
    const result = await updatePublicProfile(values);
    if (!result.ok) return applyActionErrors(form, result);
    toast.success("Public profile saved.");
    form.reset(values);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <fieldset disabled={!canEdit} className="contents">
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="public-email">Sales email</FieldLabel>
                  <Input
                    {...field}
                    id="public-email"
                    type="email"
                    autoComplete="email"
                    placeholder="sales@example.com"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="whatsapp"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="public-whatsapp">WhatsApp number</FieldLabel>
                  <Input
                    {...field}
                    id="public-whatsapp"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+65 9123 4567"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>With the country code, starting with +.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>
          <Controller
            name="website"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="public-website">Website</FieldLabel>
                <Input
                  {...field}
                  id="public-website"
                  type="url"
                  autoComplete="url"
                  placeholder="https://example.com"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="description"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="public-description">About your organization</FieldLabel>
                <Textarea
                  {...field}
                  id="public-description"
                  rows={4}
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>What you supply and where you deliver.</FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="categories"
            control={form.control}
            render={({ field, fieldState }) => {
              const toggle = (slug: string, checked: boolean) =>
                field.onChange(
                  checked ? [...field.value, slug] : field.value.filter((value) => value !== slug),
                );
              return (
                <FieldSet data-invalid={fieldState.invalid}>
                  <FieldLegend variant="label">Categories you serve</FieldLegend>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {categories.map((group) => (
                      <div key={group.slug} className="space-y-2">
                        <p className="text-sm font-medium">{group.name}</p>
                        {group.children.map((category) => (
                          <Field key={category.slug} orientation="horizontal">
                            <Checkbox
                              id={`category-${category.slug}`}
                              checked={field.value.includes(category.slug)}
                              onCheckedChange={(checked) => toggle(category.slug, checked === true)}
                            />
                            <FieldLabel
                              htmlFor={`category-${category.slug}`}
                              className="font-normal"
                            >
                              {category.name}
                            </FieldLabel>
                          </Field>
                        ))}
                      </div>
                    ))}
                  </div>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </FieldSet>
              );
            }}
          />
          {canEdit && (
            <div>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || !form.formState.isDirty}
              >
                {form.formState.isSubmitting ? "Saving…" : "Save public profile"}
              </Button>
            </div>
          )}
        </FieldGroup>
      </fieldset>
    </form>
  );
}
