import { Container } from "@/components/shared/Container";

const STEPS = [
  {
    title: "Read the specification",
    body: "Upload a BOQ, Excel sheet or PDF. The AI extracts every item with its specs and source reference, and you confirm them.",
  },
  {
    title: "Find supplier prices",
    body: "Compare offers from your own suppliers, the Proc-Robot network and the web, matched on specifications — not just names.",
  },
  {
    title: "Quote with your margin",
    body: "Apply markup or margin, tax and rounding, then generate RFQs and quotations in your own company templates.",
  },
];

/**
 * Placeholder home hero until the marketing site is designed (TASKS.md
 * T1.13.4). Holds the page's single `<h1>`.
 */
export function Hero() {
  return (
    <section className="py-20 lg:py-28">
      <Container>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-pr-accent">
          AI procurement &amp; quotation platform
        </p>
        <h1 className="mt-4 max-w-3xl font-newsreader text-[44px] font-normal leading-[1.05] tracking-tight lg:text-[64px]">
          From specification to quotation.
        </h1>
        <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-pr-text-secondary">
          Proc-Robot turns your customer&apos;s specification documents into supplier prices,
          margins and professional RFQs and quotations — in your own company templates.
        </p>

        <ol className="mt-14 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="rounded-[14px] border border-pr-border-card bg-white p-6"
            >
              <span className="font-newsreader text-[28px] leading-none text-pr-accent">
                {index + 1}
              </span>
              <h2 className="mt-3 text-[15px] font-semibold">{step.title}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-pr-text-secondary">{step.body}</p>
            </li>
          ))}
        </ol>

        <p className="mt-10 text-[13px] text-pr-text-tertiary">Launching soon.</p>
      </Container>
    </section>
  );
}
