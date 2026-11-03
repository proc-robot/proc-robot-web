import Link from "next/link";
import { Container } from "@/components/shared/Container";

/** Body of both 404 routes (unknown URL, and `notFound()` from a public page). */
export function NotFoundPage() {
  return (
    <Container className="py-24 lg:py-32">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-pr-text-tertiary">404</p>
      <h1 className="mt-3 font-newsreader text-[40px] font-normal leading-tight">Page not found</h1>
      <p className="mt-4 max-w-xl text-[15px] text-pr-text-secondary">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-10 items-center rounded-[8px] bg-pr-accent px-5 text-sm font-medium text-white hover:bg-pr-accent-hover"
      >
        Back to home
      </Link>
    </Container>
  );
}
