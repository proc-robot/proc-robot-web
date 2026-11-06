import { expect, type APIRequestContext, type Page } from "@playwright/test";

/** Mailpit, where the local Supabase delivers auth emails. */
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

/** Saved sessions written by auth.setup.ts, one per seeded role. */
export const MEMBER_STATE = "playwright/.auth/member.json";
export const ADMIN_STATE = "playwright/.auth/admin.json";

type MailpitMessage = { ID: string; Created: string };

/**
 * The sign-in link from the newest email to `email` sent after `since`.
 * Polls, because delivery takes a moment.
 */
async function signInLinkFor(request: APIRequestContext, email: string, since: number) {
  const query = encodeURIComponent(`to:"${email}"`);
  for (let attempt = 0; attempt < 30; attempt++) {
    const search = await request.get(`${MAILPIT_URL}/api/v1/search?query=${query}`);
    const { messages } = (await search.json()) as { messages: MailpitMessage[] };
    const latest = messages.find((message) => Date.parse(message.Created) >= since - 2000);
    if (latest) {
      const message = await request.get(`${MAILPIT_URL}/api/v1/message/${latest.ID}`);
      const { HTML } = (await message.json()) as { HTML: string };
      const href = HTML.match(/href="([^"]*\/auth\/confirm\?[^"]*)"/)?.[1];
      if (href) return href.replaceAll("&amp;", "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `No sign-in email for ${email} in Mailpit (${MAILPIT_URL}). Is Supabase running?`,
  );
}

/** Signs in through the real flow: request a magic link, then open it. */
export async function signInWithEmail(page: Page, email: string) {
  const since = Date.now();
  await page.goto("/sign-in");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await page.goto(await signInLinkFor(page.request, email, since));
}

/** Signs up a new user and creates their organization in Singapore, on Starter (3 seats, 3 open projects). */
export async function signUpWithOrganization(page: Page, email: string, organization: string) {
  await signInWithEmail(page, email);
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Organization name").fill(organization);
  await page.getByRole("combobox", { name: "Country" }).click();
  await page.getByPlaceholder("Search countries…").fill("Singapore");
  await page.getByRole("option", { name: "Singapore" }).click();
  await page.getByRole("button", { name: "Create organization" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
