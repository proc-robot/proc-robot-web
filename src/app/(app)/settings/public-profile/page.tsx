import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { SectionCard } from "@/components/app/SectionCard";
import { PublicProfileForm, type CategoryGroup } from "@/components/settings/PublicProfileForm";
import { ReadOnlyNotice } from "@/components/settings/ReadOnlyNotice";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { getAccount, isOrgAdmin, requireMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Public profile · Settings" };

/** The public supplier profile (O2). */
export default async function PublicProfileSettingsPage() {
  const claims = await requireMember();
  const account = await getAccount();
  if (!account) redirect(SIGN_IN_PATH);

  const supabase = await createClient();
  const [{ data: org }, { data: categories }] = await Promise.all([
    supabase
      .from("organizations")
      .select("email, whatsapp_number, website, description, category_slugs, verified_at")
      .eq("id", claims.org_id)
      .single(),
    supabase.from("categories").select("id, slug, name, parent_id, sort_order").order("sort_order"),
  ]);
  if (!org) redirect(SIGN_IN_PATH);

  const groups: CategoryGroup[] = (categories ?? [])
    .filter((category) => !category.parent_id)
    .map((parent) => ({
      slug: parent.slug,
      name: parent.name,
      children: (categories ?? [])
        .filter((category) => category.parent_id === parent.id)
        .map(({ slug, name }) => ({ slug, name })),
    }));

  const canEdit = isOrgAdmin(account);
  return (
    <>
      {!canEdit && <ReadOnlyNotice />}
      <SectionCard
        id="public-profile"
        title="Public supplier profile"
        description={
          <p>
            Other organizations see this when they find your published items (from P3). Everything
            else you keep in Proc-Robot stays private.
          </p>
        }
      >
        <div className="space-y-6">
          {org.verified_at && (
            <p className="flex items-center gap-2 text-sm font-medium text-pr-accent">
              <BadgeCheck className="size-4" aria-hidden />
              Verified supplier
            </p>
          )}
          <PublicProfileForm
            defaultValues={{
              email: org.email ?? "",
              whatsapp: org.whatsapp_number ?? "",
              website: org.website ?? "",
              description: org.description ?? "",
              categories: org.category_slugs,
            }}
            categories={groups}
            canEdit={canEdit}
          />
        </div>
      </SectionCard>
    </>
  );
}
