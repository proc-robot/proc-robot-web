"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Searchable multi-select: a combobox (Command + Popover) that renders picks as
 * removable pills, instead of a long checkbox list. Posts one hidden input per
 * selected value under `name`, same wire format as CheckboxGroupField, so server
 * actions that already read `formData.getAll(name)` need no changes.
 */
export function MultiSelectField({
  label,
  name,
  options,
  defaultValues = [],
  hint,
  placeholder = "Search…",
  emptyText = "Nothing found.",
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValues?: string[];
  hint?: string;
  placeholder?: string;
  emptyText?: string;
}) {
  const [selected, setSelected] = useState<string[]>(defaultValues);
  const [open, setOpen] = useState(false);

  const labelFor = (value: string) => options.find((o) => o.value === value)?.label ?? value;

  const toggle = (value: string) => {
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const remove = (value: string) => {
    setSelected((prev) => prev.filter((v) => v !== value));
  };

  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className={cn(selected.length === 0 && "text-muted-foreground")}>
              {selected.length === 0 ? placeholder : `${selected.length} selected`}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((o) => {
                  const isSelected = selected.includes(o.value);
                  return (
                    <CommandItem key={o.value} value={o.label} onSelect={() => toggle(o.value)}>
                      <Check className={cn("size-4", isSelected ? "opacity-100" : "opacity-0")} />
                      {o.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((value) => (
            <Badge key={value} variant="secondary" className="gap-1 pr-1">
              {labelFor(value)}
              <button
                type="button"
                aria-label={`Remove ${labelFor(value)}`}
                onClick={() => remove(value)}
                className="rounded-full outline-none hover:bg-muted-foreground/20"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
