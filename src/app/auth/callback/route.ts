import type { NextRequest } from "next/server";
import { failSignIn, finishSignIn } from "@/lib/auth/finish-sign-in";
import { createClient } from "@/lib/supabase/server";

/**
 * Google sign-in returns here with a one-time code (PKCE). One of the two
 * Route Handlers in the app; both only finish a sign-in.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return failSignIn(request);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return failSignIn(request);

  return finishSignIn(supabase, request, request.nextUrl.searchParams.get("next"));
}
