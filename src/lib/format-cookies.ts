import { cookies } from "next/headers";
import { FORMAT_LOCALE_COOKIE, isFormatLocale, isTimeZone, TIME_ZONE_COOKIE } from "./format";

const OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
} as const;

/**
 * Writes the format cookies the formatter reads (src/lib/format-server.ts).
 * Only from a Server Action or a Route Handler: Server Components cannot set
 * cookies. Invalid values are skipped, never stored.
 */
export async function saveFormatCookies(prefs: {
  locale?: string | null;
  timeZone?: string | null;
}) {
  const jar = await cookies();
  if (isFormatLocale(prefs.locale)) jar.set(FORMAT_LOCALE_COOKIE, prefs.locale, OPTIONS);
  if (isTimeZone(prefs.timeZone)) jar.set(TIME_ZONE_COOKIE, prefs.timeZone, OPTIONS);
}
