/**
 * The JWT claims the app relies on. `org_id`, `org_role`, `app_role`, `plan`
 * and `org_status` are added by the custom access token hook
 * (supabase/migrations/*_tenancy.sql). They only change when the session
 * refreshes, so after joining or creating an org the session is refreshed.
 */
export type AuthClaims = {
  sub: string;
  email?: string;
  org_id?: string;
  org_role?: "owner" | "admin" | "member";
  app_role?: "user" | "super_admin";
  plan?: string;
  org_status?: "active" | "suspended" | "deleted" | null;
};

export const isSuperAdmin = (claims: AuthClaims | null) => claims?.app_role === "super_admin";
export const hasOrganization = (claims: AuthClaims | null) => Boolean(claims?.org_id);
