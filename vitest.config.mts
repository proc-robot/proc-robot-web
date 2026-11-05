import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests: pure TypeScript (SEO, JSON-LD, formatting, form helpers, config
 * checks), run in Node. Browser behaviour is covered by Playwright in `e2e/`.
 * Component tests would add `jsdom` + Testing Library and a per-file
 * `// @vitest-environment jsdom` comment, when the first one is needed.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
