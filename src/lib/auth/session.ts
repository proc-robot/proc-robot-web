import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasOrganization, isSuperAdmin, type AuthClaims } from "./claims";
import { HOME_PATH, ONBOARDING_PATH, SIGN_IN_PATH } from "./routes";

/**
 * Server-side session checks for layouts, pages and Server Actions. They
 * repeat what src/proxy.ts enforces, because a Server Action is its own
 * entry point and must never trust that the proxy ran.
 *
 * `cache` makes repeated calls within one request cost a single lookup.
 */
export const getClaims = cache(async (): Promise<AuthClaims | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims ?? null) as AuthClaims | null;
});

/** Signed in (with or without an organization), else to sign-in. */
export async function requireUser(): Promise<AuthClaims> {
  const claims = await getClaims();
  if (!claims) redirect(SIGN_IN_PATH);
  return claims;
}

/** Signed in with an organization, else to sign-in or onboarding. */
export async function requireMember(): Promise<AuthClaims & { org_id: string }> {
  const claims = await requireUser();
  if (!hasOrganization(claims)) redirect(ONBOARDING_PATH);
  return claims as AuthClaims & { org_id: string };
}

/** A Super Admin; anyone else gets a 404 (the console's existence is not advertised). */
export async function requireSuperAdmin(): Promise<AuthClaims> {
  const claims = await requireUser();
  if (!isSuperAdmin(claims)) notFound();
  return claims;
}

export type Account = {
  name: string;
  email: string;
  avatarUrl: string | null;
  organizationName: string | null;
};

/** What the sidebar's account menu shows: the user and their organization. */
export const getAccount = cache(async (): Promise<Account | null> => {
  const claims = await getClaims();
  if (!claims) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, avatar_url, organizations(name)")
    .eq("id", claims.sub)
    .single();
  if (!profile) return null;

  return {
    name: profile.full_name || profile.email,
    email: profile.email,
    avatarUrl: profile.avatar_url,
    organizationName: claims.org_id ? (profile.organizations?.name ?? null) : null,
  };
});

/** Where a signed-in user belongs right now. */
export function homeFor(claims: AuthClaims): string {
  return hasOrganization(claims) ? HOME_PATH : ONBOARDING_PATH;
}
