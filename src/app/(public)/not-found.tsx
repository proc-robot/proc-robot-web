import type { Metadata } from "next";
import { NotFoundPage } from "@/components/public/NotFoundPage";

/** Handles `notFound()` from any public page. */
export const metadata: Metadata = {
  title: "Page not found | Proc-Robot",
  robots: { index: false, follow: true },
};

export default function PublicNotFound() {
  return <NotFoundPage />;
}
