"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { saveFormatCookies } from "@/lib/format-cookies";
import { actionError, actionOk, invalidInput, type ActionResult } from "@/lib/forms/action-result";
import { rpcErrorMessage, rpcFieldErrors } from "@/lib/forms/rpc-errors";
import { createClient } from "@/lib/supabase/server";
import { avatarPathSchema, ORG_CURRENCY, profileSchema, type ProfileValues } from "./schema";

const AVATAR_BUCKET = "avatars";

/** Where an avatar URL points in our bucket, or null for any other URL (e.g. Google's). */
function avatarPathFromUrl(url: string | null): string | null {
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const index = url?.indexOf(marker) ?? -1;
  return url && index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}

/** Saves the profile (A4) and the format cookies, so dates follow at once. */
export async function updateProfile(input: ProfileValues): Promise<ActionResult> {
  const claims = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const values = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: values.fullName,
      format_locale: values.formatLocale,
      timezone: values.timeZone,
      display_currency: values.displayCurrency === ORG_CURRENCY ? null : values.displayCurrency,
      home_view: values.homeView,
    })
    .eq("id", claims.sub);
  if (error) {
    return actionError(
      rpcErrorMessage(error, "We couldn't save your profile."),
      rpcFieldErrors(error, { full_name: "fullName", timezone: "timeZone" }),
    );
  }

  await saveFormatCookies({ locale: values.formatLocale, timeZone: values.timeZone });
  revalidatePath("/", "layout");
  return actionOk();
}

/**
 * Sets (or with null, removes) the profile picture. The browser has already
 * uploaded the file to `avatars/{user_id}/…`; the previous file is deleted.
 */
export async function setAvatar(path: string | null): Promise<ActionResult> {
  const claims = await requireUser();
  if (path !== null && !avatarPathSchema(claims.sub).safeParse(path).success) {
    return actionError("That file can't be used as your picture.");
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", claims.sub)
    .single();
  const avatarUrl = path
    ? supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl
    : null;

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", claims.sub);
  if (error) return actionError("We couldn't save your picture.");

  const previous = avatarPathFromUrl(profile?.avatar_url ?? null);
  if (previous && previous !== path) {
    await supabase.storage.from(AVATAR_BUCKET).remove([previous]);
  }
  revalidatePath("/", "layout");
  return actionOk();
}

/** Everything Proc-Robot holds about the user, as JSON for a download (A6). */
export async function exportMyData(): Promise<ActionResult<string>> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("export_my_data");
  if (error) return actionError(rpcErrorMessage(error, "We couldn't prepare your data."));
  return actionOk(JSON.stringify(data, null, 2));
}

/**
 * Deletes the account for good (A6), then ends this browser's session. The
 * user types their email to confirm. Owners transfer ownership first.
 */
export async function deleteMyAccount(confirmEmail: string): Promise<ActionResult> {
  const claims = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, avatar_url")
    .eq("id", claims.sub)
    .single();
  if (!profile || confirmEmail.trim().toLowerCase() !== profile.email.toLowerCase()) {
    return actionError("Type your email address exactly to confirm.");
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return actionError(rpcErrorMessage(error, "We couldn't delete your account."));

  // The picture is personal data too. This browser's token is still valid
  // for a moment, which is enough for Storage to delete it.
  const avatarPath = avatarPathFromUrl(profile.avatar_url);
  if (avatarPath) await supabase.storage.from(AVATAR_BUCKET).remove([avatarPath]);

  // The account is gone; clear this browser's session cookies.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/sign-in?account=deleted");
}
