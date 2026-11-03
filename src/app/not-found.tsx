import type { Metadata } from "next";
import { NotFoundPage } from "@/components/public/NotFoundPage";
import { SiteFooter } from "@/components/public/SiteFooter";
import { SiteHeader } from "@/components/public/SiteHeader";

/**
 * 404 for URLs that match no route at all. It renders outside the `(public)`
 * layout, so it brings the public chrome itself. A `notFound()` thrown inside
 * `(public)` is handled by `(public)/not-found.tsx` instead.
 */
export const metadata: Metadata = {
  title: "Page not found | Proc-Robot",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="theme-brand flex min-h-dvh flex-col bg-pr-bg text-pr-ink">
      <SiteHeader />
      <main className="flex-1">
        <NotFoundPage />
      </main>
      <SiteFooter />
    </div>
  );
}
