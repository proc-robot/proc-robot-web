import { expect, test } from "@playwright/test";
import { MEMBER_STATE, signInWithEmail } from "./support/auth";

test.describe("signed out", () => {
  test("protected pages send visitors to sign-in and back afterwards", async ({ page }) => {
    await page.goto("/projects?tab=open");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fprojects%3Ftab%3Dopen$/);
    await page.goto("/admin/seo");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fadmin%2Fseo$/);
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("the marketing site stays open and links to sign-in", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Sign in to Proc-Robot" })).toBeVisible();
  });

  test("sign-in offers only the email link while Google is off", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(0);
  });

  test("an invalid sign-in link explains itself", async ({ page }) => {
    await page.goto("/auth/confirm?token_hash=not-a-real-token&type=email");
    await expect(page).toHaveURL(/\/sign-in\?error=link$/);
    // Filtered: Next's route announcer is an alert too.
    await expect(
      page.getByRole("alert").filter({ hasText: "expired or was already used" }),
    ).toBeVisible();
  });
});

test("a new user signs up, creates an organization and signs out", async ({ page }) => {
  const id = Date.now();
  await signInWithEmail(page, `e2e-${id}@example.test`);

  // No organization yet: onboarding.
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Quotations for customers").check();
  await page.getByLabel("Organization name").fill(`E2E Trading ${id}`);
  await page.getByRole("combobox", { name: "Country" }).click();
  await page.getByPlaceholder("Search countries…").fill("Singapore");
  await page.getByRole("option", { name: "Singapore" }).click();
  // The currency follows the country.
  await expect(page.getByRole("combobox", { name: "Default currency" })).toContainText("SGD");
  await page.getByRole("button", { name: "Create organization" }).click();

  // The refreshed session carries the new org: straight into the workspace.
  await expect(page).toHaveURL(/\/dashboard$/);
  const account = page.getByRole("button", { name: /^Account:/ });
  await expect(account).toContainText(`E2E Trading ${id}`);

  await account.click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
});

test.describe("signed in as a member", () => {
  test.use({ storageState: MEMBER_STATE });

  test("sign-in and onboarding pass straight through to the workspace", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("the Super Admin console is closed to members", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
