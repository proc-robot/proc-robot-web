import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/shared/Container";

/**
 * The public site's header — the page's one `<header>` landmark. More
 * navigation (Pricing) is added as those pages ship (TASKS.md T1.13.4); a
 * link to a page that does not exist yet would be a broken link in every
 * crawl. Sign-in is not indexed, so its link is `nofollow`.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-pr-border-card">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Proc-Robot home">
          <Image src="/brand/proc-robot-head.png" alt="" width={36} height={36} priority />
          <span className="font-newsreader text-[22px] font-medium tracking-tight">Proc-Robot</span>
        </Link>
        <Link
          href="/sign-in"
          rel="nofollow"
          className="rounded-[8px] px-3 py-2 text-sm font-medium text-pr-accent hover:bg-pr-neutral-chip"
        >
          Sign in
        </Link>
      </Container>
    </header>
  );
}
