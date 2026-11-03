/**
 * Shared primitives for the JSON-LD builders.
 *
 * Everything here is pure — the builders take already-fetched rows, so a page
 * never does a second query just to emit its markup.
 *
 * Two rules are enforced structurally rather than remembered:
 *
 * 1. **Never emit `""` or `null`.** Every builder's output goes through
 *    `compactDeep`, so a field the SEO team hasn't filled in simply drops out
 *    of the markup instead of appearing as an empty string. This is what lets
 *    the builders be written as if every field were present.
 * 2. **Entities are linked by `@id`, never duplicated.** The `@id`s below are
 *    fixed, so every page's `publisher` / `about` / `isPartOf` points at the
 *    one Organization and WebSite node the public layout defines.
 */

import { siteUrl, absoluteUrl } from "@/lib/site-url";
import { plainText } from "@/lib/seo/text";

/** JSON-LD is plain JSON — this is the shape of anything the builders produce. */
export type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export type JsonLdNode = { [key: string]: JsonLdValue };

/**
 * Recursively strips values that must not appear in the output: `undefined`,
 * `null`, empty/whitespace strings, and containers left empty once their own
 * children were stripped.
 *
 * `false` and `0` are kept — they are meaningful values, not absences
 * (`acceptsReservations: false` says something).
 */
export function compactDeep<T extends JsonLdValue>(value: T): T | undefined {
  if (value === null || value === undefined) return undefined;

  if (typeof value === "string") {
    const trimmed = value.trim();
    return (trimmed === "" ? undefined : trimmed) as T | undefined;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => compactDeep(item))
      .filter((item): item is JsonLdValue => item !== undefined);
    return (items.length === 0 ? undefined : items) as T | undefined;
  }

  if (typeof value === "object") {
    const out: Record<string, JsonLdValue> = {};
    for (const [key, raw] of Object.entries(value)) {
      const cleaned = compactDeep(raw);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    // A node holding nothing but its own @type carries no information.
    const meaningful = Object.keys(out).filter((k) => k !== "@type" && k !== "@context");
    return (meaningful.length === 0 ? undefined : out) as T | undefined;
  }

  return value;
}

/** Wraps nodes in the one `@graph` block a page emits. */
export function graph(...nodes: (JsonLdNode | undefined)[]): Record<string, unknown> {
  const items = nodes
    .map((node) => (node ? compactDeep(node) : undefined))
    .filter((node): node is JsonLdNode => node !== undefined);

  return { "@context": "https://schema.org", "@graph": items };
}

// --- Fixed @ids ------------------------------------------------------------
//
// The bare origin, deliberately without a trailing slash: Next normalises the
// root canonical to `https://proc-robot.com` and will not emit
// `https://proc-robot.com/`, and sitemap.ts matches that form. Three spellings
// of the homepage in our own output is what invites a crawler to treat them as
// separate URLs — so one spelling wins everywhere.
//
// Add an id helper here (e.g. `articleId(slug)`) when a public page type gets
// its own entity, so other nodes can reference it by `@id` instead of copying it.

export const ORG_ID = `${siteUrl()}/#organization`;
export const WEBSITE_ID = `${siteUrl()}/#website`;

export const pageId = (path: string) => `${pageUrl(path)}#page`;

/** Reference to another node, by `@id` alone — never a second copy of it. */
export const ref = (id: string) => ({ "@id": id });

/**
 * Absolute URL for a page. The homepage is the bare origin, matching its
 * canonical and its sitemap entry (see the note above).
 */
export function pageUrl(path: string): string {
  return path === "/" ? siteUrl() : absoluteUrl(path);
}

/**
 * A site-relative path, or an already-absolute URL left alone.
 *
 * Some list items point off-site (e.g. a press page linking to the
 * publications), so the list builders accept both.
 */
export function urlOrPath(value: string): string {
  return /^https?:\/\//i.test(value) ? value : pageUrl(value);
}

/**
 * Absolute URL for an image, or undefined when there is none.
 *
 * Must be the original file path. Never a `/_next/image?url=…` URL: crawlers
 * and chat previews fetch these directly and the optimiser route is not a
 * stable image endpoint for them.
 */
export function imageUrl(path: string | null | undefined): string | undefined {
  const trimmed = path?.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return absoluteUrl(trimmed);
}

/** Absolute URLs for a list of image paths, empty entries dropped. */
export function imageUrls(...paths: (string | null | undefined)[]): string[] {
  return paths.flatMap((path) => {
    const url = imageUrl(path);
    return url ? [url] : [];
  });
}

// --- Dates ------------------------------------------------------------------

/**
 * A stored timestamp as an ISO 8601 string (UTC, `Z`).
 *
 * Proc-Robot is global, so instants are emitted in UTC rather than a local
 * offset. Use it for `datePublished` / `dateModified` from a row's real
 * timestamps — never invent a date.
 */
export function isoInstant(date: Date): string {
  return date.toISOString();
}

// --- Breadcrumbs and FAQs --------------------------------------------------

/** One breadcrumb step. The last one carries no `item`, per Google's guidance. */
export type Crumb = { name: string; path?: string };

/**
 * `BreadcrumbList` from Home down to the current page.
 *
 * Home is prepended here so no caller can forget it, and the final crumb is
 * expected to omit its path — the page you are on is not a link.
 */
export function breadcrumb(...crumbs: Crumb[]): JsonLdNode {
  const all: Crumb[] = [{ name: "Home", path: "/" }, ...crumbs];
  return {
    "@type": "BreadcrumbList",
    itemListElement: all.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.path ? pageUrl(crumb.path) : undefined,
    })),
  };
}

/**
 * `FAQPage` from the FAQs the page actually renders, or undefined when there
 * are none.
 *
 * Answers are stored as rich text, so `plainText` strips the markup — a
 * `Question`'s `acceptedAnswer.text` is plain text, and leaving HTML in it is
 * a validator error.
 *
 * This is only honest because `AccordionContent` renders its answers into the
 * HTML even while collapsed (`forceMount`). Marking up an answer a visitor
 * cannot find on the page is misleading structured data, so if that ever
 * regresses this builder has to go with it.
 */
export function faqPage(faqs: { question: string; answer: string }[]): JsonLdNode | undefined {
  if (faqs.length === 0) return undefined;
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: plainText(faq.question),
      acceptedAnswer: { "@type": "Answer", text: plainText(faq.answer) },
    })),
  };
}

/**
 * `CollectionPage` + `ItemList` for an archive page.
 *
 * `name`/`description` come from the page's own resolved metadata, so the
 * markup and the `<title>`/`<meta>` can't describe the page differently.
 */
export function collectionPage({
  path,
  name,
  description,
  items,
}: {
  path: string;
  name: string;
  description?: string | null;
  /** `path` may be site-relative or an absolute off-site URL. */
  items: { name: string; path: string }[];
}): JsonLdNode {
  return {
    "@type": "CollectionPage",
    "@id": pageId(path),
    url: pageUrl(path),
    name,
    description,
    isPartOf: ref(WEBSITE_ID),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: urlOrPath(item.path),
        name: item.name,
      })),
    },
  };
}
