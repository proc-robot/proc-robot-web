import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { failSignIn, finishSignIn } from "@/lib/auth/finish-sign-in";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link emails land here with a token hash (supabase/templates/*.html).
 * Verifying the hash creates the session, in whichever browser opened the
 * link.
 */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  if (!tokenHash || !type) return failSignIn(request);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return failSignIn(request);

  return finishSignIn(supabase, request, null);
}
