"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/session";
import {
  actionError,
  actionOk,
  invalidInput,
  type ActionFailure,
  type ActionResult,
} from "@/lib/forms/action-result";
import { rpcErrorMessage, rpcFieldErrors } from "@/lib/forms/rpc-errors";
import { isUuid } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";
import {
  CUSTOMER_FIELDS,
  customerSchema,
  DUPLICATE_CUSTOMER,
  toCustomerRow,
  type CustomerValues,
} from "./schema";

/*
 * The customer directory (T1.2.4). Every member adds and edits customers;
 * RLS lets only the Owner and Admins delete them, and scopes every query to
 * the organization.
 */

const GONE = "This customer no longer exists.";

function saveFailed(error: { code?: string; message: string; details?: string | null }) {
  if (error.code === "23505") return actionError(DUPLICATE_CUSTOMER, { name: DUPLICATE_CUSTOMER });
  return actionError(
    rpcErrorMessage(error, "We couldn't save the customer."),
    rpcFieldErrors(error, CUSTOMER_FIELDS),
  );
}

function customersChanged() {
  // Customer names show on projects, the dashboard and the pickers.
  revalidatePath("/", "layout");
}

/** Adds a customer; the project form's picker selects the one it returns. */
export async function createCustomer(
  input: CustomerValues,
): Promise<ActionResult<{ id: string; name: string }>> {
  await requireMember();
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert(toCustomerRow(parsed.data))
    .select("id, name")
    .single();
  if (error) return saveFailed(error);
  customersChanged();
  return actionOk(data);
}

export async function updateCustomer(id: string, input: CustomerValues): Promise<ActionResult> {
  const claims = await requireMember();
  if (!isUuid(id)) return actionError(GONE);
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .update(toCustomerRow(parsed.data))
    .eq("id", id)
    .eq("organization_id", claims.org_id)
    .select("id");
  if (error) return saveFailed(error);
  if (!data?.length) return actionError(GONE);
  customersChanged();
  return actionOk();
}

/** Owner and Admins. Its projects stay, without a customer. */
export async function deleteCustomer(id: string): Promise<ActionFailure> {
  const claims = await requireMember();
  if (!isUuid(id)) return actionError(GONE);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("organization_id", claims.org_id)
    .select("id");
  if (error) return actionError(rpcErrorMessage(error));
  if (!data?.length) return actionError("Only the Owner and Admins can delete customers.");
  customersChanged();
  redirect("/customers");
}
