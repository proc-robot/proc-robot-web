import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { AuthClaims } from "@/lib/auth/claims";
import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

/**
 * Refreshes the Supabase session for this request (src/proxy.ts calls it).
 * New tokens are written to the request (so Server Components see them) and
 * to the response (so the browser keeps them). Returns the verified claims,
 * or null when nobody is signed in.
 *
 * Any response built from here on must carry `response`'s cookies — see
 * `withSessionCookies()` — or the browser and server fall out of sync and
 * the user is signed out.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Nothing may run between creating the client and getClaims(): it is what
  // refreshes an expiring session.
  const { data } = await supabase.auth.getClaims();
  const claims = (data?.claims ?? null) as AuthClaims | null;

  return { response, claims };
}

/** Copies the session cookies (and cache headers) onto another response, e.g. a redirect. */
export function withSessionCookies(target: NextResponse, source: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  const cacheControl = source.headers.get("cache-control");
  if (cacheControl) target.headers.set("cache-control", cacheControl);
  return target;
}
