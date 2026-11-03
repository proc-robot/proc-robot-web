import { SiteFooter } from "@/components/public/SiteFooter";
import { SiteHeader } from "@/components/public/SiteHeader";
import { BodyTheme } from "@/components/shared/BodyTheme";
import { JsonLd } from "@/components/shared/JsonLd";
import { orgGraph } from "@/lib/schema";

/**
 * The public (marketing) chrome, plus the `Organization` + `WebSite` JSON-LD
 * every public page carries exactly once.
 *
 * That block lives here rather than in the root layout because the root also
 * wraps the workspace and `/admin`, which are `noindex` and have no business
 * describing the organisation to crawlers. Pages render only their own content
 * (and their own `@graph`) — never a second header, footer or `<main>`.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-brand flex min-h-dvh flex-col bg-pr-bg text-pr-ink">
      <BodyTheme theme="brand" />
      <JsonLd data={orgGraph()} />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
