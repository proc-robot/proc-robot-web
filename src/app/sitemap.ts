import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrl } from "@/lib/site-url";
import { STATIC_PAGE_SEO_DEFS } from "@/lib/page-seo-registry";

/**
 * Absolute URL for a sitemap entry.
 *
 * The homepage is the bare origin, not `origin + "/"`. Next normalises the root
 * canonical to the bare form and will not emit a trailing slash even when
 * handed one, so matching it here keeps canonical and sitemap byte-identical —
 * a crawl that diffs the two would otherwise report the homepage as a
 * canonical mismatch.
 */
function pageUrl(path: string): string {
  return path === "/" ? siteUrl() : absoluteUrl(path);
}

/**
 * Every public page, from the registry.
 *
 * Two rules every entry must keep:
 *
 * - **Every URL returns 200** — never a 404, a redirect or a noindexed page.
 *   That is why a registry entry is only added once its page exists.
 * - **`lastModified` is only ever a real timestamp.** The marketing pages are
 *   code, not table rows, so they get none. Google discounts a lastmod it finds
 *   untrustworthy, and an invented one would cost us the genuine ones later.
 *
 * When a database-backed public page type arrives (e.g. a blog), add its rows
 * here with a filter that mirrors the page's own publish guard, and use the
 * row's `updated_at` as `lastModified`:
 *
 *   const detail = (prefix: string, rows: { slug: string; updated_at: string }[]) =>
 *     rows.map((row) => ({ url: pageUrl(`${prefix}/${row.slug}`), lastModified: row.updated_at }));
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_PAGE_SEO_DEFS.map((def) => ({ url: pageUrl(def.path) }));
}
