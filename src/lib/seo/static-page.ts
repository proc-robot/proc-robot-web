import type { Metadata } from "next";
import type { StaticPageSeoKey } from "@/lib/page-seo-registry";
import { STATIC_PAGE_SEO_BY_KEY } from "@/lib/page-seo-registry";
import { buildMetadata } from "./metadata";
import {
  required,
  resolveSeoDescription,
  resolveSeoImage,
  resolveSeoTitle,
  type ResolvedSeo,
  type ResolvedSeoText,
} from "./resolve";

/** A page's resolved SEO values, each with its provenance. */
export type EntitySeo = {
  /** Always present: every chain ends at a required title. */
  title: ResolvedSeoText;
  description: ResolvedSeo;
  image: ResolvedSeo;
};

/**
 * Resolved title/description/image for one public page, with provenance.
 *
 * Public pages are code-defined: the values come from
 * `src/lib/page-seo-registry.ts`, so every source reads "Default". This is the
 * single resolution behind the page's `<title>`/`<meta>` (`staticPageMetadata`),
 * its JSON-LD name/description (`staticPageSeo`) and the admin's Public SEO
 * screen — they cannot disagree because there is nothing else to read.
 *
 * A database override (a `page_seo` row typed into an admin form) would be
 * added as the first candidate of each chain; nothing else would change.
 */
export function staticPageSeoValues(key: StaticPageSeoKey): EntitySeo {
  const def = STATIC_PAGE_SEO_BY_KEY[key];
  const builtIn = (value: string) => ({ label: "Built-in default", value, isDefault: true });

  return {
    title: required(resolveSeoTitle(builtIn(def.defaultTitle)), def.defaultTitle),
    description: resolveSeoDescription(builtIn(def.defaultDescription)),
    // No per-page image yet: buildMetadata falls back to /og-default.png.
    image: resolveSeoImage(),
  };
}

/**
 * The page's own name and description, for its JSON-LD.
 *
 * Reads the same resolution as `staticPageMetadata`, so a page's markup and its
 * `<title>`/`<meta>` are always the same strings. The title keeps its brand
 * suffix out of it: `pageTitle()` adds that for the `<title>` tag, while schema
 * `name` wants the page's own name.
 */
export function staticPageSeo(key: StaticPageSeoKey): {
  name: string;
  description: string | undefined;
} {
  const seo = staticPageSeoValues(key);
  return { name: seo.title.value, description: seo.description.value };
}

/**
 * Metadata for one public page.
 *
 * Every public page routes through here, so a change to the tag set — a new OG
 * field, a different truncation rule — lands on all of them at once.
 */
export function staticPageMetadata(key: StaticPageSeoKey): Metadata {
  const seo = staticPageSeoValues(key);

  return buildMetadata({
    path: STATIC_PAGE_SEO_BY_KEY[key].path,
    title: seo.title.value,
    description: seo.description.value,
    image: seo.image.value,
  });
}
