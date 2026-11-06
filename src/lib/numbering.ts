/**
 * Document number formats (O5), e.g. "KIGEN-QUO-{YYYY}-{NNNN}". The database
 * checks the format (private.invalid_org_setting) and will issue the numbers
 * (T1.9); this file only validates as the user types and shows a preview.
 */

/** Letters, digits, - _ . / and the codes {YYYY}, {YY}, {MM}, {NNN…} (3–8 N). */
export const NUMBER_FORMAT_PATTERN = /^([A-Za-z0-9/_.-]|\{YYYY\}|\{YY\}|\{MM\}|\{N{3,8}\})+$/;
const COUNTER = /\{(N{3,8})\}/;

export function isNumberFormat(format: string): boolean {
  return format.length <= 60 && NUMBER_FORMAT_PATTERN.test(format) && COUNTER.test(format);
}

/** What the `sequence`-th document of the year looks like: "KIGEN-QUO-2026-0001". */
export function previewNumber(format: string, date: Date, sequence = 1): string {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return format
    .replaceAll("{YYYY}", year)
    .replaceAll("{YY}", year.slice(2))
    .replaceAll("{MM}", month)
    .replace(/\{(N{3,8})\}/g, (_, n: string) => String(sequence).padStart(n.length, "0"));
}
