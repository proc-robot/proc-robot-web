import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

/**
 * The worker lives in its own repo, checked out next to this one
 * (../proc-robot-worker). Playwright starts it for the worker check;
 * override the location with WORKER_DIR.
 */
export const WORKER_DIR = process.env.WORKER_DIR ?? "../proc-robot-worker";
export const HAS_WORKER = existsSync(`${WORKER_DIR}/package.json`);

/**
 * The local stack's secret key, for the worker's Storage downloads (it reads
 * uploaded documents). CI passes it in WORKER_SUPABASE_SECRET_KEY; locally it
 * is read from `supabase status`.
 */
export function localSecretKey(): string | undefined {
  if (process.env.WORKER_SUPABASE_SECRET_KEY) return process.env.WORKER_SUPABASE_SECRET_KEY;
  try {
    const status = execSync("npx supabase status -o env", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return status.match(/^SECRET_KEY="?([^"\n]+)"?$/m)?.[1];
  } catch {
    return undefined;
  }
}
