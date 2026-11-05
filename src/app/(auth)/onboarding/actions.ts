"use server";

import { redirect } from "next/navigation";
import type { z } from "zod";
import { HOME_PATH } from "@/lib/auth/routes";
import { requireUser } from "@/lib/auth/session";
import { actionError, invalidInput, type ActionResult } from "@/lib/forms/action-result";
import { rpcErrorMessage } from "@/lib/forms/rpc-errors";
import { createClient } from "@/lib/supabase/server";
import { createOrganizationSchema, joinOrganizationSchema, type HomeView } from "./schema";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Saves the home screen choice, then refreshes the session: the custom
 * access token hook puts the new org into the JWT, which the proxy and RLS
 * read. Without the refresh the user would be sent back to onboarding.
 */
async function enterWorkspace(
  supabase: Supabase,
  userId: string,
  homeView?: HomeView,
): Promise<never> {
  if (homeView) {
    await supabase.from("profiles").update({ home_view: homeView }).eq("id", userId);
  }
  await supabase.auth.refreshSession();
  redirect(HOME_PATH);
}

/** Creates the user's organization (O1); they become its Owner. */
export async function createOrganization(
  input: z.input<typeof createOrganizationSchema>,
): Promise<ActionResult> {
  const claims = await requireUser();
  const parsed = createOrganizationSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization", {
    p_name: parsed.data.name,
    p_country: parsed.data.country,
    p_default_currency: parsed.data.currency,
  });
  if (error) return actionError(rpcErrorMessage(error));

  return enterWorkspace(supabase, claims.sub, parsed.data.homeView);
}

/** Joins the organization of an invite addressed to the user's email. */
export async function joinOrganization(
  input: z.input<typeof joinOrganizationSchema>,
): Promise<ActionResult> {
  const claims = await requireUser();
  const parsed = joinOrganizationSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", { p_invite_id: parsed.data.inviteId });
  if (error) return actionError(rpcErrorMessage(error));

  return enterWorkspace(supabase, claims.sub, parsed.data.homeView);
}

/** For a user who already has an organization but an older token (e.g. joined in another tab). */
export async function continueToWorkspace(): Promise<void> {
  const claims = await requireUser();
  const supabase = await createClient();
  await enterWorkspace(supabase, claims.sub);
}
