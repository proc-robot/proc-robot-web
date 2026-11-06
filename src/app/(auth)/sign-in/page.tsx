import type { Metadata } from "next";
import { SignInPanel } from "@/components/auth/SignInPanel";
import { googleSignInEnabled } from "@/lib/auth/features";
import { safeNextPath } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Sign in" };

/** Signed-in visitors never see this page: src/proxy.ts sends them on. */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; account?: string }>;
}) {
  const { next, error, account } = await searchParams;
  return (
    <SignInPanel
      next={safeNextPath(next)}
      googleEnabled={googleSignInEnabled()}
      notice={account === "deleted" ? "Your account was deleted." : undefined}
      error={
        error
          ? "That sign-in link has expired or was already used. Request a new one below."
          : undefined
      }
    />
  );
}
