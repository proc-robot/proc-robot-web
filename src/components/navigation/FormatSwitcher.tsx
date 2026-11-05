"use client";

import { useTransition } from "react";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useFormatter } from "@/components/providers/FormatProvider";
import { createFormatter, FORMAT_LOCALE_NAMES, FORMAT_LOCALES } from "@/lib/format";
import { setFormatLocale } from "@/lib/format-actions";

// Fixed sample values: a live clock would differ between server and browser.
const SAMPLE_AMOUNT = 1234.5;
const SAMPLE_DATE = "2026-11-04";

/** "USD 1,234.50 · Nov 4, 2026" in the given format. */
function sample(locale: (typeof FORMAT_LOCALES)[number]) {
  const format = createFormatter({ locale, timeZone: "UTC" });
  return `${format.money(SAMPLE_AMOUNT, "USD")} · ${format.calendarDate(SAMPLE_DATE)}`;
}

/**
 * The user's number and date format, in the sidebar footer of both the
 * workspace and `/admin`. It moves into the account menu / profile page once
 * auth exists (T0.1.8, T1.1.1). Each option shows a live sample, which says
 * more than a locale code.
 */
export function FormatSwitcher() {
  const { prefs } = useFormatter();
  const { isMobile } = useSidebar();
  const [isPending, startTransition] = useTransition();
  const name = FORMAT_LOCALE_NAMES[prefs.locale];

  function choose(value: string) {
    if (value === prefs.locale) return;
    startTransition(async () => {
      await setFormatLocale(value);
    });
  }

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip="Number & date format"
            disabled={isPending}
            // Includes the visible text, so voice control ("click United States") works.
            aria-label={`Number and date format: ${name}`}
          >
            <Globe />
            <span>{name}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side={isMobile ? "top" : "right"} align="end" className="min-w-64">
          <DropdownMenuLabel>Number & date format</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={prefs.locale} onValueChange={choose}>
            {FORMAT_LOCALES.map((locale) => (
              <DropdownMenuRadioItem key={locale} value={locale}>
                <span className="grid leading-tight">
                  <span>{FORMAT_LOCALE_NAMES[locale]}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {sample(locale)}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
