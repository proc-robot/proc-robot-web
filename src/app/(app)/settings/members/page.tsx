import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SectionCard } from "@/components/app/SectionCard";
import { InviteForm } from "@/components/settings/InviteForm";
import { MembersTable, type Member } from "@/components/settings/MembersTable";
import { PendingInvites, type Invite } from "@/components/settings/PendingInvites";
import { SIGN_IN_PATH } from "@/lib/auth/routes";
import { getAccount, isOrgAdmin, requireMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Members · Settings" };

const ROLE_ORDER = { owner: 0, admin: 1, member: 2 } as const;

/** Members and invites (O3, O4), with the plan's seat limit. */
export default async function MembersSettingsPage() {
  const claims = await requireMember();
  const account = await getAccount();
  if (!account?.orgRole) redirect(SIGN_IN_PATH);

  const supabase = await createClient();
  const now = new Date().toISOString();
  const [{ data: profiles }, { data: invites }, { data: org }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, org_role")
      .eq("organization_id", claims.org_id),
    // RLS shows invites to the Owner and Admins only.
    supabase
      .from("invites")
      .select("id, email, org_role, expires_at, invited_by")
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("organizations").select("plans(name, limits)").eq("id", claims.org_id).single(),
  ]);

  const members: Member[] = (profiles ?? [])
    .filter((profile) => profile.org_role)
    .map((profile) => ({
      id: profile.id,
      name: profile.full_name || profile.email,
      email: profile.email,
      avatarUrl: profile.avatar_url,
      role: profile.org_role!,
    }))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name));
  const names = new Map(members.map((member) => [member.id, member.name]));
  const pending: Invite[] = (invites ?? []).map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.org_role === "admin" ? "admin" : "member",
    expiresAt: invite.expires_at,
    invitedBy: invite.invited_by ? (names.get(invite.invited_by) ?? null) : null,
  }));

  // Members plus unexpired invites, as the database counts them.
  const seatLimit = (org?.plans?.limits as { seats?: number | null } | undefined)?.seats ?? null;
  const seatsUsed = members.length + pending.filter((invite) => invite.expiresAt > now).length;
  const full = seatLimit !== null && seatsUsed >= seatLimit;
  const canManage = isOrgAdmin(account);

  return (
    <>
      {canManage && (
        <SectionCard
          id="invite"
          title="Invite people"
          description={
            <p>
              {seatLimit === null
                ? `${seatsUsed} seats used, pending invites included.`
                : `${seatsUsed} of ${seatLimit} seats used on the ${org?.plans?.name ?? "current"} plan, pending invites included.`}
            </p>
          }
        >
          <div className="space-y-3">
            {full && (
              <p className="rounded-[10px] bg-pr-warm-tint px-3 py-2 text-sm">
                All seats are taken. Revoke a pending invite or remove a member to invite someone
                new, or upgrade the plan.
              </p>
            )}
            <InviteForm disabled={full} />
          </div>
        </SectionCard>
      )}

      <SectionCard id="members" title={`Members (${members.length})`}>
        <MembersTable members={members} currentUserId={account.id} currentRole={account.orgRole} />
      </SectionCard>

      {canManage && (
        <SectionCard
          id="pending-invites"
          title="Pending invites"
          description={<p>An invite holds a seat for 7 days, until it is accepted or revoked.</p>}
        >
          <PendingInvites invites={pending} now={now} />
        </SectionCard>
      )}
    </>
  );
}
