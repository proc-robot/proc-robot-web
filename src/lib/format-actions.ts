"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { FORMAT_LOCALE_COOKIE, isFormatLocale } from "./format";

/**
 * Saves the user's number and date format: in their profile (so it follows
 * them to other devices — sign-in copies it back into the cookie) and in the
 * cookie the formatter reads. Setting a cookie in a Server Action makes Next
 * re-render the current route, so amounts and dates update without a reload.
 */
export async function setFormatLocale(locale: string): Promise<void> {
  // Server Actions are public endpoints: never trust the argument.
  if (!isFormatLocale(locale)) return;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    await supabase.from("profiles").update({ format_locale: locale }).eq("id", data.claims.sub);
  }

  (await cookies()).set(FORMAT_LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
