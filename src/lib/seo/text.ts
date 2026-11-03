/**
 * Text helpers shared by the metadata layer and the JSON-LD builders.
 *
 * Both need the same thing: content fields authored for the page turned into
 * the short plain-text strings that `<meta>` tags and schema properties expect.
 * Keeping it in one place is what stops a page's meta description and its
 * JSON-LD `description` from drifting apart.
 */

/** Entities rich-text editors commonly emit. A full decoder would be dead weight here. */
const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&lsquo;": "‘",
  "&rsquo;": "’",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
};

/**
 * Strips markup and collapses whitespace.
 *
 * Copy can arrive as rich-text HTML, or with inline `<strong>`/`<em>` pasted
 * into a plain field, so this runs on every derived description rather than
 * only on fields documented as rich text. Block
 * tags become spaces first, otherwise `<p>a</p><p>b</p>` would read "ab".
 */
export function plainText(input: string): string {
  const spaced = input
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "");

  const decoded = spaced.replace(
    /&(?:nbsp|amp|lt|gt|quot|#39|apos|ldquo|rdquo|lsquo|rsquo|mdash|ndash|hellip);/gi,
    (match) => ENTITIES[match.toLowerCase()] ?? match,
  );

  return decoded.replace(/\s+/g, " ").trim();
}

/**
 * Cuts `text` to at most `maxLength` characters, breaking on a word boundary
 * and appending an ellipsis.
 *
 * The ellipsis is counted inside the budget, so the result never exceeds
 * `maxLength`. A string already within budget is returned untouched — no
 * ellipsis — so short descriptions don't get a trailing "…" implying more text.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const budget = maxLength - 1; // room for the ellipsis
  const clipped = text.slice(0, budget);
  const lastSpace = clipped.lastIndexOf(" ");

  // Fall back to a hard cut if the first "word" is longer than the budget.
  const body = lastSpace > budget * 0.6 ? clipped.slice(0, lastSpace) : clipped;

  return `${body.replace(/[\s,;:.!?-]+$/, "")}…`;
}
