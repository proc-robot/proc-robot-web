import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FORMAT_LOCALE_COOKIE, isFormatLocale } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { hasOrganization, type AuthClaims } from "./claims";
import { ONBOARDING_PATH, SIGN_IN_PATH, safeNextPath } from "./routes";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * After /auth/callback or /auth/confirm has created the session: copy the
 * user's number & date format from their profile into the cookie the
 * formatter reads, then send them on — to onboarding if they have no
 * organization yet.
 */
export async function finishSignIn(supabase: Supabase, request: Request, next: string | null) {
  const { data } = await supabase.auth.getClaims();
  const claims = (data?.claims ?? null) as AuthClaims | null;
  if (!claims) return failSignIn(request);

  const { data: profile } = await supabase
    .from("profiles")
    .select("format_locale")
    .eq("id", claims.sub)
    .single();
  if (profile && isFormatLocale(profile.format_locale)) {
    (await cookies()).set(FORMAT_LOCALE_COOKIE, profile.format_locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  const destination = hasOrganization(claims) ? safeNextPath(next) : ONBOARDING_PATH;
  return NextResponse.redirect(new URL(destination, request.url));
}

/** Back to sign-in with a message (an expired or already-used link, a cancelled Google sign-in). */
export function failSignIn(request: Request) {
  return NextResponse.redirect(new URL(`${SIGN_IN_PATH}?error=link`, request.url));
}
