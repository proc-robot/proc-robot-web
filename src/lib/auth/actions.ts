"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { actionError, actionOk, invalidInput, type ActionResult } from "@/lib/forms/action-result";
import { createClient } from "@/lib/supabase/server";
import { googleSignInEnabled } from "./features";
import { HOME_PATH, SIGN_IN_PATH, safeNextPath } from "./routes";
import { requireUser } from "./session";
import { magicLinkSchema, type MagicLinkInput } from "./schemas";

/**
 * The origin the user is on (localhost:3000, the e2e server, production), so
 * Supabase sends them back to the same place. Supabase only redirects to
 * URLs on its allow list (config.toml / Auth → URL Configuration), so a
 * forged header cannot send anyone elsewhere.
 */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/**
 * Starts Google sign-in (A1); Google sends the user back to /auth/callback.
 * Refused while the flag is off (until Phase 4), so the action can't be called
 * directly when the button is hidden.
 */
export async function signInWithGoogle(next?: string): Promise<ActionResult> {
  if (!googleSignInEnabled()) {
    return actionError("Google sign-in is not available. Use the email link instead.");
  }
  const supabase = await createClient();
  const callback = new URL("/auth/callback", await requestOrigin());
  callback.searchParams.set("next", safeNextPath(next));

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });
  if (error || !data.url) {
    return actionError("Google sign-in is not available right now. Use the email link instead.");
  }
  redirect(data.url);
}

/**
 * Emails a sign-in link (A2). New addresses get an account on first use.
 * The link goes to /auth/confirm, which works in any browser.
 */
export async function sendMagicLink(input: MagicLinkInput): Promise<ActionResult> {
  const parsed = magicLinkSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: new URL("/auth/confirm", await requestOrigin()).toString(),
    },
  });
  if (error) {
    return actionError(
      error.status === 429
        ? "Too many sign-in emails. Wait a minute and try again."
        : "We couldn't send the email. Check the address and try again.",
    );
  }
  return actionOk();
}

/** Signs out on this device only (A5). */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect(SIGN_IN_PATH);
}

/**
 * Signs out of every other browser and device, keeping this one (A5). Their
 * refresh tokens are revoked; each is signed out within the hour, when its
 * current access token expires.
 */
export async function signOutOtherDevices(): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  return error ? actionError("We couldn't sign out your other devices. Try again.") : actionOk();
}

/** Signs out everywhere, this device included (A5). */
export async function signOutEverywhere(): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect(SIGN_IN_PATH);
}

/**
 * Brings the session's claims in line with the tables after the user's
 * membership changed elsewhere (removed by an Admin, organization deleted).
 * The proxy then routes on the fresh claims.
 */
export async function refreshAccess(): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  await supabase.auth.refreshSession();
  redirect(HOME_PATH);
}
