// Root layout. Fonts and top-loader setup come from the SurvPay theme
// (design/theme/layout.tsx): Newsreader = display / headlines / big figures
// (totals, prices), Public Sans = UI / body.
import type { Metadata } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/**
 * Only `metadataBase` and the fallback title/description live here. Icons come
 * from the `favicon.ico` / `icon.png` / `apple-icon.png` files beside this one
 * (written by `npm run icons`), and the manifest from `manifest.ts`.
 *
 * Next merges metadata shallowly, so any page that defines `openGraph` would
 * replace a root-level `openGraph` wholesale rather than extending it. Share
 * tags therefore never live here: every public route composes a complete set
 * through `buildMetadata()`. `metadataBase` is the one field pages never
 * override — it turns their relative canonical, `og:url` and `og:image` paths
 * into absolute URLs.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  // Last-resort title/description for a route that ships none of its own.
  // Every public route overrides both.
  title: "Proc-Robot — From specification to quotation",
  description:
    "Upload project specifications, discover supplier prices, calculate your margins, and generate RFQs and quotations in your own templates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${publicSans.variable}`}>
      <body className="antialiased">
        <NextTopLoader
          color="#0F6B57"
          height={3}
          showSpinner={false}
          shadow={false}
          zIndex={1600}
        />
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
