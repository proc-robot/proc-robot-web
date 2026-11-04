import { expect, test } from "@playwright/test";
import { MEMBER_STATE } from "./support/auth";
import { HAS_WORKER, WORKER_DIR } from "./support/worker";

/**
 * T0.6.8 end to end: the dashboard's check goes RPC → queue → worker (the
 * sibling repo, started by playwright.config.ts) → ai_jobs → Realtime → the
 * card.
 */
test.use({ storageState: MEMBER_STATE });
test.skip(!HAS_WORKER, `The worker repo is not at ${WORKER_DIR}`);

test("a background job runs on the worker and reports back live", async ({ page }) => {
  await page.goto("/dashboard");
  const card = page.getByRole("region", { name: "System check: background jobs" });
  await card.getByRole("button", { name: "Run check" }).click();

  await expect(card.getByText(/Background jobs work\. Round trip/)).toBeVisible({
    timeout: 20_000,
  });
  await expect(card.getByRole("button", { name: "Run again" })).toBeEnabled();
});
