import type { MetadataRoute } from "next";

/**
 * Web app manifest.
 *
 * Not a PWA — `display: "browser"` says so plainly. Without it, Android's "Add
 * to Home screen" invents a name and screenshots the page for an icon; with it,
 * a saved shortcut carries the brand mark and the right name.
 *
 * The icons live in `public/` rather than coming from the `icon.png` file
 * convention: Next serves that one from a content-hashed URL, which is exactly
 * what a manifest must not hardcode. `npm run icons` writes all of them from
 * `public/brand/proc-robot-head.png`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Proc-Robot",
    short_name: "Proc-Robot",
    description:
      "AI-powered procurement and quotation platform — from specification to quotation.",
    start_url: "/",
    display: "browser",
    background_color: "#F7F5F0",
    theme_color: "#12242E",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
