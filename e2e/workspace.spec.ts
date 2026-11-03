import { expect, test } from "@playwright/test";

test.describe("workspace", () => {
  test("sidebar marks the current page and the section is not indexed", async ({ page }) => {
    await page.goto("/projects");

    const nav = page.getByRole("navigation", { name: "Workspace navigation" });
    await expect(nav.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "data-active",
      "true",
    );
    // Later-phase entries are shown but not linked.
    await expect(nav.getByRole("link", { name: "Marketplace" })).toHaveCount(0);
    await expect(page).toHaveTitle("Projects · Proc-Robot");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
  });

  test("the number & date format can be switched and is remembered", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Number and date format: United States" }).click();
    const indonesia = page.getByRole("menuitemradio", { name: /Indonesia/ });
    await expect(indonesia).toContainText("USD 1.234,50 · 4 Nov 2026");
    await indonesia.click();

    await expect(
      page.getByRole("button", { name: "Number and date format: Indonesia" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Number and date format: Indonesia" }),
    ).toBeVisible();
    // The UI itself stays English.
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  });

  test("the Super Admin console shares the same format preference", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: "format_locale", value: "en-ID", url: baseURL! }]);
    await page.goto("/admin/seo");

    await expect(page.getByRole("navigation", { name: "Super Admin navigation" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Home", exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Number and date format: Indonesia" }),
    ).toBeVisible();
  });
});

test.describe("workspace on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the sidebar opens as a sheet", async ({ page }) => {
    await page.goto("/projects");
    const nav = page.getByRole("navigation", { name: "Workspace navigation" });
    await expect(nav).toBeHidden();

    await page.getByRole("button", { name: "Toggle Sidebar" }).click();
    await expect(nav.getByRole("link", { name: "Customers" })).toBeVisible();
    await nav.getByRole("link", { name: "Customers" }).click();
    await expect(page).toHaveURL(/\/customers$/);
  });
});
