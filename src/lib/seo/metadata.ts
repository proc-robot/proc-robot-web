import type { Metadata } from "next";

export const SITE_NAME = "Proc-Robot";

/**
 * Longest description we will emit for a *derived* fallback. Google renders
 * roughly 155–160 characters on desktop; anything past that is cut in the SERP.
 * Hand-written values are deliberately exempt — see `resolve.ts`.
 */
export const DESCRIPTION_MAX = 155;

/**
 * Where a value stops helping and starts getting cut off in search results.
 *
 * Shared by the admin's SEO form counters and its read-only SEO Details panel,
 * so the two never disagree about what "too long" means. `min` is the point
 * below which a field is too thin to earn a click. Advisory only — nothing here
 * blocks a save.
 */
export const TITLE_RANGE = { min: 25, max: 60 };
export const DESCRIPTION_RANGE = { min: 70, max: DESCRIPTION_MAX };

/**
 * Sitewide share image: 1200×630, the ratio every platform expects, written by
 * `npm run icons` (scripts/generate-icons.ts) from the logo. Keep it well under
 * ~300 KB — WhatsApp drops the preview for anything much larger.
 *
 * Its size is known, so `og:image:width`/`height` are declared for it. A
 * page-specific image could be any shape, and a platform told the wrong
 * dimensions lays out a broken card, so those tags are withheld for the rest.
 */
const DEFAULT_OG_IMAGE = { url: "/og-default.png", width: 1200, height: 630 };

/**
 * Appends the brand to a title unless it is already there.
 *
 * The guard matters because a hand-written title (registry default, or a
 * future admin override) often includes "Proc-Robot" already; a Next
 * `title.template` would have no way to tell and would double it.
 */
export function pageTitle(title: string): string {
  const trimmed = title.trim();
  return trimmed.toLowerCase().includes(SITE_NAME.toLowerCase())
    ? trimmed
    : `${trimmed} | ${SITE_NAME}`;
}

// Fallback chains (manual value → the row's own copy → a built-in default) are
// resolved by `resolve.ts`, which also reports *where* each value came from so
// the admin's Public SEO screen can show it. Static pages resolve through
// `static-page.ts`. There is deliberately no second way to resolve a value:
// two resolvers is how a route's `<meta>` and its JSON-LD `description` drift
// apart.

export type PageMetadataInput = {
  /**
   * Site-relative path of this page, used for the canonical and `og:url`.
   * Resolved against `metadataBase` into an absolute URL by Next.
   */
  path: string;
  title: string;
  description?: string | null;
  /**
   * Site-relative path to the share image. Must be the original file (e.g.
   * `/og-default.png`), never a `/_next/image?url=` URL —
   * crawlers and chat previews fetch these directly and the optimiser route
   * is not a stable, cacheable image endpoint for them.
   */
  image?: string | null;
  imageAlt?: string;
  ogType?: "website" | "article" | "profile";
  /** Only meaningful when `ogType` is "article". */
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  /** Keeps a page out of the index while still following its links. */
  noIndex?: boolean;
};

/**
 * Builds the complete metadata object for one page.
 *
 * Every public route goes through here, and the reason is Next's merge rule:
 * metadata is merged *shallowly*, so a page that defines `openGraph` replaces
 * the root layout's `openGraph` outright rather than extending it. A page that
 * set only `openGraph.title` would silently drop `og:site_name`, `og:locale`
 * and the fallback image. Composing the whole object in one function is what
 * guarantees every public route emits a full, consistent set of tags.
 */
export function buildMetadata({
  path,
  title,
  description,
  image,
  imageAlt,
  ogType = "website",
  publishedTime,
  modifiedTime,
  authors,
  noIndex,
}: PageMetadataInput): Metadata {
  const resolvedTitle = pageTitle(title);
  const desc = description?.trim() || undefined;

  const url = image?.trim();
  const ogImage = url
    ? { url, alt: imageAlt ?? resolvedTitle }
    : { ...DEFAULT_OG_IMAGE, alt: imageAlt ?? SITE_NAME };

  return {
    title: resolvedTitle,
    description: desc,
    // Resolved against metadataBase. Note that Next normalises the root to a
    // bare origin with no path ("https://proc-robot.com") and will not emit
    // "https://proc-robot.com/" even if handed that absolute URL. It is
    // sitemap.ts that matches this form, not the other way round.
    alternates: { canonical: path },
    openGraph: {
      type: ogType,
      url: path,
      siteName: SITE_NAME,
      title: resolvedTitle,
      description: desc,
      locale: "en_US",
      images: [ogImage],
      ...(ogType === "article" ? { publishedTime, modifiedTime, authors } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description: desc,
      images: [ogImage.url],
    },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}
