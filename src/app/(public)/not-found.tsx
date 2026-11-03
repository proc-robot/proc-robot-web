import type { Metadata } from "next";
import { NotFoundPage } from "@/components/public/NotFoundPage";

/** Handles `notFound()` from any public page. */
export const metadata: Metadata = {
  title: "Page not found | Proc-Robot",
  // No `robots` here: Next adds <meta name="robots" content="noindex"> to
  // every 404 response itself, and a second tag would only duplicate it.
};

export default function PublicNotFound() {
  return <NotFoundPage />;
}
