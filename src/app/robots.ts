import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";

/**
 * AI search, assistant and answer-engine crawlers, allowed on purpose.
 *
 * The training crawlers in this list (GPTBot, Google-Extended, Applebot-Extended,
 * Meta-ExternalAgent) are included deliberately: the public site is marketing
 * content, and blocking them only reduces how well AI assistants know and
 * recommend Proc-Robot.
 *
 * A crawler that matches a named group ignores the `*` group entirely, so these
 * need their own copy of the disallow list — Next emits one block per agent.
 */
const AI_CRAWLERS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "Bingbot",
  "DuckAssistBot",
  "Meta-ExternalAgent",
];

/**
 * Paths kept out of crawling. The signed-in app and `/admin` also send
 * `noindex` from their layouts — robots.txt is a crawl instruction, not an
 * indexing one, so the meta tag is what actually keeps a linked URL out.
 * `/auth/` is the OAuth callback; `/api/` is a cheap guard for anything added
 * under Next's conventional API path later.
 */
const DISALLOW = ["/admin/", "/api/", "/auth/"];

/**
 * Indexing is opt-in: only a deployment that explicitly sets
 * SITE_INDEXABLE="true" serves an allow-list. Getting it wrong on production is
 * caught by checking `curl -s https://proc-robot.com/robots.txt` after deploy;
 * getting it wrong on a preview/staging deployment would not be caught by
 * anything, which is why the safe default points the other way.
 *
 * Read per request, not baked at build, so the same build can be promoted
 * between environments with different env values.
 */
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  if (process.env.SITE_INDEXABLE !== "true") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
