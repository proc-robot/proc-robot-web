import type { Metadata } from "next";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { OnboardingNotice } from "@/components/auth/OnboardingNotice";
import { requireUser } from "@/lib/auth/session";
import { countryOptions, currencyOptions } from "@/lib/countries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Set up your workspace" };

/**
 * Onboarding (A3): join an organization through an invite, or create one.
 * Users without an organization can reach nothing else (src/proxy.ts).
 */
export default async function OnboardingPage() {
  const claims = await requireUser();
  const supabase = await createClient();

  // Read from the table, not the token: the token may predate a change.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, home_view, organization_id")
    .eq("id", claims.sub)
    .single();

  if (profile?.organization_id) {
    return (
      <OnboardingNotice
        state={claims.org_status === "active" || !claims.org_status ? "stale" : "suspended"}
      />
    );
  }

  const { data: invites } = await supabase.rpc("my_pending_invites");

  return (
    <OnboardingForm
      firstName={profile?.full_name?.split(" ")[0] ?? null}
      defaultHomeView={
        profile?.home_view === "quotations" || profile?.home_view === "rfqs"
          ? profile.home_view
          : "both"
      }
      invites={(invites ?? []).map((invite) => ({
        id: invite.invite_id,
        organizationName: invite.organization_name,
        role: invite.org_role,
        invitedBy: invite.invited_by_name,
      }))}
      countries={countryOptions()}
      currencies={currencyOptions()}
    />
  );
}
