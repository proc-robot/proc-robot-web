import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Card, EditHeader } from "@/components/admin/PageHeader";
import { SeoDetailsPanel } from "@/components/admin/SeoDetailsPanel";
import {
  STATIC_PAGE_SEO_BY_KEY,
  STATIC_PAGE_SEO_DEFS,
  isStaticPageSeoKey,
} from "@/lib/page-seo-registry";
import { staticPageSeoValues } from "@/lib/seo/static-page";

/** One entry per registry page; any other key 404s. */
export const dynamicParams = false;

export function generateStaticParams() {
  return STATIC_PAGE_SEO_DEFS.map((def) => ({ key: def.key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  return { title: isStaticPageSeoKey(key) ? `SEO · ${STATIC_PAGE_SEO_BY_KEY[key].label}` : "SEO" };
}

export default async function AdminSeoDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  if (!isStaticPageSeoKey(key)) notFound();

  const def = STATIC_PAGE_SEO_BY_KEY[key];

  return (
    <>
      <EditHeader title={`${def.label} — SEO`} backHref="/admin/seo" />
      <p className="-mt-4 mb-6 flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          Path <code className="font-mono text-xs text-foreground">{def.path}</code>
        </span>
        <Link
          href={def.path}
          target="_blank"
          className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
        >
          Open live page <ExternalLink className="size-3.5" />
        </Link>
      </p>
      <Card>
        <SeoDetailsPanel seo={staticPageSeoValues(key)} publicPath={def.path} />
      </Card>
    </>
  );
}
