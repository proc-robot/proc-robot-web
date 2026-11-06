import { cache } from "react";
import type { ComboboxOption } from "@/components/shared/Combobox";
import { OPEN_STATUSES } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

/*
 * Reads shared by the project pages. Every query names the organization: RLS
 * would also show a Super Admin every other organization's rows.
 */

/** The organization's customers for pickers and filters, by name. */
export const getCustomerOptions = cache(async (orgId: string): Promise<ComboboxOption[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name")
    .limit(1000);
  return (data ?? []).map((customer) => ({ value: customer.id, label: customer.name }));
});

export type ProjectAllowance = {
  open: number;
  /** Null when the plan has no limit on open projects. */
  limit: number | null;
  planName: string | null;
  full: boolean;
};

/** Open projects (active + submitted) against the plan's limit, as the database counts them. */
export const getProjectAllowance = cache(async (orgId: string): Promise<ProjectAllowance> => {
  const supabase = await createClient();
  const [{ data: org }, { count }] = await Promise.all([
    supabase.from("organizations").select("plans(name, limits)").eq("id", orgId).single(),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .in("status", [...OPEN_STATUSES]),
  ]);
  const limits = org?.plans?.limits as { active_projects?: number | null } | undefined;
  const limit = limits?.active_projects ?? null;
  const open = count ?? 0;
  return { open, limit, planName: org?.plans?.name ?? null, full: limit !== null && open >= limit };
});

/** One project with its customer, or null (another organization's, or gone). */
export const getProject = cache(async (id: string, orgId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select(
      "id, name, reference_no, deadline, delivery_country, delivery_city, status, notes, customer_id, created_by, created_at, updated_at, customers(id, name)",
    )
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();
  return data;
});

/** Member names by id, for "Created by". Former members are not in the list. */
export const getMemberNames = cache(async (orgId: string): Promise<Map<string, string>> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("organization_id", orgId);
  return new Map((data ?? []).map((profile) => [profile.id, profile.full_name || profile.email]));
});
