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
 *
 * Needs the local Supabase stack (`npm run db:start`): `auth.setup.ts` signs
 * the seeded users in through real magic links, read from Mailpit, and saves
 * their sessions for the specs. Supabase only redirects to ports on its
 * allow list (supabase/config.toml), so a different E2E_PORT must be added
 * there too.
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
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"] },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
