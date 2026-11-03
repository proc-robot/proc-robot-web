"use server";

import { cookies } from "next/headers";
import { FORMAT_LOCALE_COOKIE, isFormatLocale } from "./format";

/**
 * Saves the user's number and date format. Setting a cookie in a Server
 * Action makes Next re-render the current route, so amounts and dates update
 * without a reload. Once auth lands, this also writes `profiles.format_locale`.
 */
export async function setFormatLocale(locale: string): Promise<void> {
  // Server Actions are public endpoints: never trust the argument.
  if (!isFormatLocale(locale)) return;

  (await cookies()).set(FORMAT_LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
