/**
 * The public (marketing) pages and their SEO defaults — the one place a public
 * page's title and description are written.
 *
 * Every entry here is listed in the sitemap, so **an entry must only exist
 * once its page does** and returns 200 (a sitemap URL that 404s is a crawl
 * error). Adding a public page is: its `page.tsx`, an entry here, and a JSON-LD
 * builder call in the page — the sitemap and the admin's Public SEO screen
 * pick it up from this list.
 *
 * `defaultTitle` omits the "| Proc-Robot" suffix; `pageTitle()` adds it, and
 * skips titles that already name the brand. Write each title and description
 * to stand on its own in a search result: they are checked against
 * `TITLE_RANGE` / `DESCRIPTION_RANGE` (src/lib/seo/metadata.ts) on /admin/seo.
 *
 * Planned entries (TASKS.md T1.13.4; TASKS_SECONDARY.md T4.4.1): pricing, contact, privacy, terms.
 */
export const STATIC_PAGE_SEO_DEFS = [
  {
    key: "home",
    label: "Home",
    path: "/",
    defaultTitle: "Proc-Robot — AI Procurement & Quotation Platform",
    defaultDescription:
      "Turn specification documents into supplier prices, margins and professional RFQs and quotations — in your own company templates.",
  },
] as const;

export type StaticPageSeoKey = (typeof STATIC_PAGE_SEO_DEFS)[number]["key"];

export const STATIC_PAGE_SEO_BY_KEY = Object.fromEntries(
  STATIC_PAGE_SEO_DEFS.map((def) => [def.key, def]),
) as Record<StaticPageSeoKey, (typeof STATIC_PAGE_SEO_DEFS)[number]>;

/** Narrows a URL segment (e.g. `/admin/seo/[key]`) to a registry key. */
export function isStaticPageSeoKey(value: string): value is StaticPageSeoKey {
  return value in STATIC_PAGE_SEO_BY_KEY;
}
