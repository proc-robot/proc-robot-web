"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2 } from "lucide-react";
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
import { createOrganization, joinOrganization } from "@/app/(auth)/onboarding/actions";
import {
  organizationFormSchema,
  type HomeView,
  type OrganizationFormValues,
} from "@/app/(auth)/onboarding/schema";
import { defaultCurrency } from "@/lib/countries";
import { applyActionErrors } from "@/lib/forms/apply-action-errors";

export type PendingInvite = {
  id: string;
  organizationName: string;
  role: "owner" | "admin" | "member";
  invitedBy: string | null;
};

const HOME_VIEW_OPTIONS: { value: HomeView; label: string; hint: string }[] = [
  { value: "quotations", label: "Quotations for customers", hint: "You price and sell." },
  { value: "rfqs", label: "RFQs for suppliers", hint: "You source and buy." },
  { value: "both", label: "Both", hint: "You do both, often on one project." },
];

/**
 * Onboarding (A3). The "What do you mainly create?" answer sets the home
 * screen and goes with either path: joining an invited organization or
 * creating a new one. Both actions redirect into the workspace.
 */
export function OnboardingForm({
  firstName,
  defaultHomeView,
  invites,
  countries,
  currencies,
}: {
  firstName: string | null;
  defaultHomeView: HomeView;
  invites: PendingInvite[];
  /** Built on the server, so server and browser render the same names. */
  countries: ComboboxOption[];
  currencies: ComboboxOption[];
}) {
  const [homeView, setHomeView] = useState<HomeView>(defaultHomeView);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [isJoining, startJoining] = useTransition();
  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: { name: "", country: "", currency: "" },
  });

  function join(invite: PendingInvite) {
    setJoiningId(invite.id);
    startJoining(async () => {
      const result = await joinOrganization({ inviteId: invite.id, homeView });
      if (!result.ok) toast.error(result.error);
    });
  }

  async function onCreate(values: OrganizationFormValues) {
    const result = await createOrganization({ ...values, homeView });
    if (!result.ok) applyActionErrors(form, result);
  }

  return (
    <div className="w-full max-w-lg space-y-10">
      <div className="space-y-2">
        <h1 className="font-newsreader text-[32px] leading-tight font-normal">
          {firstName ? `Welcome, ${firstName}` : "Welcome to Proc-Robot"}
        </h1>
        <p className="text-[15px] text-pr-text-secondary">
          Two quick steps and your workspace is ready.
        </p>
      </div>

      <FieldSet>
        <FieldLegend>What do you mainly create?</FieldLegend>
        <FieldDescription>
          This sets your home screen. You can use both documents either way, and change it later in
          your profile.
        </FieldDescription>
        <RadioGroup
          value={homeView}
          onValueChange={(value) => setHomeView(value as HomeView)}
          className="grid gap-2 sm:grid-cols-3"
        >
          {HOME_VIEW_OPTIONS.map((option) => (
            <FieldLabel
              key={option.value}
              htmlFor={`home-view-${option.value}`}
              className="cursor-pointer rounded-[10px] border border-pr-border-card bg-white p-3 has-data-[state=checked]:border-pr-accent has-data-[state=checked]:bg-pr-success-tint"
            >
              <RadioGroupItem id={`home-view-${option.value}`} value={option.value} />
              <span className="grid gap-0.5">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs font-normal text-pr-text-tertiary">{option.hint}</span>
              </span>
            </FieldLabel>
          ))}
        </RadioGroup>
      </FieldSet>

      {invites.length > 0 && (
        <section className="space-y-3" aria-labelledby="invites-heading">
          <h2 id="invites-heading" className="text-sm font-semibold">
            You’ve been invited
          </h2>
          <ul className="space-y-2">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between gap-4 rounded-[14px] border border-pr-border-card bg-white p-4"
              >
                <span className="flex items-center gap-3">
                  <Building2 className="size-5 shrink-0 text-pr-accent-soft" aria-hidden />
                  <span className="grid">
                    <span className="font-medium">{invite.organizationName}</span>
                    <span className="text-xs text-pr-text-tertiary">
                      as {invite.role}
                      {invite.invitedBy ? `, invited by ${invite.invitedBy}` : ""}
                    </span>
                  </span>
                </span>
                <Button onClick={() => join(invite)} disabled={isJoining}>
                  {isJoining && joiningId === invite.id ? "Joining…" : "Join"}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4" aria-labelledby="create-heading">
        <h2 id="create-heading" className="text-sm font-semibold">
          {invites.length > 0 ? "Or create a new organization" : "Create your organization"}
        </h2>
        <form
          onSubmit={form.handleSubmit(onCreate)}
          noValidate
          className="rounded-[14px] border border-pr-border-card bg-white p-5"
        >
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
                    placeholder="Kigen Pte. Ltd."
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
                      onChange={(country) => {
                        field.onChange(country);
                        // Follow the country until the user picks a currency themselves.
                        if (!form.getFieldState("currency").isDirty) {
                          form.setValue("currency", defaultCurrency(country), {
                            shouldValidate: true,
                          });
                        }
                      }}
                      placeholder="Select a country"
                      searchPlaceholder="Search countries…"
                      invalid={fieldState.invalid}
                    />
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
                    <Select
                      value={field.value}
                      onValueChange={(currency) =>
                        form.setValue("currency", currency, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    >
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
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
            <FieldDescription>
              The country sets where online prices are searched by default. You start on the Starter
              plan and can change it any time.
            </FieldDescription>
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating…" : "Create organization"}
            </Button>
          </FieldGroup>
        </form>
      </section>
    </div>
  );
}
