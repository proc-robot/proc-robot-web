/**
 * `Organization` + `WebSite` — emitted on every public page, exactly once.
 *
 * They live in the `(public)` layout, so every other builder can reference the
 * organisation by `@id` (`publisher`, `provider`, `about`) without restating it.
 */

import { ORG_ID, WEBSITE_ID, graph, imageUrl, pageUrl, type JsonLdNode } from "./core";

/**
 * Describes the company, not a page — the same wherever it appears. Keep it in
 * step with the positioning in CORE_FEATURES.md.
 */
const ORG_DESCRIPTION =
  "Proc-Robot is an AI-powered procurement and quotation platform: it turns specification documents into supplier prices, margins and professional RFQs and quotations.";

/** Spelling variants people actually search for. */
const ORG_ALTERNATE_NAMES = ["Proc Robot", "ProcRobot"];

/**
 * The square brand mark at its real size (written by `npm run icons`). Google
 * wants a logo of at least 112×112; a square mark avoids the cropping a wide
 * wordmark gets.
 */
const LOGO = { url: "/icon-512.png", width: 512, height: 512 };

/**
 * Company facts that are deliberately **absent** until they are real:
 * `address`, `telephone`, `email`, `contactPoint` and `sameAs` (social
 * profiles). The legal entity (a Singapore Pte Ltd) is set up after the MVP —
 * see PLAN.md → Decisions Log. Publishing a placeholder contact tells every
 * search engine and AI assistant something false, which is worse than saying
 * nothing; `compactDeep` drops a key the moment its value is empty, so adding
 * the real value later is a one-line change.
 */
export function orgGraph(): Record<string, unknown> {
  const organization: JsonLdNode = {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "Proc-Robot",
    alternateName: ORG_ALTERNATE_NAMES,
    url: pageUrl("/"),
    logo: {
      "@type": "ImageObject",
      url: imageUrl(LOGO.url),
      width: LOGO.width,
      height: LOGO.height,
    },
    description: ORG_DESCRIPTION,
  };

  const website: JsonLdNode = {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: pageUrl("/"),
    name: "Proc-Robot",
    inLanguage: "en",
    publisher: { "@id": ORG_ID },
  };

  return graph(organization, website);
}
