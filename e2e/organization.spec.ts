import { expect, test, type Page } from "@playwright/test";
import { MEMBER_STATE, signUpWithOrganization } from "./support/auth";

async function invite(page: Page, email: string, role: "Member" | "Admin" = "Member") {
  await page.getByLabel("Email address").fill(email);
  if (role === "Admin") {
    await page.getByRole("combobox", { name: "Role" }).click();
    await page.getByRole("option", { name: "Admin" }).click();
  }
  await page.getByRole("button", { name: "Invite", exact: true }).click();
  await expect(page.getByRole("button", { name: `Revoke invite to ${email}` })).toBeVisible();
}

async function deleteOrganization(page: Page, name: string) {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Delete organization" }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByLabel("Organization name").fill(name);
  await dialog.getByRole("button", { name: "Delete organization" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole("heading", { name: `${name} was deleted` })).toBeVisible();
}

test("an Owner fills the seats, sets the defaults, then deletes the organization and the account", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const id = Date.now();
  const email = `e2e-owner-${id}@example.test`;
  const organization = `E2E Owner Co ${id}`;
  await signUpWithOrganization(page, email, organization);

  // Members (T1.1.5): Starter has 3 seats, and pending invites hold one each.
  await page.goto("/settings/members");
  await expect(page.getByText("1 of 3 seats used")).toBeVisible();
  await invite(page, `e2e-a-${id}@example.test`);
  await invite(page, `e2e-b-${id}@example.test`, "Admin");
  await expect(page.getByText("All seats are taken")).toBeVisible();
  await expect(page.getByRole("button", { name: "Invite", exact: true })).toBeDisabled();

  // Revoking an invite frees its seat.
  await page.getByRole("button", { name: `Revoke invite to e2e-a-${id}@example.test` }).click();
  await expect(page.getByText("2 of 3 seats used")).toBeVisible();
  await expect(page.getByRole("button", { name: "Invite", exact: true })).toBeEnabled();

  // Pricing & documents (T1.1.6): checked as you type, saved, and kept.
  await page.goto("/settings/defaults");
  await page.getByLabel("Tax rate").fill("9");
  await page.getByLabel("Sales quotations").fill("E2E-QUO-{YYYY}-{NNNN}");
  await expect(page.getByText(/Next: E2E-QUO-\d{4}-0001/)).toBeVisible();
  await page.getByLabel("RFQs", { exact: true }).fill("RFQ {NNNN}");
  await page.getByRole("button", { name: "Save defaults" }).click();
  await expect(page.getByText(/include a counter such as/)).toBeVisible();
  await page.getByLabel("RFQs", { exact: true }).fill("E2E-RFQ-{NNNN}");
  await page.getByRole("button", { name: "Save defaults" }).click();
  await expect(page.getByText("Defaults saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Tax rate")).toHaveValue("9");

  // Public profile (T1.1.4): WhatsApp must carry its country code.
  await page.goto("/settings/public-profile");
  await page.getByLabel("WhatsApp number").fill("6591234567");
  await page.getByRole("button", { name: "Save public profile" }).click();
  await expect(page.getByText(/with its country code/).first()).toBeVisible();
  await page.getByLabel("WhatsApp number").fill("+65 9123 4567");
  await page.getByRole("button", { name: "Save public profile" }).click();
  await expect(page.getByText("Public profile saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("WhatsApp number")).toHaveValue("+6591234567");

  // The activity feed (T1.1.7) shows what happened.
  await page.goto("/dashboard");
  const activity = page.getByRole("region", { name: "Team activity" });
  await expect(activity.getByText(`invited e2e-b-${id}@example.test as an Admin`)).toBeVisible();
  await expect(activity.getByText(`revoked the invite for e2e-a-${id}@example.test`)).toBeVisible();

  // An Owner cannot delete their account while the organization is active.
  await page.goto("/account");
  await expect(page.getByRole("button", { name: "Delete my account" })).toBeDisabled();

  // Deleting the organization (T1.1.8) can be undone for 30 days.
  await deleteOrganization(page, organization);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole("button", { name: "Restore organization" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("region", { name: "Team activity" }).getByText("restored the organization"),
  ).toBeVisible();

  // Once it is deleted, the Owner may delete their account (T1.1.3).
  await deleteOrganization(page, organization);
  await page.getByRole("button", { name: "Delete my account instead" }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.getByLabel("Your email address").fill(email);
  await dialog.getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL(/\/sign-in\?account=deleted$/);
  await expect(
    page.getByRole("status").filter({ hasText: "Your account was deleted." }),
  ).toBeVisible();
});

test.describe("as a member of Kigen", () => {
  test.use({ storageState: MEMBER_STATE });

  test("sees the team and the settings, but cannot change them", async ({ page }) => {
    await page.goto("/settings/members");
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    const members = page.getByRole("region", { name: /^Members/ });
    await expect(members.getByText("leo@kigen.test")).toBeVisible();
    await expect(members.getByText("Owner")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Invite people" })).toHaveCount(0);

    await page.goto("/settings/defaults");
    await expect(
      page.getByText("Only the Owner and Admins can change these settings."),
    ).toBeVisible();
    await expect(page.getByLabel("Tax rate")).toHaveValue("9");
    await expect(page.getByLabel("Tax rate")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Save defaults" })).toHaveCount(0);
  });

  // Ratna's home view starts as "quotations" (seed.sql); the test puts it back.
  test("saves their profile from the account page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /^Account:/ }).click();
    await page.getByRole("menuitem", { name: "Your account" }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByLabel("Name")).toHaveValue("Ratna Sari");

    await page.getByLabel("Both").check();
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Both")).toBeChecked();

    await page.getByLabel("Quotations for customers").check();
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved.")).toBeVisible();
  });
});
