import { NextResponse, type NextRequest } from "next/server";
import { hasOrganization, isSuperAdmin } from "@/lib/auth/claims";
import {
  HOME_PATH,
  ONBOARDING_PATH,
  SIGN_IN_PATH,
  routeKind,
  safeNextPath,
} from "@/lib/auth/routes";
import { updateSession, withSessionCookies } from "@/lib/supabase/proxy";

/**
 * The auth guard (TASKS.md T0.3.6), run before every matched request.
 * It must live in src/ (next to app/) — Next 16 ignores a proxy.ts at the
 * repo root.
 *
 * - Marketing pages: untouched (no Supabase call, still static).
 * - Workspace: signed in, with an organization — otherwise sign-in or
 *   onboarding.
 * - /admin: signed in as a Super Admin — other users go to their dashboard.
 * - /sign-in and /onboarding: skipped when there is nothing left to do.
 *
 * This is the first line only. Layouts check again (src/lib/auth/session.ts),
 * every Server Action checks for itself, and RLS guards the data.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const kind = routeKind(pathname);
  if (kind === "public") return NextResponse.next();

  const { response, claims } = await updateSession(request);
  const redirect = (path: string) =>
    withSessionCookies(NextResponse.redirect(new URL(path, request.url)), response);
  const signIn = () =>
    redirect(`${SIGN_IN_PATH}?next=${encodeURIComponent(safeNextPath(pathname + search))}`);

  switch (kind) {
    case "workspace":
      if (!claims) return signIn();
      if (!hasOrganization(claims)) return redirect(ONBOARDING_PATH);
      return response;
    case "admin":
      if (!claims) return signIn();
      if (!isSuperAdmin(claims)) return redirect(HOME_PATH);
      return response;
    case "onboarding":
      if (!claims) return signIn();
      if (hasOrganization(claims)) return redirect(HOME_PATH);
      return response;
    case "sign-in":
      if (claims) {
        const next = safeNextPath(request.nextUrl.searchParams.get("next"));
        return redirect(hasOrganization(claims) ? next : ONBOARDING_PATH);
      }
      return response;
    default:
      // /auth/* finishes a sign-in; it only needs the session refresh.
      return response;
  }
}

export const config = {
  matcher: [
    // Everything except Next's assets and the site's static files.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};
