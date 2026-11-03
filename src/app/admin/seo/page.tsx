import type { Metadata } from "next";
import Link from "next/link";
import { AdminTable, type Column } from "@/components/admin/AdminTable";
import { Card, PageHeader } from "@/components/admin/PageHeader";
import { STATIC_PAGE_SEO_DEFS } from "@/lib/page-seo-registry";
import { DESCRIPTION_RANGE, TITLE_RANGE, pageTitle } from "@/lib/seo/metadata";
import { staticPageSeoValues } from "@/lib/seo/static-page";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Public SEO" };

type Row = {
  key: string;
  label: string;
  path: string;
  title: string;
  description: string | undefined;
};

/**
 * Every public page and what it publishes. Read-only: the values live in
 * `src/lib/page-seo-registry.ts` (see CLAUDE.md → Public SEO screen).
 */
export default function AdminSeoPage() {
  const rows: Row[] = STATIC_PAGE_SEO_DEFS.map((def) => {
    const seo = staticPageSeoValues(def.key);
    return {
      key: def.key,
      label: def.label,
      path: def.path,
      title: pageTitle(seo.title.value),
      description: seo.description.value,
    };
  });

  const columns: Column<Row>[] = [
    {
      header: "Page",
      cell: (row) => (
        <Link href={`/admin/seo/${row.key}`} className="font-medium underline-offset-4 hover:underline">
          {row.label}
        </Link>
      ),
    },
    { header: "Path", cell: (row) => <code className="font-mono text-xs">{row.path}</code> },
    {
      header: "Title",
      cell: (row) => <LengthCell value={row.title} range={TITLE_RANGE} />,
    },
    {
      header: "Description",
      cell: (row) => <LengthCell value={row.description} range={DESCRIPTION_RANGE} />,
    },
  ];

  return (
    <>
      <PageHeader title="Public SEO" />
      <p className="-mt-4 mb-6 max-w-2xl text-sm text-muted-foreground">
        What each public page publishes to search engines and AI crawlers. Values are set in{" "}
        <code className="font-mono text-xs">src/lib/page-seo-registry.ts</code>; open a page to see
        its share image and live JSON-LD.
      </p>
      <Card>
        <AdminTable
          rows={rows}
          columns={columns}
          getKey={(row) => row.key}
          empty="No public pages in the registry yet."
        />
      </Card>
    </>
  );
}

function LengthCell({
  value,
  range,
}: {
  value: string | undefined;
  range: { min: number; max: number };
}) {
  if (!value) return <span className="text-sm text-amber-600">Missing</span>;
  const over = value.length > range.max;
  const short = value.length < range.min;
  return (
    <div className="max-w-md space-y-1">
      <p className="text-sm">{value}</p>
      <p
        className={cn(
          "text-xs",
          over ? "font-medium text-destructive" : short ? "font-medium text-amber-600" : "text-muted-foreground",
        )}
      >
        {value.length} / {range.max}
      </p>
    </div>
  );
}
