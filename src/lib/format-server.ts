import { cookies } from "next/headers";
import {
  createFormatter,
  DEFAULT_FORMAT_LOCALE,
  DEFAULT_TIME_ZONE,
  FORMAT_LOCALE_COOKIE,
  isFormatLocale,
  isTimeZone,
  TIME_ZONE_COOKIE,
  type FormatPrefs,
} from "./format";

/**
 * The signed-in user's format preferences, for Server Components and layouts.
 * Reads cookies, so the calling route renders per request: use it in the
 * workspace and `/admin`, never on the public site (which stays static).
 *
 * The cookies are filled from `profiles.format_locale` / `profiles.timezone`
 * at sign-in, and rewritten when the user changes them.
 */
export async function getFormatPrefs(): Promise<FormatPrefs> {
  const jar = await cookies();
  const locale = jar.get(FORMAT_LOCALE_COOKIE)?.value;
  const timeZone = jar.get(TIME_ZONE_COOKIE)?.value;
  return {
    locale: isFormatLocale(locale) ? locale : DEFAULT_FORMAT_LOCALE,
    timeZone: isTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE,
  };
}

export async function getFormatter() {
  return createFormatter(await getFormatPrefs());
}
