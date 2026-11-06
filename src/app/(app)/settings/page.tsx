import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ImageUploadField } from "@/components/app/ImageUploadField";
import { SectionCard } from "@/components/app/SectionCard";
import { DeleteOrganizationSection } from "@/components/settings/DeleteOrganizationSection";
import { OrganizationProfileForm } from "@/components/settings/OrganizationProfileForm";
import { ReadOnlyNotice } from "@/components/settings/ReadOnlyNotice";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { getAccount, isOrgAdmin, requireMember } from "@/lib/auth/session";
import { countryOptions, currencyOptions } from "@/lib/countries";
import { initials } from "@/lib/initials";
import { createClient } from "@/lib/supabase/server";
import { setOrganizationLogo } from "./actions";

export const metadata: Metadata = { title: "Settings" };

/** General: the organization's details and logo (O1), and deleting it (O7). */
export default async function GeneralSettingsPage() {
  const claims = await requireMember();
  const account = await getAccount();
  if (!account) redirect(SIGN_IN_PATH);

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name, country, default_currency, address, tax_id, logo_path")
    .eq("id", claims.org_id)
    .single();
  if (!org) redirect(SIGN_IN_PATH);

  const canEdit = isOrgAdmin(account);
  const logoUrl = org.logo_path
    ? supabase.storage.from("org-logos").getPublicUrl(org.logo_path).data.publicUrl
    : null;

  return (
    <>
      {!canEdit && <ReadOnlyNotice />}
      <SectionCard id="organization" title="Organization">
        <div className="space-y-6">
          <ImageUploadField
            label="Logo"
            bucket="org-logos"
            folder={claims.org_id}
            imageUrl={logoUrl}
            fallback={initials(org.name)}
            shape="square"
            disabled={!canEdit}
            onSave={setOrganizationLogo}
          />
          <OrganizationProfileForm
            defaultValues={{
              name: org.name,
              country: org.country,
              currency: org.default_currency,
              address: org.address ?? "",
              taxId: org.tax_id ?? "",
            }}
            countries={countryOptions()}
            currencies={currencyOptions()}
            canEdit={canEdit}
          />
        </div>
      </SectionCard>

      {account.orgRole === "owner" && (
        <SectionCard id="delete-organization" title="Delete organization" tone="danger">
          <DeleteOrganizationSection name={org.name} />
        </SectionCard>
      )}
    </>
  );
}
