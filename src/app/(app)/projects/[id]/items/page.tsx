import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemListView, type ItemListSummary } from "@/components/documents/ItemListView";
import { requireMember } from "@/lib/auth/session";
import type { SourceRef } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "../../data";

export const metadata: Metadata = { title: "Items" };

type Json = Record<string, unknown>;
const asObject = (value: unknown): Json =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {};
const asArray = (value: unknown): Json[] => (Array.isArray(value) ? (value as Json[]) : []);

/**
 * The extracted item lists (D2–D5), read-only for now: reviewing, editing
 * and confirming them is the review screen (T1.3.10, T1.3.11).
 */
export default async function ItemsTab({ params }: { params: Promise<{ id: string }> }) {
  const claims = await requireMember();
  const { id } = await params;
  const supabase = await createClient();
  const [project, { data: rows }] = await Promise.all([
    getProject(id, claims.org_id),
    supabase
      .from("item_lists")
      .select(
        "id, title, status, issues, created_at, documents_in(file_name), list_items(id, position, section, name, description, specs, quantity, unit, unit_code, source_ref, confidence, validation_flags)",
      )
      .eq("organization_id", claims.org_id)
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .order("position", { referencedTable: "list_items" }),
  ]);
  if (!project) notFound();

  const lists: ItemListSummary[] = (rows ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    documentName: row.documents_in?.file_name ?? null,
    issues: asArray(row.issues).map((issue) => ({
      message: String(issue.message ?? ""),
      source: asObject(issue.source) as SourceRef,
    })),
    items: row.list_items.map((item) => ({
      id: item.id,
      position: item.position,
      section: item.section,
      name: item.name,
      description: item.description,
      specs: Object.fromEntries(
        Object.entries(asObject(item.specs)).map(([key, value]) => [key, String(value)]),
      ),
      quantity: item.quantity === null ? null : String(Number(item.quantity)),
      unit: item.unit,
      unitCode: item.unit_code,
      source: asObject(item.source_ref) as SourceRef,
      confidence: asObject(item.confidence) as ItemListSummary["items"][number]["confidence"],
      flags: asArray(item.validation_flags).map((flag) => ({
        code: String(flag.code ?? ""),
        message: String(flag.message ?? ""),
        field: typeof flag.field === "string" ? flag.field : undefined,
      })),
    })),
  }));

  if (lists.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-pr-border-dashed bg-white p-6">
        <h2 className="text-base font-semibold">No items yet</h2>
        <p className="mt-1 text-sm text-pr-text-secondary">
          Upload the customer&apos;s specification on the{" "}
          <Link href={`/projects/${id}/documents`} className="text-pr-accent hover:underline">
            Documents
          </Link>{" "}
          tab and have its items read. Typing items in by hand comes with T1.3.12.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="rounded-[10px] bg-pr-neutral-chip px-3 py-2 text-sm text-pr-text-secondary">
        Check each item against its source: values in amber are uncertain. Editing and confirming
        the list before prices are searched comes next (T1.3.10, T1.3.11).
      </p>
      {lists.map((list) => (
        <ItemListView key={list.id} list={list} />
      ))}
    </div>
  );
}
