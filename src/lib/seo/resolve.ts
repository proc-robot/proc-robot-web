/**
 * SEO value resolution, with provenance.
 *
 * A page's title, description and share image each come from a chain: whatever
 * the admin typed into the SEO fields, then the row's own copy, then a built-in
 * default. Returning *where* a value came from alongside the value is what lets
 * the admin's SEO Details panel show an honest "Automatic — from Short
 * description" badge instead of making someone guess why the SERP says what it
 * says.
 *
 * The same resolution feeds `generateMetadata`, the JSON-LD builders and that
 * panel. Before this existed each chain was written out twice — once in the
 * route, once in the schema builder — which meant the `<meta>` tag and the
 * markup could silently drift apart.
 */

import { plainText, truncate } from "./text";
import { DESCRIPTION_MAX } from "./metadata";

/** Where a resolved value came from. */
export type SeoSource =
  /** Typed into the SEO fields by an admin. */
  | "manual"
  /** Derived from the row's own copy. */
  | "derived"
  /** A built-in fallback — nothing in this row supplied it. */
  | "default";

export type ResolvedSeo = {
  /** Undefined only when every candidate in the chain was empty. */
  value: string | undefined;
  source: SeoSource;
  /** The field that supplied it, named as the admin sees it on the form. */
  fieldLabel: string | undefined;
};

/** Same shape, for a chain whose last candidate cannot be empty. */
export type ResolvedSeoText = ResolvedSeo & { value: string };

export type SeoCandidate = {
  /** Field name as it appears on the admin form. */
  label: string;
  value: string | null | undefined;
  /**
   * A built-in fallback rather than content anyone entered — reported as
   * "Default" rather than "Automatic".
   */
  isDefault?: boolean;
};

/**
 * First candidate that survives `clean`, with its provenance.
 *
 * Candidate 0 is the manual SEO field by convention; everything after it is
 * derived from the row unless flagged `isDefault`.
 */
function pick(
  candidates: SeoCandidate[],
  clean: (value: string, index: number) => string,
): ResolvedSeo {
  for (const [index, candidate] of candidates.entries()) {
    if (!candidate.value) continue;
    const cleaned = clean(candidate.value, index);
    if (!cleaned) continue;
    return {
      value: cleaned,
      source: candidate.isDefault ? "default" : index === 0 ? "manual" : "derived",
      fieldLabel: candidate.label,
    };
  }

  return { value: undefined, source: "default", fieldLabel: undefined };
}

/**
 * Page title.
 *
 * Emitted verbatim at every level — no truncation. An over-long title is a
 * judgement call about copy, not a bug to be papered over, and the character
 * counter on the form already flags it in red. Truncating here would hide the
 * problem from the person who can fix it.
 */
export function resolveSeoTitle(...candidates: SeoCandidate[]): ResolvedSeo {
  return pick(candidates, (value) => plainText(value));
}

/**
 * Meta description.
 *
 * A manual value passes through verbatim — the admin may have had a reason to
 * run long, and the form warns them. Everything after it is body copy, so it is
 * stripped of markup and cut to `DESCRIPTION_MAX` at a word boundary. Without
 * that, `/venues/[slug]` emitted a 700-character description by falling back to
 * the full intro paragraph.
 */
export function resolveSeoDescription(...candidates: SeoCandidate[]): ResolvedSeo {
  return pick(candidates, (value, index) =>
    index === 0 ? value.trim() : truncate(plainText(value), DESCRIPTION_MAX),
  );
}

/**
 * Share image path.
 *
 * Always the original file path — never a `/_next/image?url=` URL, which
 * crawlers and chat previews cannot use.
 */
export function resolveSeoImage(...candidates: SeoCandidate[]): ResolvedSeo {
  return pick(candidates, (value) => value.trim());
}

/**
 * Asserts a chain really did produce a value.
 *
 * Used only where the final candidate is a non-nullable column (a row's
 * `name`/`title`), which TypeScript cannot see through the `SeoCandidate`
 * boxing. Keeping the assertion in one named place beats sprinkling `?? name`
 * across the call sites, where it would read as a real fallback and quietly
 * diverge from the declared chain.
 */
export function required(resolved: ResolvedSeo, fallback: string): ResolvedSeoText {
  return resolved.value
    ? (resolved as ResolvedSeoText)
    : { value: fallback, source: "default", fieldLabel: undefined };
}

/** Human label for the panel's badge. */
export const SEO_SOURCE_LABEL: Record<SeoSource, string> = {
  manual: "Manual",
  derived: "Automatic",
  default: "Default",
};
