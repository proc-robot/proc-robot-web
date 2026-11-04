import { defineConfig, devices } from "@playwright/test";
import { HAS_WORKER, WORKER_DIR } from "./e2e/support/worker";

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
  webServer: [
    {
      command: `npm run build && npm run start -- --port ${PORT}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
    // The background worker (the sibling repo), for the worker check
    // (T0.6.8). Connects as procrobot_worker with the local password from
    // supabase/seed.sql. Without the repo next to this one, e2e/worker.spec.ts
    // is skipped.
    ...(HAS_WORKER
      ? [
          {
            command: `npm --prefix ${WORKER_DIR} run build && npm --prefix ${WORKER_DIR} start`,
            url: "http://localhost:3299/health",
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
            env: {
              HEALTH_PORT: "3299",
              WORKER_ID: "e2e-worker",
              POLL_SECONDS: "1",
              DATABASE_URL:
                process.env.WORKER_DATABASE_URL ??
                "postgresql://procrobot_worker:worker-local@127.0.0.1:54322/postgres",
            },
          },
        ]
      : []),
  ],
});
