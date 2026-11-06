"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Combobox, type ComboboxOption } from "@/components/shared/Combobox";
import { Button } from "@/components/ui/button";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProfile } from "@/app/(app)/account/actions";
import { ORG_CURRENCY, profileSchema, type ProfileValues } from "@/app/(app)/account/schema";
import { createFormatter, FORMAT_LOCALE_NAMES, FORMAT_LOCALES } from "@/lib/format";
import { applyActionErrors } from "@/lib/forms/apply-action-errors";

const HOME_VIEW_OPTIONS = [
  { value: "quotations", label: "Quotations for customers" },
  { value: "rfqs", label: "RFQs for suppliers" },
  { value: "both", label: "Both" },
] as const;

// A fixed instant, so the samples read the same on the server and in the browser.
const SAMPLE_DATE = "2026-11-04T07:05:00Z";

/** The profile (A4): name, number & date format, time zone, display currency, home screen. */
export function ProfileForm({
  defaultValues,
  timeZones,
  currencies,
  organizationCurrency,
}: {
  defaultValues: ProfileValues;
  timeZones: ComboboxOption[];
  currencies: ComboboxOption[];
  organizationCurrency: string;
}) {
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  async function onSubmit(values: ProfileValues) {
    const result = await updateProfile(values);
    if (!result.ok) return applyActionErrors(form, result);
    toast.success("Profile saved.");
    form.reset(values);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Controller
          name="fullName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="profile-name">Name</FieldLabel>
              <Input
                {...field}
                id="profile-name"
                autoComplete="name"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="formatLocale"
          control={form.control}
          render={({ field }) => (
            <FieldSet>
              <FieldLegend variant="label">Number & date format</FieldLegend>
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="grid gap-2 sm:grid-cols-2"
              >
                {FORMAT_LOCALES.map((locale) => {
                  const sample = createFormatter({ locale, timeZone: "UTC" });
                  return (
                    <FieldLabel
                      key={locale}
                      htmlFor={`format-${locale}`}
                      className="w-full cursor-pointer rounded-[10px] border border-pr-border-card p-3 has-data-[state=checked]:border-pr-accent has-data-[state=checked]:bg-pr-success-tint"
                    >
                      <RadioGroupItem id={`format-${locale}`} value={locale} />
                      <span className="grid gap-0.5">
                        <span className="text-sm font-medium">{FORMAT_LOCALE_NAMES[locale]}</span>
                        <span className="text-xs font-normal text-pr-text-tertiary tabular-nums">
                          {sample.money(1234.5, "USD")} · {sample.date(SAMPLE_DATE)}
                        </span>
                      </span>
                    </FieldLabel>
                  );
                })}
              </RadioGroup>
            </FieldSet>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="timeZone"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="profile-time-zone">Time zone</FieldLabel>
                <Combobox
                  id="profile-time-zone"
                  options={timeZones}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select a time zone"
                  searchPlaceholder="Search time zones…"
                  invalid={fieldState.invalid}
                />
                <FieldDescription>Dates and times are shown in this zone.</FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="displayCurrency"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="profile-currency">Display currency</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="profile-currency"
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ORG_CURRENCY}>
                      Organization’s currency ({organizationCurrency})
                    </SelectItem>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>For converted totals on your screens only.</FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <Controller
          name="homeView"
          control={form.control}
          render={({ field }) => (
            <FieldSet>
              <FieldLegend variant="label">What do you mainly create?</FieldLegend>
              <FieldDescription>
                Sets your home screen. You can use both either way.
              </FieldDescription>
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="grid gap-2 sm:grid-cols-3"
              >
                {HOME_VIEW_OPTIONS.map((option) => (
                  <FieldLabel
                    key={option.value}
                    htmlFor={`home-${option.value}`}
                    className="w-full cursor-pointer rounded-[10px] border border-pr-border-card p-3 has-data-[state=checked]:border-pr-accent has-data-[state=checked]:bg-pr-success-tint"
                  >
                    <RadioGroupItem id={`home-${option.value}`} value={option.value} />
                    <span className="text-sm font-medium">{option.label}</span>
                  </FieldLabel>
                ))}
              </RadioGroup>
            </FieldSet>
          )}
        />

        <div>
          <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
            {form.formState.isSubmitting ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
