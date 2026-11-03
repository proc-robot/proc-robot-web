/**
 * JSON-LD builders — one per page template.
 *
 * A builder takes values a page already has and returns the single `@graph`
 * object that page renders through `<JsonLd>`. They are pure: no builder
 * fetches data, so emitting markup never costs a page an extra round trip.
 */

export { JsonLd } from "@/components/shared/JsonLd";

export {
  ORG_ID,
  WEBSITE_ID,
  breadcrumb,
  collectionPage,
  compactDeep,
  faqPage,
  graph,
  imageUrl,
  imageUrls,
  isoInstant,
  pageId,
  pageUrl,
  ref,
  type Crumb,
  type JsonLdNode,
} from "./core";

export { orgGraph } from "./organization";
export { archiveGraph, breadcrumbOnlyGraph, webPageGraph, type WebPageType } from "./page";
