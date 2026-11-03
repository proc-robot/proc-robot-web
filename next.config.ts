import type { NextConfig } from "next";

/**
 * Response headers for every route.
 *
 * **No `Content-Security-Policy` yet, deliberately.** The app will talk to
 * Supabase (REST, Realtime websockets, Storage signed URLs) and redirect to
 * Stripe Checkout, and a policy written before those exist would either be
 * too loose to matter or break them in ways `npm run build` cannot catch. It
 * gets its own browser pass once those integrations land.
 *
 * **No `Strict-Transport-Security` either**: Vercel terminates TLS and sets
 * HSTS for its domains; the custom-domain setting belongs there.
 */
const SECURITY_HEADERS = [
  // Stops a browser from second-guessing our Content-Type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Full URL to our own pages, origin-only cross-site: enough for analytics to
  // attribute a referrer without leaking a path (e.g. a project id) to third parties.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing in the app is meant to be framed. `frame-ancestors` would be the
  // modern spelling, but it only exists inside a CSP (see above).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // The app asks for none of these. Stripe Checkout and the Customer Portal are
  // hosted pages we redirect to, so `payment=()` does not affect them.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
