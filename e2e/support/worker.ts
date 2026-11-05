import { existsSync } from "node:fs";

/**
 * The worker lives in its own repo, checked out next to this one
 * (../proc-robot-worker). Playwright starts it for the worker check;
 * override the location with WORKER_DIR.
 */
export const WORKER_DIR = process.env.WORKER_DIR ?? "../proc-robot-worker";
export const HAS_WORKER = existsSync(`${WORKER_DIR}/package.json`);
