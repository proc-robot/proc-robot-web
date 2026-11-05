"use client";

import { createContext, use } from "react";
import { createFormatter, DEFAULT_FORMAT_PREFS, type FormatPrefs } from "@/lib/format";

const FormatContext = createContext<FormatPrefs>(DEFAULT_FORMAT_PREFS);

/**
 * Hands the user's format preferences (read on the server by the section
 * layout) to Client Components, so both sides format the same way.
 */
export function FormatProvider({
  prefs,
  children,
}: {
  prefs: FormatPrefs;
  children: React.ReactNode;
}) {
  return <FormatContext value={prefs}>{children}</FormatContext>;
}

/** `format.money(…)`, `format.date(…)`, … with the user's format and time zone. */
export function useFormatter() {
  return createFormatter(use(FormatContext));
}
