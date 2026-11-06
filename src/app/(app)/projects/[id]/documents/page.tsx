import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionCard } from "@/components/app/SectionCard";
import { DocumentList, type DocumentEntry } from "@/components/documents/DocumentList";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { requireMember } from "@/lib/auth/session";
import { fileSize } from "@/lib/documents";
import { getFormatter } from "@/lib/format-server";
import { createClient } from "@/lib/supabase/server";
import { getMemberNames, getProject } from "../../data";

export const metadata: Metadata = { title: "Documents" };

/**
 * The project's specification documents (D1, D9, D10): upload, see the
 * credit estimate, read the items, follow the progress, retry a failure.
 */
export default async function DocumentsTab({ params }: { params: Promise<{ id: string }> }) {
  const claims = await requireMember();
  const { id } = await params;
  const supabase = await createClient();
  const [project, format, memberNames, { data: rows }, { data: balance }] = await Promise.all([
    getProject(id, claims.org_id),
    getFormatter(),
    getMemberNames(claims.org_id),
    supabase
      .from("documents_in")
      .select(
        "id, file_name, file_type, file_size, page_count, row_count, scanned, estimated_credits, status, error, job_id, uploaded_by, created_at, item_lists(list_items(count))",
      )
      .eq("organization_id", claims.org_id)
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("credit_balances")
      .select("plan_credits, topup_credits")
      .eq("organization_id", claims.org_id)
      .maybeSingle(),
  ]);
  if (!project) notFound();

  const credits = (balance?.plan_credits ?? 0) + (balance?.topup_credits ?? 0);
  const documents: DocumentEntry[] = (rows ?? []).map((row) => {
    const measure =
      row.file_type === "pdf"
        ? row.page_count !== null
          ? `${row.page_count} ${row.page_count === 1 ? "page" : "pages"}${row.scanned ? " (scanned)" : ""}`
          : null
        : row.row_count !== null
          ? `${row.row_count} ${row.row_count === 1 ? "row" : "rows"}`
          : null;
    const by = row.uploaded_by ? memberNames.get(row.uploaded_by) : null;
    return {
      id: row.id,
      fileName: row.file_name,
      isPdf: row.file_type === "pdf",
      details: [measure, fileSize(row.file_size)].filter(Boolean).join(" · "),
      uploaded: `${format.date(row.created_at)}${by ? ` by ${by}` : ""}`,
      status: row.status,
      estimatedCredits: row.estimated_credits,
      error: row.error,
      jobId: row.job_id,
      itemCount: row.item_lists[0]?.list_items[0]?.count ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <DocumentUpload
        organizationId={claims.org_id}
        projectId={project.id}
        disabled={project.status === "archived"}
      />
      <SectionCard
        id="documents"
        title={`Documents (${documents.length})`}
        description={
          <p>
            Your balance: <strong>{credits} credits</strong>. Reading costs 1 credit per 2 PDF pages
            (scans double) or per 25 spreadsheet rows.
          </p>
        }
      >
        <DocumentList documents={documents} projectId={project.id} credits={credits} />
      </SectionCard>
    </div>
  );
}
