import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BodyTheme } from "@/components/shared/BodyTheme";
import { Toaster } from "@/components/ui/sonner";

/**
 * Sign-in and onboarding: the brand look without the workspace sidebar.
 * Never indexed (sign-in pages are not search results), and rendered per
 * request because they read the session.
 */
export const metadata: Metadata = {
  title: { template: "%s · Proc-Robot", default: "Proc-Robot" },
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-brand flex min-h-dvh flex-col bg-pr-bg text-pr-ink">
      <BodyTheme theme="brand" />
      <header className="flex h-16 items-center px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Proc-Robot home">
          <Image src="/brand/proc-robot-head.png" alt="" width={32} height={32} priority />
          <span className="font-newsreader text-xl font-medium tracking-tight">Proc-Robot</span>
        </Link>
      </header>
      <main className="flex flex-1 justify-center px-5 pt-8 pb-16 sm:pt-16">{children}</main>
      <Toaster position="bottom-right" />
    </div>
  );
}
