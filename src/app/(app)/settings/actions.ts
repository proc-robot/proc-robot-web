"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ONBOARDING_PATH } from "@/lib/auth/routes";
import { requireMember } from "@/lib/auth/session";
import { actionError, actionOk, invalidInput, type ActionResult } from "@/lib/forms/action-result";
import { rpcErrorMessage, rpcFieldErrors } from "@/lib/forms/rpc-errors";
import type { Json, TablesUpdate } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import {
  inviteSchema,
  normalizePhone,
  organizationProfileSchema,
  organizationSettingsSchema,
  publicProfileSchema,
  SETTINGS_FIELDS,
  toSettings,
  type InviteValues,
  type OrganizationProfileValues,
  type OrganizationSettingsValues,
  type PublicProfileValues,
} from "./schema";

/*
 * Organization settings and members (T1.1.4–T1.1.6, T1.1.8). Thin by design:
 * RLS lets only an Owner or Admin update the organization, and the RPCs decide
 * who may change members. These actions validate, call, and refresh.
 */

const LOGO_BUCKET = "org-logos";
const ONLY_ADMINS = "Only the Owner and Admins can change the organization's settings.";
const uuid = z.uuid();

/** Updates the caller's organization; RLS makes it a no-op for members, which we report. */
async function updateOrganization(
  values: TablesUpdate<"organizations">,
  fields: Record<string, string>,
): Promise<ActionResult> {
  const claims = await requireMember();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update(values)
    .eq("id", claims.org_id)
    .select("id");
  if (error) {
    return actionError(
      rpcErrorMessage(error, "We couldn't save the changes."),
      rpcFieldErrors(error, fields),
    );
  }
  if (!data?.length) return actionError(ONLY_ADMINS);
  revalidatePath("/", "layout");
  return actionOk();
}

/** Name, country, default currency, address and tax ID (General). */
export async function updateOrganizationProfile(
  input: OrganizationProfileValues,
): Promise<ActionResult> {
  const parsed = organizationProfileSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const values = parsed.data;
  return updateOrganization(
    {
      name: values.name,
      country: values.country,
      default_currency: values.currency,
      address: values.address,
      tax_id: values.taxId,
    },
    { address: "address", tax_id: "taxId" },
  );
}

/** The public supplier profile (O2). The database normalizes and re-checks every field. */
export async function updatePublicProfile(input: PublicProfileValues): Promise<ActionResult> {
  const parsed = publicProfileSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const values = parsed.data;
  return updateOrganization(
    {
      email: values.email,
      whatsapp_number: normalizePhone(values.whatsapp),
      website: values.website,
      description: values.description,
      category_slugs: values.categories,
    },
    {
      email: "email",
      whatsapp_number: "whatsapp",
      website: "website",
      description: "description",
      category_slugs: "categories",
    },
  );
}

/** Pricing and document defaults (O5), merged into `organizations.settings`. */
export async function updateOrganizationSettings(
  input: OrganizationSettingsValues,
): Promise<ActionResult> {
  const claims = await requireMember();
  const parsed = organizationSettingsSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", claims.org_id)
    .single();
  const existing = (organization?.settings ?? {}) as Record<string, unknown>;
  return updateOrganization(
    { settings: toSettings(parsed.data, existing) as { [key: string]: Json } },
    SETTINGS_FIELDS,
  );
}

/** Sets or removes the logo. The browser uploaded it to `org-logos/{org_id}/…`. */
export async function setOrganizationLogo(path: string | null): Promise<ActionResult> {
  const claims = await requireMember();
  if (path !== null && !new RegExp(`^${claims.org_id}/[A-Za-z0-9._-]{1,80}$`).test(path)) {
    return actionError("That file can't be used as the logo.");
  }
  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("logo_path")
    .eq("id", claims.org_id)
    .single();

  const result = await updateOrganization({ logo_path: path }, {});
  if (result.ok && organization?.logo_path && organization.logo_path !== path) {
    await supabase.storage.from(LOGO_BUCKET).remove([organization.logo_path]);
  }
  return result;
}

// ---------------------------------------------------------------- members

function membersChanged(): ActionResult {
  revalidatePath("/settings/members");
  revalidatePath("/dashboard");
  return actionOk();
}

/** Invites by email with a role (O3). Inviting an invited address again resends it. */
export async function inviteMember(input: InviteValues): Promise<ActionResult> {
  await requireMember();
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_member", {
    p_email: parsed.data.email,
    p_org_role: parsed.data.role,
  });
  if (error) {
    return actionError(
      rpcErrorMessage(error),
      error.message === "already_member" || error.message === "invalid_email"
        ? { email: rpcErrorMessage(error) }
        : undefined,
    );
  }
  return membersChanged();
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  await requireMember();
  if (!uuid.safeParse(inviteId).success) return actionError("This invite no longer exists.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_invite", { p_invite_id: inviteId });
  return error ? actionError(rpcErrorMessage(error)) : membersChanged();
}

export async function changeMemberRole(
  userId: string,
  role: "admin" | "member",
): Promise<ActionResult> {
  await requireMember();
  if (!uuid.safeParse(userId).success || !["admin", "member"].includes(role)) {
    return actionError("That change isn't possible.");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("change_member_role", {
    p_user_id: userId,
    p_org_role: role,
  });
  return error ? actionError(rpcErrorMessage(error)) : membersChanged();
}

export async function removeMember(userId: string): Promise<ActionResult> {
  await requireMember();
  if (!uuid.safeParse(userId).success) return actionError("That member no longer exists.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", { p_user_id: userId });
  return error ? actionError(rpcErrorMessage(error)) : membersChanged();
}

/** The Owner hands over the organization and becomes an Admin (O4). */
export async function transferOwnership(userId: string): Promise<ActionResult> {
  await requireMember();
  if (!uuid.safeParse(userId).success) return actionError("That member no longer exists.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_ownership", { p_user_id: userId });
  if (error) return actionError(rpcErrorMessage(error));
  // The caller's role changed; bring the token's claims in line.
  await supabase.auth.refreshSession();
  return membersChanged();
}

/** A member or Admin leaves; they continue on the onboarding screen. */
export async function leaveOrganization(): Promise<ActionResult> {
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_organization");
  if (error) return actionError(rpcErrorMessage(error));
  await supabase.auth.refreshSession();
  redirect(ONBOARDING_PATH);
}

/**
 * The Owner deletes the organization (O7), typing its name to confirm. It
 * can be restored for 30 days from the onboarding screen.
 */
export async function deleteOrganization(confirmName: string): Promise<ActionResult> {
  await requireMember();
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_organization", { p_confirm_name: confirmName });
  if (error) return actionError(rpcErrorMessage(error));
  await supabase.auth.refreshSession();
  redirect(ONBOARDING_PATH);
}
