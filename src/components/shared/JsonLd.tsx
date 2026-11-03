/**
 * One `application/ld+json` block, rendered on the server.
 *
 * Server-rendered is the whole point: AI crawlers (ChatGPT, Claude, Perplexity)
 * do not run JavaScript, so schema injected client-side or through a tag
 * manager is invisible to them. The check that proves it is
 * `curl -s <url> | grep -c application/ld+json` — the Rich Results Test *does*
 * run JS, so it cannot prove this on its own.
 *
 * The `<` escape stops copy containing a closing script tag from breaking out
 * of the block; `<` is valid inside a JSON string, so the parsed data is
 * unchanged.
 *
 * Pass one `@graph` per page. `compactDeep` has already removed empty values by
 * the time anything reaches here.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
