/**
 * Builders for the public (marketing) pages.
 *
 * Each takes values the page already has — its resolved name/description from
 * `staticPageSeo(key)` — and returns the page's single `@graph`. Add a builder
 * here when a page type needs more than these (e.g. a pricing page's
 * `SoftwareApplication` + `Offer`s, built from the same plan rows the page
 * renders).
 */

import {
  ORG_ID,
  WEBSITE_ID,
  breadcrumb,
  collectionPage,
  faqPage,
  graph,
  pageId,
  pageUrl,
  ref,
  type Crumb,
} from "./core";

/** schema.org page types the generic builder may emit. */
export type WebPageType = "WebPage" | "AboutPage" | "ContactPage";

/**
 * A plain page: `WebPage` (or `AboutPage` / `ContactPage`), plus an optional
 * `FAQPage` and the breadcrumb.
 *
 * The homepage passes no crumbs — a breadcrumb of just "Home" says nothing.
 * Only pass `faqs` the page actually renders (with the `forceMount` accordion),
 * never extra questions for the markup's sake.
 */
export function webPageGraph({
  type = "WebPage",
  path,
  name,
  description,
  crumbs = [],
  faqs = [],
}: {
  type?: WebPageType;
  path: string;
  name: string;
  description?: string | null;
  /** Steps after Home; the last one carries no `path`. */
  crumbs?: Crumb[];
  faqs?: { question: string; answer: string }[];
}): Record<string, unknown> {
  return graph(
    {
      "@type": type,
      "@id": pageId(path),
      url: pageUrl(path),
      name,
      description,
      inLanguage: "en",
      isPartOf: ref(WEBSITE_ID),
      about: ref(ORG_ID),
    },
    faqPage(faqs),
    crumbs.length > 0 ? breadcrumb(...crumbs) : undefined,
  );
}

/** Breadcrumbs only, for a page with no richer type worth marking up. */
export function breadcrumbOnlyGraph(...crumbs: Crumb[]): Record<string, unknown> {
  return graph(breadcrumb(...crumbs));
}

/** An archive page (e.g. a future blog index) — CollectionPage + breadcrumb. */
export function archiveGraph({
  path,
  name,
  description,
  crumbName,
  items,
}: {
  path: string;
  name: string;
  description?: string | null;
  crumbName: string;
  items: { name: string; path: string }[];
}): Record<string, unknown> {
  return graph(
    collectionPage({ path, name, description, items }),
    breadcrumb({ name: crumbName }),
  );
}
