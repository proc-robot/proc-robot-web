import { cn } from "@/lib/utils";
import { TITLE_RANGE, DESCRIPTION_RANGE, pageTitle } from "@/lib/seo/metadata";
import { SEO_SOURCE_LABEL, type ResolvedSeo, type SeoSource } from "@/lib/seo/resolve";
import type { EntitySeo } from "@/lib/seo/static-page";
import { JsonLdPreview } from "./JsonLdPreview";

/**
 * Read-only view of what one public page publishes to search engines: the
 * resolved title, description and share image — each with **where it came
 * from** — and the page's live JSON-LD.
 *
 * Everything here comes from `staticPageSeoValues()` in
 * `src/lib/seo/static-page.ts`, the same resolution `generateMetadata` and the
 * JSON-LD builders use, so the panel cannot show something different from what
 * the page emits. Public pages are code-defined today, so every badge reads
 * "Default"; a future database override would show up here as "Manual".
 */
export function SeoDetailsPanel({
  seo,
  publicPath,
  unavailableReason,
}: {
  seo: EntitySeo;
  /** Site-relative path of the public page, for the live JSON-LD preview. */
  publicPath: string;
  /** Set when the page has no live URL yet. */
  unavailableReason?: string;
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <Heading
          title="What search engines see"
          hint="Set in src/lib/page-seo-registry.ts. The badge says where each value came from."
        />

        <div className="space-y-4">
          <Row
            label="Page title"
            resolved={seo.title}
            range={TITLE_RANGE}
            // The brand suffix is added at render time, so the counter has to
            // measure the string that actually reaches the <title> tag.
            emitted={pageTitle(seo.title.value)}
            emittedNote="The brand is appended automatically unless the title already contains it."
          />

          <Row label="Meta description" resolved={seo.description} range={DESCRIPTION_RANGE} />

          <ImageRow resolved={seo.image} />
        </div>
      </section>

      <section className="space-y-3 border-t border-zinc-200 pt-6">
          <Heading
            title="Structured data"
            hint="Fetched from the live page, so this is exactly what a crawler receives — not a simulation."
          />
          {unavailableReason ? (
            <p className="text-sm text-zinc-500">{unavailableReason}</p>
          ) : (
            <JsonLdPreview path={publicPath} />
          )}
      </section>
    </div>
  );
}

function Heading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{title}</h2>
      <p className="text-xs text-zinc-400">{hint}</p>
    </div>
  );
}

const BADGE_STYLE: Record<SeoSource, string> = {
  manual: "bg-green-100 text-green-700",
  derived: "bg-blue-100 text-blue-700",
  default: "bg-zinc-200 text-zinc-600",
};

function SourceBadge({ resolved }: { resolved: ResolvedSeo }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        BADGE_STYLE[resolved.source],
      )}
    >
      {SEO_SOURCE_LABEL[resolved.source]}
      {resolved.fieldLabel ? ` · ${resolved.fieldLabel}` : null}
    </span>
  );
}

function Row({
  label,
  resolved,
  range,
  emitted,
  emittedNote,
}: {
  label: string;
  resolved: ResolvedSeo;
  range: { min: number; max: number };
  /** The final string, where it differs from the resolved value. */
  emitted?: string;
  emittedNote?: string;
}) {
  const shown = emitted ?? resolved.value;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-500">{label}</span>
        <SourceBadge resolved={resolved} />
      </div>

      {shown ? (
        <>
          <p className="text-sm font-medium text-zinc-900">{shown}</p>
          <Length length={shown.length} {...range} />
          {emittedNote && <p className="text-xs text-zinc-400">{emittedNote}</p>}
        </>
      ) : (
        <p className="text-sm text-amber-600">
          Nothing to publish — every field in the chain is empty.
        </p>
      )}
    </div>
  );
}

/** Thresholds from `TITLE_RANGE` / `DESCRIPTION_RANGE` in src/lib/seo/metadata.ts. */
function Length({ length, min, max }: { length: number; min: number; max: number }) {
  const over = length > max;
  const short = length < min;

  return (
    <p
      className={cn(
        "text-xs",
        over && "font-medium text-destructive",
        short && !over && "font-medium text-amber-600",
        !over && !short && "text-zinc-400",
      )}
    >
      {length} / {max} characters
      {over && ` — ${length - max} over, search results will cut this off`}
      {short && !over && " — short enough that it may get rewritten"}
    </p>
  );
}

function ImageRow({ resolved }: { resolved: ResolvedSeo }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-500">Share image</span>
        <SourceBadge resolved={resolved} />
      </div>

      {resolved.value ? (
        <div className="flex items-start gap-3">
          {/* Plain <img>: the optimiser is no help for an admin thumbnail. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolved.value}
            alt=""
            className="h-20 w-36 border border-zinc-200 bg-zinc-100 object-cover"
          />
          <code className="break-all bg-zinc-50 px-2 py-1 font-mono text-xs text-zinc-700">
            {resolved.value}
          </code>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/og-default.png"
            alt=""
            className="h-20 w-36 border border-zinc-200 bg-zinc-100 object-cover"
          />
          <p className="text-sm text-zinc-500">
            No page-specific image: uses the sitewide{" "}
            <code className="font-mono text-xs">/og-default.png</code> (1200×630, from{" "}
            <code className="font-mono text-xs">npm run icons</code>).
          </p>
        </div>
      )}
    </div>
  );
}
