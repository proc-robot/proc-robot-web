import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card as UICard, CardContent } from "@/components/ui/card";

/** List-page header: title + optional "New" button. */
export function PageHeader({
  title,
  newHref,
  newLabel = "New",
}: {
  title: string;
  newHref?: string;
  newLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      {newHref && (
        <Button asChild className="bg-black text-white hover:bg-black/90 active:scale-95 transition-transform">
          <Link href={newHref}>{newLabel}</Link>
        </Button>
      )}
    </div>
  );
}

/** Detail/edit-page header: title + "Back" link. */
export function EditHeader({ title, backHref }: { title: string; backHref: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <Button asChild variant="ghost" size="sm">
        <Link href={backHref}>← Back</Link>
      </Button>
    </div>
  );
}

/** White card wrapper used by every form/detail page. */
export function Card({ children }: { children: React.ReactNode }) {
  return (
    <UICard>
      <CardContent>{children}</CardContent>
    </UICard>
  );
}
