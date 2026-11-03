import { Container } from "@/components/shared/Container";

/** The public site's footer — the page's one `<footer>` landmark. */
export function SiteFooter() {
  return (
    <footer className="border-t border-pr-border-card">
      <Container className="flex flex-col gap-2 py-8 text-[13px] text-pr-text-tertiary sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Proc-Robot</p>
        <p>From specification to quotation.</p>
      </Container>
    </footer>
  );
}
