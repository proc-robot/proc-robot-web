"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Radix Select forbids a SelectItem with value="". For optional/"None" selects we use this
// sentinel in the visible widget and submit "" through a hidden input, so the Server Actions
// (which already treat "" as null) need no changes.
const NONE = "__none__";

export function SelectField({
  label,
  name,
  defaultValue,
  required,
  options,
  blankLabel,
  hint,
  onValueChange,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  options: { value: string; label: string }[];
  /** When set, prepends an empty "none" option with this label. */
  blankLabel?: string;
  hint?: string;
  /** Optional listener for forms that react to the choice (receives "" for the blank option). */
  onValueChange?: (value: string) => void;
}) {
  const hasBlank = blankLabel !== undefined;
  const initial =
    defaultValue && defaultValue.length > 0
      ? defaultValue
      : hasBlank
        ? NONE
        : (options[0]?.value ?? NONE);
  const [value, setValue] = useState<string>(initial);
  const submitted = value === NONE ? "" : value;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <Select
        value={value}
        onValueChange={(next) => {
          setValue(next);
          onValueChange?.(next === NONE ? "" : next);
        }}
      >
        <SelectTrigger id={name} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hasBlank && <SelectItem value={NONE}>{blankLabel}</SelectItem>}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input type="hidden" name={name} value={submitted} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
