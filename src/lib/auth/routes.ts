/**
 * Which part of the app a path belongs to, for the guard in src/proxy.ts.
 * Pure functions (no Next or Supabase imports), so the proxy stays light and
 * the rules are unit-tested (routes.test.ts checks every sidebar entry).
 */

export const SIGN_IN_PATH = "/sign-in";
export const ONBOARDING_PATH = "/onboarding";
export const HOME_PATH = "/dashboard";

/**
 * Workspace sections. Paths carry no prefix (the workspace moves to
 * app.proc-robot.com), so each one is listed. A new workspace page must be
 * covered here — routes.test.ts fails otherwise.
 */
export const WORKSPACE_PREFIXES = [
  "/dashboard",
  "/projects",
  "/documents",
  "/customers",
  "/suppliers",
  "/saleable-items",
  "/marketplace",
  "/quote-requests",
  "/templates",
  "/billing",
  "/settings",
  "/account",
] as const;

export type RouteKind =
  "public" | "auth-callback" | "sign-in" | "onboarding" | "workspace" | "admin";

const under = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export function routeKind(pathname: string): RouteKind {
  if (under(pathname, "/admin")) return "admin";
  if (under(pathname, "/auth")) return "auth-callback";
  if (under(pathname, SIGN_IN_PATH)) return "sign-in";
  if (under(pathname, ONBOARDING_PATH)) return "onboarding";
  if (WORKSPACE_PREFIXES.some((prefix) => under(pathname, prefix))) return "workspace";
  // The marketing site, its files and unknown paths (which 404 as usual).
  return "public";
}

/**
 * A safe place to send the user after sign-in: a path on this site only.
 * Rejects absolute URLs and protocol-relative tricks ("//evil.example",
 * "/\\evil.example") that browsers would treat as another origin.
 */
export function safeNextPath(
  value: string | null | undefined,
  fallback: string = HOME_PATH,
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  try {
    const url = new URL(value, "http://proc-robot.local");
    return url.origin === "http://proc-robot.local" ? `${url.pathname}${url.search}` : fallback;
  } catch {
    return fallback;
  }
}
