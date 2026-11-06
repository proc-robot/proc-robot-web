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

export type OrgRole = "owner" | "admin" | "member";

export type Account = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  /** Null unless the user belongs to an active organization. */
  organizationId: string | null;
  organizationName: string | null;
  /**
   * From the profile, not the token: a role changed by an Admin applies at
   * once, while the token keeps the old one until it refreshes.
   */
  orgRole: OrgRole | null;
};

/**
 * The signed-in user and their organization, read from the tables. The
 * sidebar's account menu shows it, and pages use `orgRole` to decide what to
 * offer (the database decides what is allowed).
 */
export const getAccount = cache(async (): Promise<Account | null> => {
  const claims = await getClaims();
  if (!claims) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, org_role, organizations(id, name)")
    .eq("id", claims.sub)
    .single();
  if (!profile) return null;

  // RLS shows the organization only while it is active.
  const organization = profile.organizations;
  return {
    id: profile.id,
    name: profile.full_name || profile.email,
    email: profile.email,
    avatarUrl: profile.avatar_url,
    organizationId: organization?.id ?? null,
    organizationName: organization?.name ?? null,
    orgRole: organization ? profile.org_role : null,
  };
});

/** Owner or Admin: may change the organization's profile, settings and members. */
export const isOrgAdmin = (account: Pick<Account, "orgRole"> | null) =>
  account?.orgRole === "owner" || account?.orgRole === "admin";

/** Where a signed-in user belongs right now. */
export function homeFor(claims: AuthClaims): string {
  return hasOrganization(claims) ? HOME_PATH : ONBOARDING_PATH;
}
