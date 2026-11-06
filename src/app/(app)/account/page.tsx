import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/account/ProfileForm";
import { SessionsSection } from "@/components/account/SessionsSection";
import { YourDataSection } from "@/components/account/YourDataSection";
import { ImageUploadField } from "@/components/app/ImageUploadField";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { HOME_VIEWS, type HomeView } from "@/app/(auth)/onboarding/schema";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { getAccount, requireMember } from "@/lib/auth/session";
import { currencyOptions } from "@/lib/countries";
import { isFormatLocale, isTimeZone } from "@/lib/format";
import { initials } from "@/lib/initials";
import { createClient } from "@/lib/supabase/server";
import { timeZoneOptions } from "@/lib/time-zones";
import { setAvatar } from "./actions";
import { ORG_CURRENCY } from "./schema";

export const metadata: Metadata = { title: "Your account" };

/** The signed-in user's own account: profile (A4), sessions (A5), data (A6). */
export default async function AccountPage() {
  const claims = await requireMember();
  const account = await getAccount();
  if (!account) redirect(SIGN_IN_PATH);

  const supabase = await createClient();
  const [{ data: profile }, { data: organization }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, format_locale, timezone, display_currency, home_view")
      .eq("id", account.id)
      .single(),
    supabase.from("organizations").select("default_currency").eq("id", claims.org_id).single(),
  ]);

  const homeView = (HOME_VIEWS as readonly string[]).includes(profile?.home_view ?? "")
    ? (profile!.home_view as HomeView)
    : "both";

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="Your account"
        description="Your profile, how numbers and dates look to you, your sessions and your data."
      />

      <SectionCard
        id="profile"
        title="Profile"
        description="Your teammates see your name and picture."
      >
        <div className="space-y-6">
          <ImageUploadField
            label="Profile picture"
            bucket="avatars"
            folder={account.id}
            imageUrl={account.avatarUrl}
            fallback={initials(account.name)}
            onSave={setAvatar}
          />
          <ProfileForm
            defaultValues={{
              fullName: profile?.full_name ?? "",
              formatLocale: isFormatLocale(profile?.format_locale)
                ? profile.format_locale
                : "en-US",
              timeZone: isTimeZone(profile?.timezone) ? profile.timezone : "UTC",
              displayCurrency: profile?.display_currency ?? ORG_CURRENCY,
              homeView,
            }}
            timeZones={timeZoneOptions()}
            currencies={currencyOptions()}
            organizationCurrency={organization?.default_currency ?? "USD"}
          />
        </div>
      </SectionCard>

      <SectionCard
        id="email"
        title="Email"
        description="You sign in with a link sent to this address."
      >
        <p className="text-sm font-medium">{account.email}</p>
      </SectionCard>

      <SectionCard id="sessions" title="Sessions">
        <SessionsSection />
      </SectionCard>

      <SectionCard id="your-data" title="Your data" tone="danger">
        <YourDataSection email={account.email} isOwner={account.orgRole === "owner"} />
      </SectionCard>
    </div>
  );
}
