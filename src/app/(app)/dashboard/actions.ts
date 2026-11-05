"use server";

import { requireMember } from "@/lib/auth/session";
import { actionError, actionOk, type ActionResult } from "@/lib/forms/action-result";
import { rpcErrorMessage } from "@/lib/forms/rpc-errors";
import { createClient } from "@/lib/supabase/server";

/** Queues a worker check for the user's organization (TASKS.md T0.6.8). */
export async function runWorkerCheck(): Promise<ActionResult<{ jobId: string }>> {
  await requireMember();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ping_worker");
  if (error || !data) return actionError(rpcErrorMessage(error));
  return actionOk({ jobId: data });
}
