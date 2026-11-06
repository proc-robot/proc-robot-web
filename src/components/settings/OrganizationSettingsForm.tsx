"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateOrganizationSettings } from "@/app/(app)/settings/actions";
import {
  organizationSettingsSchema,
  type OrganizationSettingsValues,
} from "@/app/(app)/settings/schema";
import { applyActionErrors } from "@/lib/forms/apply-action-errors";
import { isNumberFormat, previewNumber } from "@/lib/numbering";

const ROUNDING_LABELS = {
  none: "Don't round",
  nearest: "Round to the nearest step",
  up: "Round up",
  down: "Round down",
} as const;

type TextField = Exclude<keyof OrganizationSettingsValues, "roundingMode">;

/**
 * Pricing and document defaults (O5): tax, markup, minimum margin, rounding,
 * document numbers and the email signature. The costing engine (T1.8) and
 * the documents (T1.9) start from these; every quotation can still change them.
 */
export function OrganizationSettingsForm({
  defaultValues,
  canEdit,
  today,
}: {
  defaultValues: OrganizationSettingsValues;
  canEdit: boolean;
  /** Passed from the server, so the number preview renders the same on both sides. */
  today: string;
}) {
  const form = useForm<OrganizationSettingsValues>({
    resolver: zodResolver(organizationSettingsSchema),
    defaultValues,
  });
  const [quoteFormat, rfqFormat, roundingMode] = useWatch({
    control: form.control,
    name: ["quoteNumbering", "rfqNumbering", "roundingMode"],
  });

  async function onSubmit(values: OrganizationSettingsValues) {
    const result = await updateOrganizationSettings(values);
    if (!result.ok) return applyActionErrors(form, result);
    toast.success("Defaults saved.");
    form.reset(values);
  }

  const text = (
    name: TextField,
    label: string,
    options: { description?: string; suffix?: string; placeholder?: string; inputMode?: "decimal" },
  ) => (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={`settings-${name}`}>{label}</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              {...field}
              id={`settings-${name}`}
              inputMode={options.inputMode}
              placeholder={options.placeholder}
              aria-invalid={fieldState.invalid}
            />
            {options.suffix && (
              <span className="text-sm text-pr-text-tertiary" aria-hidden>
                {options.suffix}
              </span>
            )}
          </div>
          {options.description && <FieldDescription>{options.description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );

  const preview = (format: string | undefined) =>
    format && isNumberFormat(format)
      ? `Next: ${previewNumber(format, new Date(today))}`
      : undefined;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <fieldset disabled={!canEdit} className="contents">
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Tax</FieldLegend>
            <div className="grid gap-4 sm:grid-cols-2">
              {text("taxLabel", "Tax name", { placeholder: "GST, PPN, VAT" })}
              {text("taxRate", "Tax rate", { suffix: "%", inputMode: "decimal", placeholder: "9" })}
            </div>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Pricing</FieldLegend>
            <div className="grid gap-4 sm:grid-cols-2">
              {text("defaultMarkupPct", "Default markup", {
                suffix: "%",
                inputMode: "decimal",
                description: "Added to the cost of every item, unless changed per quotation.",
              })}
              {text("minimumMarginPct", "Minimum margin", {
                suffix: "%",
                inputMode: "decimal",
                description: "Quotations below it are flagged before they are sent.",
              })}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="roundingMode"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="settings-roundingMode">
                      Rounding of selling prices
                    </FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="settings-roundingMode" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROUNDING_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              {roundingMode !== "none" &&
                text("roundingIncrement", "Rounding step", {
                  inputMode: "decimal",
                  placeholder: "100",
                  description: "In the quotation's currency, e.g. 100 or 0.05.",
                })}
            </div>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Document numbers</FieldLegend>
            <FieldDescription>
              Codes: {"{YYYY}"} year, {"{YY}"} short year, {"{MM}"} month, {"{NNNN}"} counter (3–8
              N).
            </FieldDescription>
            <div className="grid gap-4 sm:grid-cols-2">
              {text("quoteNumbering", "Sales quotations", {
                placeholder: "QUO-{YYYY}-{NNNN}",
                description: preview(quoteFormat),
              })}
              {text("rfqNumbering", "RFQs", {
                placeholder: "RFQ-{YYYY}-{NNNN}",
                description: preview(rfqFormat),
              })}
            </div>
          </FieldSet>

          <Controller
            name="emailSignature"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="settings-emailSignature">Email signature</FieldLabel>
                <Textarea
                  {...field}
                  id="settings-emailSignature"
                  rows={4}
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>
                  Added to RFQs and quotations sent from Proc-Robot.
                </FieldDescription>
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
                {form.formState.isSubmitting ? "Saving…" : "Save defaults"}
              </Button>
            </div>
          )}
        </FieldGroup>
      </fieldset>
    </form>
  );
}
