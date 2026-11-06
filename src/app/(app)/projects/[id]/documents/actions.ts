"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth/session";
import { actionError, actionOk, type ActionResult } from "@/lib/forms/action-result";
import { rpcErrorMessage } from "@/lib/forms/rpc-errors";
import { isUuid } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

/*
 * Specification documents (T1.3.2, T1.3.3, T1.3.13). The browser uploads
 * the file to `spec-files`; these actions call the RPCs, which check the
 * project, the file and the credits.
 */

const GONE = "This document no longer exists.";

function documentsChanged(projectId: string) {
  revalidatePath(`/projects/${projectId}`, "layout");
}

/** Registers an uploaded file; its inspection (pages or rows) starts at once. */
export async function registerDocument(
  projectId: string,
  path: string,
  fileName: string,
): Promise<ActionResult<{ id: string }>> {
  await requireMember();
  if (!isUuid(projectId)) return actionError("This project no longer exists.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_document", {
    p_project_id: projectId,
    p_file_path: path,
    p_file_name: fileName,
  });
  if (error) return actionError(rpcErrorMessage(error, "The file couldn't be added."));
  documentsChanged(projectId);
  return actionOk({ id: data });
}

/** Reserves the document's estimated credits and starts reading it (D10). */
export async function extractDocument(
  documentId: string,
  projectId: string,
): Promise<ActionResult<{ jobId: string }>> {
  await requireMember();
  if (!isUuid(documentId) || !isUuid(projectId)) return actionError(GONE);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("extract_document", { p_document_id: documentId });
  if (error) return actionError(rpcErrorMessage(error));
  documentsChanged(projectId);
  return actionOk({ jobId: data });
}

/** After a failure: back to "ready" (the estimate is shown again) or inspected again. */
export async function retryDocument(documentId: string, projectId: string): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(documentId) || !isUuid(projectId)) return actionError(GONE);
  const supabase = await createClient();
  const { error } = await supabase.rpc("retry_document", { p_document_id: documentId });
  if (error) return actionError(rpcErrorMessage(error));
  documentsChanged(projectId);
  return actionOk();
}

/** Removes the document, its unconfirmed item list, and the file. */
export async function deleteDocument(documentId: string, projectId: string): Promise<ActionResult> {
  await requireMember();
  if (!isUuid(documentId) || !isUuid(projectId)) return actionError(GONE);
  const supabase = await createClient();
  const { data: path, error } = await supabase.rpc("delete_document", {
    p_document_id: documentId,
  });
  if (error) return actionError(rpcErrorMessage(error));
  // The row is gone; a file left behind is only storage, never shown again.
  if (path) await supabase.storage.from("spec-files").remove([path]);
  documentsChanged(projectId);
  return actionOk();
}
