import { expect, test } from "@playwright/test";

/** `@type`s per JSON-LD block on the page, e.g. [["Organization","WebSite"],["WebPage"]]. */
async function jsonLdTypes(page: import("@playwright/test").Page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((text) =>
    (JSON.parse(text)["@graph"] as { "@type": string }[]).map((node) => node["@type"]),
  );
}

test.describe("public site", () => {
  test("home page has its metadata and structured data", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://proc-robot.com",
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/og-default\.png$/,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    expect(await jsonLdTypes(page)).toEqual([["Organization", "WebSite"], ["WebPage"]]);
  });

  test("robots.txt blocks crawling unless SITE_INDEXABLE is set", async ({ request }) => {
    const body = await (await request.get("/robots.txt")).text();
    expect(body).toContain("Disallow: /");
  });

  test("sitemap lists the registry pages", async ({ request }) => {
    const body = await (await request.get("/sitemap.xml")).text();
    expect(body).toContain("<loc>https://proc-robot.com</loc>");
  });

  test("unknown URLs return a 404 that is not indexed", async ({ page }) => {
    const response = await page.goto("/does-not-exist");
    expect(response?.status()).toBe(404);
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveCount(1);
    await expect(robots).toHaveAttribute("content", "noindex");
  });
});
