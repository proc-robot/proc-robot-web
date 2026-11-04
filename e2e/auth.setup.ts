import { expect, test as setup } from "@playwright/test";
import { ADMIN_STATE, MEMBER_STATE, signInWithEmail } from "./support/auth";

/**
 * Signs in the seeded users once per run (supabase/seed.sql) and saves their
 * sessions for the specs that need one. Needs the local Supabase stack:
 * `npm run db:start`.
 */
setup("sign in as Ratna, a member of Kigen", async ({ page }) => {
  await signInWithEmail(page, "ratna@kigen.test");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.context().storageState({ path: MEMBER_STATE });
});

setup("sign in as the Super Admin", async ({ page }) => {
  await signInWithEmail(page, "admin@proc-robot.test");
  // Platform staff belong to no organization, so sign-in ends at onboarding.
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.context().storageState({ path: ADMIN_STATE });
});
