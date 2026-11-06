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
import { isProjectStatus, isUuid, type ProjectStatus } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";
import { PROJECT_FIELDS, projectSchema, toProjectRow, type ProjectValues } from "./schema";

/*
 * Projects (T1.2.1–T1.2.3). Every member creates and edits every project of
 * the organization (W4); RLS lets only the Owner and Admins delete one. The
 * database enforces the plan's open-project limit on create, copy and
 * re-open, and logs each project event for the activity feed.
 */

const GONE = "This project no longer exists.";
const CUSTOMER_GONE = "That customer no longer exists. Choose another one.";

function saveFailed(error: { code?: string; message: string; details?: string | null }) {
  if (error.code === "23503") return actionError(CUSTOMER_GONE, { customerId: CUSTOMER_GONE });
  return actionError(
    rpcErrorMessage(error, "We couldn't save the project."),
    rpcFieldErrors(error, PROJECT_FIELDS),
  );
}

function projectsChanged(id?: string) {
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/projects/${id}`, "layout");
}

export async function createProject(input: ProjectValues): Promise<ActionResult<{ id: string }>> {
  await requireMember();
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const row = toProjectRow(parsed.data);

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("create_project", {
    p_name: row.name,
    p_customer_id: row.customer_id ?? undefined,
    p_reference_no: row.reference_no,
    p_deadline: row.deadline ?? undefined,
    p_delivery_country: row.delivery_country,
    p_delivery_city: row.delivery_city,
    p_notes: row.notes,
  });
  if (error) return saveFailed(error);
  projectsChanged();
  return actionOk({ id });
}

export async function updateProject(id: string, input: ProjectValues): Promise<ActionResult> {
  const claims = await requireMember();
  if (!isUuid(id)) return actionError(GONE);
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update(toProjectRow(parsed.data))
    .eq("id", id)
    .eq("organization_id", claims.org_id)
    .select("id");
  if (error) return saveFailed(error);
  if (!data?.length) return actionError(GONE);
  projectsChanged(id);
  return actionOk();
}

/**
 * Submitted, won, lost, archived, or open again. Re-opening needs a free
 * place under the plan's open-project limit.
 */
export async function setProjectStatus(id: string, status: ProjectStatus): Promise<ActionResult> {
  const claims = await requireMember();
  if (!isUuid(id) || !isProjectStatus(status)) return actionError(GONE);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({ status })
    .eq("id", id)
    .eq("organization_id", claims.org_id)
    .select("id");
  if (error) return actionError(rpcErrorMessage(error));
  if (!data?.length) return actionError(GONE);
  projectsChanged(id);
  return actionOk();
}

/** Copies the project as a new open one; the caller opens it to rename it. */
export async function duplicateProject(id: string): Promise<ActionResult<{ id: string }>> {
  await requireMember();
  if (!isUuid(id)) return actionError(GONE);

  const supabase = await createClient();
  const { data: copyId, error } = await supabase.rpc("duplicate_project", { p_project_id: id });
  if (error) return actionError(rpcErrorMessage(error));
  projectsChanged();
  return actionOk({ id: copyId });
}

/** Owner and Admins. Members archive instead. */
export async function deleteProject(id: string): Promise<ActionFailure> {
  const claims = await requireMember();
  if (!isUuid(id)) return actionError(GONE);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("organization_id", claims.org_id)
    .select("id");
  if (error) return actionError(rpcErrorMessage(error));
  if (!data?.length) return actionError("Only the Owner and Admins can delete projects.");
  projectsChanged();
  redirect("/projects");
}
