"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export { SelectField } from "./SelectField";

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  min,
  step,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  required?: boolean;
  min?: number;
  step?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        min={min}
        step={step}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        required={required}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** A value shown for context but not editable here (the server enforces it too). Not submitted. */
export function ReadOnlyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input value={value} readOnly disabled />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TextareaField({
  label,
  name,
  defaultValue,
  rows = 3,
  required,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <Textarea id={name} name={name} rows={rows} defaultValue={defaultValue ?? ""} required={required} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function CheckboxField({
  label,
  name,
  defaultChecked,
  hint,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name} className="cursor-pointer">
        <Checkbox id={name} name={name} value="true" defaultChecked={defaultChecked} />
        {label}
      </Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * Multi-select for a relation: one checkbox per option, all sharing `name`, so
 * the server action reads them with `formData.getAll(name)`. Same idiom as
 * EventScheduleFields' recurring-day checkboxes, generalised to any option list.
 */
export function CheckboxGroupField({
  label,
  name,
  options,
  defaultValues = [],
  hint,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValues?: string[];
  hint?: string;
}) {
  const selected = new Set(defaultValues);

  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing to choose from yet.</p>
      ) : (
        <div className="grid max-h-64 gap-2 overflow-y-auto rounded-md border p-3 sm:grid-cols-2">
          {options.map((o) => (
            <Label key={o.value} htmlFor={`${name}-${o.value}`} className="cursor-pointer font-normal">
              <Checkbox
                id={`${name}-${o.value}`}
                name={name}
                value={o.value}
                defaultChecked={selected.has(o.value)}
              />
              {o.label}
            </Label>
          ))}
        </div>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function FormActions({ children }: { children?: ReactNode }) {
  return <div className="flex items-center gap-3 pt-2">{children}</div>;
}

export function SaveButton({ children = "Save" }: { children?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-black text-white hover:bg-black/90 active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Saving…
        </span>
      ) : (
        children
      )}
    </Button>
  );
}
