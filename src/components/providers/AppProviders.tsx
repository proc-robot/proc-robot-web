"use client";

import { environmentManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import type { FormatPrefs } from "@/lib/format";
import { FormatProvider } from "./FormatProvider";

/**
 * Client-side providers for the workspace and the Super Admin console: the
 * user's number/date format, TanStack Query and the toast outlet. The public
 * site does not render them, which keeps their JavaScript off the marketing
 * pages.
 *
 * TanStack Query is for data the browser keeps fresh by itself: job progress
 * alongside Realtime, polling, client-side search-as-you-type. Pages load their
 * data in Server Components, and writes go through Server Actions.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data handed over from the server stays fresh for a minute instead of
        // being refetched right after hydration.
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * One client per server request; one for the whole browser session. Not
 * `useState`: React discards state when the first render suspends, which would
 * create a second client (TanStack's advanced-SSR guide).
 */
function getQueryClient() {
  if (environmentManager.isServer()) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function AppProviders({
  formatPrefs,
  children,
}: {
  /** From `getFormatPrefs()` in the section layout. */
  formatPrefs: FormatPrefs;
  children: React.ReactNode;
}) {
  return (
    <FormatProvider prefs={formatPrefs}>
      <QueryClientProvider client={getQueryClient()}>
        {children}
        <Toaster position="bottom-right" />
      </QueryClientProvider>
    </FormatProvider>
  );
}
