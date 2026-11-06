import { NextResponse } from "next/server";
import { saveFormatCookies } from "@/lib/format-cookies";
import { createClient } from "@/lib/supabase/server";
import { hasOrganization, type AuthClaims } from "./claims";
import { ONBOARDING_PATH, SIGN_IN_PATH, safeNextPath } from "./routes";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * After /auth/callback or /auth/confirm has created the session: copy the
 * user's number & date format and time zone from their profile into the
 * cookies the formatter reads, then send them on — to onboarding if they have no
 * organization yet.
 */
export async function finishSignIn(supabase: Supabase, request: Request, next: string | null) {
  const { data } = await supabase.auth.getClaims();
  const claims = (data?.claims ?? null) as AuthClaims | null;
  if (!claims) return failSignIn(request);

  const { data: profile } = await supabase
    .from("profiles")
    .select("format_locale, timezone")
    .eq("id", claims.sub)
    .single();
  if (profile) {
    await saveFormatCookies({ locale: profile.format_locale, timeZone: profile.timezone });
  }

  const destination = hasOrganization(claims) ? safeNextPath(next) : ONBOARDING_PATH;
  return NextResponse.redirect(new URL(destination, request.url));
}

/** Back to sign-in with a message (an expired or already-used link, a cancelled Google sign-in). */
export function failSignIn(request: Request) {
  return NextResponse.redirect(new URL(`${SIGN_IN_PATH}?error=link`, request.url));
}
