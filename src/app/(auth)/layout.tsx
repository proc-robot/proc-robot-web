import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BodyTheme } from "@/components/shared/BodyTheme";
import { Toaster } from "@/components/ui/sonner";

/**
 * Sign-in and onboarding: the brand look without the workspace sidebar.
 * Never indexed (sign-in pages are not search results), and rendered per
 * request because they read the session.
 *
 * There is no header: the brand (logo + name) sits above each page's content,
 * so every page in this group starts the same way. The column is as wide as
 * the page's own content (`max-w-*` on its root), which keeps the brand
 * aligned with the left edge of the title below it.
 */
export const metadata: Metadata = {
  title: { template: "%s · Proc-Robot", default: "Proc-Robot" },
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-brand flex min-h-dvh flex-col bg-pr-bg text-pr-ink">
      <BodyTheme theme="brand" />
      <main className="flex flex-1 justify-center px-5 pt-12 pb-16 sm:pt-20">
        <div className="flex max-w-full flex-col gap-10">
          <Link href="/" className="flex w-fit items-center gap-2.5" aria-label="Proc-Robot home">
            <Image
              src="/brand/proc-robot-head.png"
              alt=""
              width={36}
              height={36}
              priority
              // The head is almost the page's cream: a 1px outline that follows its shape.
              className="[filter:drop-shadow(1px_0_0_#b4aea0)_drop-shadow(-1px_0_0_#b4aea0)_drop-shadow(0_1px_0_#b4aea0)_drop-shadow(0_-1px_0_#b4aea0)]"
            />
            <span className="font-newsreader text-2xl font-medium tracking-tight">Proc-Robot</span>
          </Link>
          {children}
        </div>
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}
