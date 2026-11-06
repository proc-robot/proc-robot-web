/**
 * Money and date formatting. The UI is English only; what varies per user is
 * the **format**: `en-US` ("USD 1,234.50", "Nov 4, 2026") or `en-ID`
 * ("USD 1.234,50", "4 Nov 2026"). `en-ID` is Indonesian number and date
 * conventions with English month names, which suits an English UI (`id-ID`
 * would write "Agu", "Okt", "Des").
 *
 * Plain `Intl`, shared by server and client:
 * - Server Components / Server Actions: `await getFormatter()` (format-server.ts)
 * - Client Components: `useFormatter()` (components/providers/FormatProvider.tsx)
 * - No user (public site, emails): `createFormatter()` with the defaults
 *
 * Never use `toLocaleString()` or build these strings by hand.
 */

export const FORMAT_LOCALES = ["en-US", "en-ID"] as const;
export type FormatLocale = (typeof FORMAT_LOCALES)[number];
export const DEFAULT_FORMAT_LOCALE: FormatLocale = "en-US";

/** Shown in the format picker, next to a live sample. */
export const FORMAT_LOCALE_NAMES: Record<FormatLocale, string> = {
  "en-US": "United States",
  "en-ID": "Indonesia",
};

export const isFormatLocale = (value: unknown): value is FormatLocale =>
  typeof value === "string" && (FORMAT_LOCALES as readonly string[]).includes(value);

/**
 * The user's format. Sign-in copies `profiles.format_locale` into it; the
 * profile page and the sidebar picker write both (src/lib/format-cookies.ts).
 */
export const FORMAT_LOCALE_COOKIE = "format_locale";

/** The user's time zone (`profiles.timezone`), copied the same way. */
export const TIME_ZONE_COOKIE = "time_zone";

/**
 * Until the user picks one on their profile. Always explicit, never the
 * machine's own zone, so the server and the browser render the same text.
 */
export const DEFAULT_TIME_ZONE = "UTC";

/** An IANA time zone the formatter accepts, e.g. "Asia/Jakarta". */
export function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export type FormatPrefs = { locale: FormatLocale; timeZone: string };
export const DEFAULT_FORMAT_PREFS: FormatPrefs = {
  locale: DEFAULT_FORMAT_LOCALE,
  timeZone: DEFAULT_TIME_ZONE,
};

/**
 * Currencies shown without minor units even though ISO 4217 gives them two:
 * rupiah prices are whole numbers in practice. Display only — the stored
 * amount is not rounded.
 */
const WHOLE_UNIT_CURRENCIES = new Set(["IDR"]);

// Building an Intl formatter is far slower than using one; keep one per option set.
const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

function cached<T extends Intl.NumberFormat | Intl.DateTimeFormat>(key: string, make: () => T): T {
  let formatter = cache.get(key) as T | undefined;
  if (!formatter) {
    formatter = make();
    cache.set(key, formatter);
  }
  return formatter;
}

const dateFormat = (locale: FormatLocale, timeZone: string) =>
  cached(
    `date:${locale}:${timeZone}`,
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone,
      }),
  );

/** Accepts a `Date` or an ISO string, as Supabase returns `timestamptz` columns. */
const toDate = (value: Date | string) => (typeof value === "string" ? new Date(value) : value);

export type Formatter = {
  readonly prefs: FormatPrefs;
  /**
   * An amount in its own currency, with the ISO code rather than a symbol ("$"
   * is both USD and SGD, and one quotation can mix currencies):
   * "USD 1,234.50" / "IDR 1,500,000" (en-US), "USD 1.234,50" (en-ID).
   * Display only: totals, margins and tax come from `calculate_quotation()`.
   */
  money(amount: number, currency: string): string;
  /**
   * An instant (`timestamptz`) as a calendar date in the user's time zone:
   * "Nov 4, 2026" / "4 Nov 2026". The month is a word, so it never reads as
   * April vs November the way "11/04/2026" does.
   */
  date(value: Date | string): string;
  /**
   * A `date` column ("2026-11-04", e.g. a quotation's validity). It has no time
   * of day, so it is never shifted into the user's zone.
   */
  calendarDate(value: string): string;
  /**
   * "Nov 4, 2026, 14:05 UTC" / "4 Nov 2026, 14.05 WIB". 24-hour with the zone
   * shown, because a team can span countries. 24-hour also avoids "2:05 PM",
   * whose space before "PM" differs between ICU versions and would make server
   * and browser text disagree during hydration.
   */
  dateTime(value: Date | string): string;
};

export function createFormatter(prefs: FormatPrefs = DEFAULT_FORMAT_PREFS): Formatter {
  const { locale, timeZone } = prefs;
  return {
    prefs,
    money(amount, currency) {
      const code = currency.toUpperCase();
      return cached(
        `money:${locale}:${code}`,
        () =>
          new Intl.NumberFormat(locale, {
            style: "currency",
            currency: code,
            currencyDisplay: "code",
            ...(WHOLE_UNIT_CURRENCIES.has(code) && {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }),
          }),
      ).format(amount);
    },
    date(value) {
      return dateFormat(locale, timeZone).format(toDate(value));
    },
    calendarDate(value) {
      // "2026-11-04" parses as UTC midnight, so format it in UTC.
      return dateFormat(locale, "UTC").format(new Date(value));
    },
    dateTime(value) {
      return cached(
        `datetime:${locale}:${timeZone}`,
        () =>
          new Intl.DateTimeFormat(locale, {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
            timeZoneName: "short",
            timeZone,
          }),
      ).format(toDate(value));
    },
  };
}
