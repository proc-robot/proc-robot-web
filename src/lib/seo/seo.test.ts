import { describe, expect, it } from "vitest";
import { STATIC_PAGE_SEO_DEFS } from "@/lib/page-seo-registry";
import { compactDeep, graph, pageUrl } from "@/lib/schema/core";
import { buildMetadata, DESCRIPTION_RANGE, pageTitle, TITLE_RANGE } from "./metadata";

describe("pageTitle", () => {
  it("adds the site name once", () => {
    expect(pageTitle("Pricing")).toBe("Pricing | Proc-Robot");
    expect(pageTitle("Proc-Robot — AI Procurement")).toBe("Proc-Robot — AI Procurement");
  });
});

describe("buildMetadata", () => {
  it("emits a complete, consistent set of tags", () => {
    const metadata = buildMetadata({ path: "/pricing", title: "Pricing", description: " Plans " });
    expect(metadata.alternates).toEqual({ canonical: "/pricing" });
    expect(metadata.description).toBe("Plans");
    expect(metadata.openGraph).toMatchObject({
      url: "/pricing",
      siteName: "Proc-Robot",
      title: "Pricing | Proc-Robot",
      images: [{ url: "/og-default.png", width: 1200, height: 630 }],
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
    expect(metadata.robots).toBeUndefined();
  });

  it("keeps a page out of the index on request", () => {
    expect(buildMetadata({ path: "/x", title: "X", noIndex: true }).robots).toEqual({
      index: false,
      follow: true,
    });
  });
});

describe("JSON-LD", () => {
  it("never emits empty values", () => {
    expect(
      compactDeep({
        "@type": "Organization",
        name: " ",
        sameAs: [],
        logo: { "@type": "ImageObject" },
      }),
    ).toBeUndefined();
    expect(graph({ "@type": "WebPage", name: "Home", description: null })).toEqual({
      "@context": "https://schema.org",
      "@graph": [{ "@type": "WebPage", name: "Home" }],
    });
  });

  it("uses the bare origin for the home page", () => {
    expect(pageUrl("/")).toBe("https://proc-robot.com");
    expect(pageUrl("/pricing")).toBe("https://proc-robot.com/pricing");
  });
});

describe("static page registry", () => {
  it.each(STATIC_PAGE_SEO_DEFS.map((def) => [def.key, def] as const))(
    "%s has a title and description within the recommended lengths",
    (_key, def) => {
      const title = pageTitle(def.defaultTitle);
      expect(title.length).toBeGreaterThanOrEqual(TITLE_RANGE.min);
      expect(title.length).toBeLessThanOrEqual(TITLE_RANGE.max);
      expect(def.defaultDescription.length).toBeGreaterThanOrEqual(DESCRIPTION_RANGE.min);
      expect(def.defaultDescription.length).toBeLessThanOrEqual(DESCRIPTION_RANGE.max);
    },
  );
});
