import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests in `e2e/`, run against a production build (`next build` +
 * `next start`): static rendering, metadata and robots behave as they will
 * when deployed, which `next dev` does not reproduce.
 *
 * Port 3210 (override with `E2E_PORT`) so a running `npm run dev` on 3000 is
 * not in the way. Locally, a server already listening on that port is reused
 * without checking what it is, so keep the port free for this app; CI always
 * builds fresh.
 */
const PORT = Number(process.env.E2E_PORT ?? 3210);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
