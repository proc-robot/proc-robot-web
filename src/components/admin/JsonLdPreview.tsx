"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The page's real JSON-LD, fetched from the live page and pretty-printed.
 *
 * It fetches the public URL and parses the markup out of the returned HTML
 * rather than re-running the builders, which means the preview is **identical
 * to what a crawler receives** instead of a second implementation that could
 * disagree with the first. It also needs no maintenance when a builder changes,
 * and it catches failure modes a re-render could not: a stale cached page, a
 * block that didn't render, markup broken by an escaping bug.
 *
 * Same-origin, so no proxy route is involved and the admin's session cookie
 * rides along for free.
 */

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; blocks: string[] };

/**
 * Fetches and extracts, returning a state rather than setting one.
 *
 * Kept free of React so the effect below can await it before touching state —
 * which is what lets the effect avoid a synchronous `setState` on mount.
 */
async function loadBlocks(path: string): Promise<State> {
  try {
    // no-store so a second look after a save isn't served the browser's copy
    // of the page from before the edit.
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      return {
        status: "error",
        message:
          response.status === 404
            ? "The public page returned 404 — it may be unpublished."
            : `The public page returned HTTP ${response.status}.`,
      };
    }

    const scripts = new DOMParser()
      .parseFromString(await response.text(), "text/html")
      .querySelectorAll('script[type="application/ld+json"]');

    const blocks = [...scripts].map((script) => {
      const raw = script.textContent ?? "";
      try {
        return JSON.stringify(JSON.parse(raw), null, 2);
      } catch {
        // Shown rather than swallowed: unparseable JSON-LD is the single most
        // important thing this preview can surface.
        return `/* This block is not valid JSON — a crawler will discard it. */\n${raw}`;
      }
    });

    return { status: "ready", blocks };
  } catch {
    return { status: "error", message: "Couldn't reach the public page." };
  }
}

export function JsonLdPreview({ path }: { path: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState(false);

  // Runs on mount — which, inside the venue page's SEO tab, means the first
  // time that tab is opened, because Radix doesn't mount inactive tab content.
  // `cancelled` matters: the tab can be switched away mid-fetch.
  useEffect(() => {
    let cancelled = false;
    void loadBlocks(path).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [path, reloadKey]);

  const reload = () => {
    setState({ status: "loading" });
    setReloadKey((key) => key + 1);
  };

  const blocks = state.status === "ready" ? state.blocks : null;

  const copy = async () => {
    if (!blocks) return;
    await navigator.clipboard.writeText(blocks.join("\n\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const liveUrl =
    typeof window === "undefined" ? path : new URL(path, window.location.origin).href;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={reload}
          disabled={state.status === "loading"}
        >
          <RefreshCw className={state.status === "loading" ? "size-4 animate-spin" : "size-4"} />
          {state.status === "loading" ? "Loading…" : "Reload"}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copy}
          disabled={!blocks || blocks.length === 0}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>

        <Button type="button" variant="outline" size="sm" asChild>
          <a
            href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(liveUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="size-4" />
            Rich Results Test
          </a>
        </Button>

        <Button type="button" variant="outline" size="sm" asChild>
          <a href={path} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" />
            View page
          </a>
        </Button>
      </div>

      {/* Worth saying plainly rather than letting someone wonder why the Rich
          Results Test fails against a local dev server. */}
      <p className="text-xs text-zinc-400">
        The Rich Results Test fetches this URL from Google&apos;s servers — it only works on a
        publicly reachable site, not on localhost.
      </p>

      {state.status === "error" && <p className="text-sm text-amber-600">{state.message}</p>}

      {blocks?.length === 0 && (
        <p className="text-sm text-amber-600">
          No structured data found on this page. Every public route should emit one block.
        </p>
      )}

      {blocks?.map((block, index) => (
        <div key={index} className="space-y-1">
          {blocks.length > 1 && (
            <p className="text-xs text-zinc-400">
              Block {index + 1} of {blocks.length}
              {index === 0 ? " — sitewide organisation data" : " — this page"}
            </p>
          )}
          <pre className="max-h-96 overflow-auto border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-800">
            {block}
          </pre>
        </div>
      ))}
    </div>
  );
}
