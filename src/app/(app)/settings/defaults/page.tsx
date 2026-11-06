import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SectionCard } from "@/components/app/SectionCard";
import { OrganizationSettingsForm } from "@/components/settings/OrganizationSettingsForm";
import { ReadOnlyNotice } from "@/components/settings/ReadOnlyNotice";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { getAccount, isOrgAdmin, requireMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fromSettings } from "../schema";

export const metadata: Metadata = { title: "Pricing & documents · Settings" };

/** Pricing and document defaults (O5). */
export default async function DefaultsSettingsPage() {
  const claims = await requireMember();
  const account = await getAccount();
  if (!account) redirect(SIGN_IN_PATH);

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", claims.org_id)
    .single();
  if (!org) redirect(SIGN_IN_PATH);

  const canEdit = isOrgAdmin(account);
  return (
    <>
      {!canEdit && <ReadOnlyNotice />}
      <SectionCard
        id="defaults"
        title="Pricing & documents"
        description={
          <p>
            The starting point for every quotation and RFQ. Default templates are chosen on the{" "}
            <Link href="/templates" className="font-medium text-pr-accent underline">
              Templates
            </Link>{" "}
            page.
          </p>
        }
      >
        <OrganizationSettingsForm
          defaultValues={fromSettings((org.settings ?? {}) as Record<string, unknown>)}
          canEdit={canEdit}
          today={new Date().toISOString()}
        />
      </SectionCard>
    </>
  );
}
