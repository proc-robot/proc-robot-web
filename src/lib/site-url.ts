/**
 * The public site's own origin, used for canonicals, OG tags, the sitemap,
 * share links and the JSON-LD `@id`s.
 *
 * `NEXT_PUBLIC_*` variables are inlined by the bundler, so this value is fixed
 * **at build time** — it is not read from the server's environment at runtime.
 * That is deliberate: the public routes are statically prerendered, so their
 * canonical tags are baked during the build anyway. A build is tied to the
 * origin it was built for; a preview/staging build that inherits the
 * production origin is kept out of the index by `SITE_INDEXABLE` instead.
 *
 * This is the **marketing** origin (`proc-robot.com`). The signed-in app on
 * `app.proc-robot.com` is never indexed, so nothing builds canonicals for it.
 */
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://proc-robot.com").replace(/\/+$/, "");

/** The bare origin, no trailing slash. */
export function siteUrl(): string {
  return SITE_URL;
}

/** Absolute URL for a site-relative path, used to build share links. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
