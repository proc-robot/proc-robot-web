import { cookies } from "next/headers";
import {
  createFormatter,
  DEFAULT_FORMAT_LOCALE,
  DEFAULT_TIME_ZONE,
  FORMAT_LOCALE_COOKIE,
  isFormatLocale,
  type FormatPrefs,
} from "./format";

/**
 * The signed-in user's format preferences, for Server Components and layouts.
 * Reads a cookie, so the calling route renders per request: use it in the
 * workspace and `/admin`, never on the public site (which stays static).
 *
 * With auth (T0.3 / T1.1.1) the cookie is filled from `profiles.format_locale`
 * at sign-in, and the time zone comes from `profiles.timezone`.
 */
export async function getFormatPrefs(): Promise<FormatPrefs> {
  const value = (await cookies()).get(FORMAT_LOCALE_COOKIE)?.value;
  return {
    locale: isFormatLocale(value) ? value : DEFAULT_FORMAT_LOCALE,
    timeZone: DEFAULT_TIME_ZONE,
  };
}

export async function getFormatter() {
  return createFormatter(await getFormatPrefs());
}
