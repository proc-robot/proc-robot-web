# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Proc-Robot** — an AI-powered procurement & quotation platform (*from specification to quotation*).
An organization uploads a specification (Excel/PDF/BOQ), the AI extracts the items, a person reviews
them, Proc-Robot finds supplier prices, applies the margin, and generates an RFQ or a Sales Quotation
in the organization's own template. This repo is the **web frontend** (Next.js). The backend is
**Supabase** plus a Railway worker; neither lives here.

Source-of-truth docs, one level up (read them before building a feature):

| Doc | What it decides |
|---|---|
| `../CORE_FEATURES.md` | Features (ids like D4, K5, Q5), roles, permission matrix, plans and credits |
| `../PLAN.md` | Tech stack, data model, RPCs, queues, infrastructure, security |
| `../TASKS.md` | The phase-by-phase checklist — tick a task `[x]` when it is done |
| `../design/THEME.md` | Colour tokens, typography, shapes, status-chip mapping, logo rules |

The app was started from the **Swillfam** Next.js project to reuse its public-section SEO layer
(metadata builder, sitemap, robots, JSON-LD). Everything else from Swillfam was removed; if a
Swillfam pattern is needed again, the original lives in `~/galo/swillfam`.

## Sections of the app

One Next.js app, three sections. They never share chrome.

| Section | Route group | Audience | Indexing | Look |
|---|---|---|---|---|
| **Public** (marketing) | `src/app/(public)/` | Visitors | indexable | brand: cream/navy/green, header + footer |
| **Workspace** | `src/app/(app)/` | Signed-in org members | `noindex, nofollow` | brand, **navy sidebar** |
| **Super Admin** | `src/app/admin/` | Platform staff (`app_role = 'super_admin'`) | `noindex, nofollow` | plain shadcn **zinc**, light sidebar |

- **Domains (planned, Phase 0):** `proc-robot.com` serves the public section; `app.proc-robot.com`
  serves the workspace and `/admin`, via host routing in `src/proxy.ts`. That is why workspace
  paths carry no prefix (`/projects`, not `/app/projects`).
- **⚠️ There is no auth guard yet.** The Supabase session check and the `app_role` check arrive with
  TASKS.md T0.3.3 / T0.3.5 / T0.3.7. **Do not deploy the workspace or `/admin` anywhere public before
  then.** When it lands: a Next 16 `src/proxy.ts` (it must live in `src/`, next to `app/` — at the repo
  root Next silently ignores it) for the redirect, **plus** a check at the top of every page and
  every Server Action. The proxy is only the first line; Server Actions are separate entry points.

### Sidebars (`(app)` and `/admin`)

- Built on the shadcn **`sidebar`** component: `SectionShell` (`src/components/navigation/`) renders
  the sidebar (collapses to icons; opens as a sheet on mobile), the top bar with the trigger and the
  current location, and the page. `AppShell` / `AdminShell` wrap it per section.
- **The navigation is defined in exactly one file per section**: `src/components/app/nav.ts` and
  `src/components/admin/nav.ts`. Each item has `label`, `href`, a lucide `icon`, a `phase`, a
  one-line `description` and its TASKS.md ids. A new page = its `page.tsx` + an entry there.
- Items in a later phase (`P2`/`P3`/`P4`) render **disabled with a phase badge** and have no page, so
  nothing in the sidebar 404s. Flip the item's `phase` to `"MVP"` when its page ships.
- Unbuilt MVP sections render `<ComingSoon item={navItem(NAV, "/path")} />`, which shows the
  description and the TASKS.md ids. Replace the page body with the real feature; keep the nav entry.
- The active item is the **longest** matching href (`activeItem()` in `navigation/types.ts`), so
  `/admin` is not highlighted on every `/admin/*` page.
- The nav config holds icon components, which cannot be passed from a Server Component as props —
  that is why `AppShell`/`AdminShell` are Client Components that import their own config.
- The sidebar footer holds the number & date format picker (`FormatSwitcher`, both sections) and a
  "Not signed in" placeholder; the user/org menu replaces the placeholder with auth (T0.1.8).
- A unit test (`navigation/nav.test.ts`) fails if a live nav entry has no `page.tsx`, a later-phase
  entry has one, or an href repeats.

## Stack

**In the repo now:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4 (CSS-first `@theme`,
no `tailwind.config`), React Compiler (`reactCompiler: true`), shadcn/ui (`new-york`, zinc base,
`radix-ui`), lucide icons, `nextjs-toploader`, TanStack Query, Zod 4, React Hook Form, sonner
(toasts). Tooling: ESLint, Prettier, Vitest, Playwright. **No translation library: the UI is
English only.**

**Planned (TASKS.md Phase 0 — not installed yet):** `@supabase/ssr` + `supabase-js` (T0.3.3).
Hosting: Vercel `iad1`.

Backend rules that shape every frontend change (see `../PLAN.md` → Recommended Tech Stack):

- **Supabase is the backend. There is no ORM and no custom business API.** Reads and writes go
  through `supabase-js` with the **user's session and the publishable key**; **RLS** is the
  authorization layer on every table.
- **Business rules live in Postgres functions (RPCs)**: plan limits, credits, numbering, and the
  costing engine. `calculate_quotation()` is the **only** source of money figures — never compute
  a selling price, margin, tax or total in TypeScript, on the client or the server.
- **Server Actions stay thin**: validate input, call `supabase-js`/an RPC with the user's session,
  `revalidatePath`/`redirect`. No business logic in them.
- **No Route Handlers for business logic.** The only one is `/auth/callback` (OAuth). Stripe lives
  in Supabase Edge Functions, not here.
- **The service-role/secret key never appears in this app.** Only `NEXT_PUBLIC_SUPABASE_URL` and the
  publishable key.
- **Long work is never done in a request.** Extraction, price discovery, rendering and email go
  through Supabase Queues (pgmq) to the Railway worker; the UI shows progress via **Realtime** on
  `ai_jobs`.
- **Uploads go straight to Supabase Storage** (paths `{org_id}/…`), not through a Server Action.

## Frontend Rules

Framework:
- Next.js App Router
- TypeScript
- TailwindCSS

UI Strategy:
- Use shadcn/ui for all functional UI.
- Use React Bits only for visual enhancements and as requested by prompt.
- React Bits reference: "https://reactbits.dev/get-started/installation"
- Never create custom dialog, form, table, or input if shadcn exists.
- Add shadcn components with `npx shadcn@latest add <name>`. **Answer "no" to overwriting existing
  files** (`button.tsx` and `accordion.tsx` are customised), and check the new file's imports — the
  CLI has written `import { cn } from "cn"` instead of `@/lib/utils` before.

Icons:
- **`lucide-react` only** (it is the shadcn `iconLibrary` in `components.json`). No Phosphor.

Documentation:
- Always query Context7 before using third-party libraries.

Code Style:
- Layout Desktop First then Mobile First
- While creating a page, the sections always breakdown into separate components `./src/components`
- Server Components by default
- Client Components only when required

Workflow:
- After making changes, run `npm run check` (typecheck + lint + format check + unit tests) and
  `npm run build`. For changes to routing, metadata, layouts or anything interactive, also run
  `npm run test:e2e`.

## Commands

```bash
npm install
npx playwright install chromium   # once per machine, for test:e2e
npm run dev            # http://localhost:3000
npm run build          # also runs the TS typecheck
npm run check          # typecheck + lint + format:check + test (what CI runs)
npm run typecheck      # tsc --noEmit
npm run lint
npm run format         # Prettier (+ Tailwind class sorting); format:check to verify only
npm run test           # Vitest unit tests (src/**/*.test.ts); test:watch while working
npm run test:e2e       # Playwright (e2e/) against a production build on port 3210
npm run icons          # favicon / app icons / manifest icons / og-default.png from the logo
```

- **Prettier** skips `src/components/ui/` (shadcn files stay exactly as the CLI writes them) and
  Markdown. Node 22 (`@types/node` 22).
- **Unit tests** run in Node and cover pure code: SEO metadata, JSON-LD, the page registry,
  formatting, form helpers and nav ↔ page consistency. Put a test next to the
  file it tests (`foo.ts` → `foo.test.ts`). Component tests would add `jsdom` + Testing Library.
- **E2E tests** (`e2e/`) build and start the app on port **3210** (`E2E_PORT` to change it).
  Locally, Playwright reuses whatever already listens on that port without checking what it is, so
  keep it free.

Env: copy `.env.example` → `.env.local`.

- **`NEXT_PUBLIC_SITE_URL` is the public site's real origin, and it is read at _build_ time.** It is
  the `metadataBase` behind every canonical, `og:url` and `og:image`, the sitemap's base, and the
  base of every JSON-LD `@id`. `NEXT_PUBLIC_*` is inlined by the bundler and the public routes are
  prerendered, so a build is tied to the origin it was built with — rebuild for a different origin.
- **`SITE_INDEXABLE` — production must set this to `"true"`.** `src/app/robots.ts` reads it per
  request; anything else serves a blanket `Disallow: /`. Indexing is opt-in so Vercel preview and
  staging deployments stay out of search results. After a production deploy, confirm with
  `curl -s https://proc-robot.com/robots.txt`.

## Theme (`src/app/globals.css`, details in `../design/THEME.md`)

- **Brand tokens** are Tailwind `pr-*` colours: `bg-pr-bg` (cream `#F7F5F0`), `text-pr-ink` (navy
  `#12242E`), `bg-pr-accent` (green `#0F6B57`), `pr-warm`, `pr-destructive`, the `pr-text-*`,
  `pr-border-*` and tint tokens, and the four `pr-logo-*` colours.
- **Fonts:** `font-newsreader` for display text and big figures (titles, totals, prices); Public
  Sans (the body default) for UI. Money and quantities in tables use `tabular-nums`.
- **`.theme-brand`** re-points the shadcn variables (`--primary`, `--background`, `--sidebar*`, …) at
  the brand palette, so a plain shadcn `<Button>` is green and the sidebar is navy inside the public
  site and the workspace. `/admin` does not carry it and stays zinc.
- **Portals:** Radix dialogs, menus, popovers and the mobile sidebar sheet render under `<body>`,
  outside the section wrapper. `<BodyTheme theme="brand" />` (in the public and `(app)` layouts)
  mirrors the scope onto `body[data-theme]`, so portaled content is branded too. A new brand-themed
  layout needs both the class and `<BodyTheme>`.
- **Logo teal (`pr-logo-teal`) only on dark surfaces** (the navy sidebar's active marker, dark
  panels) — never as text on cream.
- Status chips (Verified / Estimated / Expired prices, RFQ vs Sales Quotation, document status) have
  a fixed mapping in THEME.md §5 — use it, don't invent colours.
- Shapes: cards `rounded-[14px]` with `border-pr-border-card`; menus `rounded-[10px]` with the navy
  shadow; inputs and buttons `rounded-[8px]`. Flat by default: borders, not shadows.

## Public layout (`src/app/(public)/`)

`src/app/(public)/layout.tsx` owns the public chrome once: the `.theme-brand` wrapper,
`<BodyTheme>`, the `Organization` + `WebSite` JSON-LD (`orgGraph()`), `<SiteHeader />`,
`<main>{children}</main>` and `<SiteFooter />` (both in `src/components/public/`). **A page's
`page.tsx` is just its own content** — never its own header, footer or `<main>`.

- The org block lives here, not in the root layout, because the root also wraps the workspace and
  `/admin`, which are `noindex` and must not describe the organisation to crawlers.
- `src/app/not-found.tsx` (unknown URLs) renders outside this layout, so it brings the public chrome
  itself; `(public)/not-found.tsx` handles `notFound()` from a public page. Both are `noindex`.
- Header navigation (Pricing, Sign in) is added as those pages ship (TASKS.md T1.13.4) — a link to a
  page that does not exist is a broken link in every crawl.

## SEO metadata (`src/lib/seo/`)

**Every public route builds its metadata with `buildMetadata()` from `src/lib/seo/metadata.ts`
(usually through `staticPageMetadata(key)`). Never hand-write `openGraph` or `twitter` in a page.**
Next merges metadata *shallowly*, so a page that defines `openGraph` replaces the parent's
wholesale — a page setting only `openGraph.title` would silently drop `og:site_name`, `og:locale`
and the image. `buildMetadata` composes the complete set (canonical, OG, Twitter) from one input.
`src/app/layout.tsx` therefore holds *only* `metadataBase` + fallback title/description.

- **Public pages are registered in `src/lib/page-seo-registry.ts`**: `key`, `label`, `path`,
  `defaultTitle` (without the brand — `pageTitle()` appends "| Proc-Robot" unless the title already
  names it) and `defaultDescription`. **An entry is added only once its page exists**, because every
  entry goes into the sitemap.
- **One resolution, three consumers.** `staticPageSeoValues(key)` (`static-page.ts`) resolves title,
  description and image with their **provenance** (`resolve.ts`: `manual` / `derived` / `default`).
  `staticPageMetadata(key)` (the `<title>`/`<meta>`), `staticPageSeo(key)` (the JSON-LD
  `name`/`description`) and the admin's Public SEO screen all read it, so they cannot disagree.
  Never spell a fallback chain out at a call site.
- `TITLE_RANGE` (25–60) / `DESCRIPTION_RANGE` (70–155) in `metadata.ts` are what the admin screen
  measures against. Write registry titles and descriptions to stand on their own in a search result.
- **Canonical and image paths are passed site-relative** (`/pricing`, `/og-default.png`);
  `metadataBase` absolutises them. OG images must be the original file path, never a
  `/_next/image?url=` URL — crawlers and chat previews fetch them directly.
- **Descriptions:** a hand-written value is emitted verbatim; derived fallbacks (future
  database-backed pages) are stripped of HTML (`plainText`) and cut to 155 chars at a word boundary.
- **Images:** no per-page image yet, so every page falls back to `/og-default.png` (1200×630,
  declared with its width/height). A page-specific image gets no width/height tags, because its
  shape is not guaranteed.
- `noindex` sections: `(app)/layout.tsx` and `admin/layout.tsx` set `robots: noindex, nofollow` —
  robots.txt is a crawl hint, the meta tag is what keeps a linked URL out of the index.

**Adding a public page** — all four, in the same change:
1. `src/app/(public)/<path>/page.tsx` with `export const metadata = staticPageMetadata("<key>")`
   (sections as components in `src/components/public/<page>/`).
2. An entry in `src/lib/page-seo-registry.ts` (real title + description, not a generic brand line).
3. Its JSON-LD: `<JsonLd data={webPageGraph({ path, ...staticPageSeo("<key>"), crumbs })} />`, or a
   dedicated builder in `src/lib/schema/page.ts` when the page shows more (e.g. pricing → plans
   and offers built from the same rows the page renders).
4. A header/footer link where it belongs. The sitemap and `/admin/seo` pick it up automatically.

## Sitemap and robots (`src/app/sitemap.ts`, `src/app/robots.ts`)

- The sitemap lists every registry page. **Every URL in it must return 200** and be neither
  noindexed nor redirected.
- **The homepage is the bare origin** (`https://proc-robot.com`, no trailing slash), matching the
  canonical Next emits — keep the two byte-identical.
- **`lastModified` is only ever a real timestamp.** The marketing pages are code, so they get none.
  When a database-backed public page type arrives (e.g. a blog), add its rows with a filter that
  **mirrors the page's own publish guard** (so the sitemap can't advertise a URL that `notFound()`s)
  and the row's `updated_at` as `lastModified` — the `detail()` pattern is sketched in the file.
- `robots.ts` allows the named AI crawlers on purpose (they need their own copy of the disallow
  list) and disallows `/admin/`, `/api/`, `/auth/`.

## JSON-LD (`src/lib/schema/`)

**Every public page emits its `@graph` server-rendered**: the layout emits `Organization` +
`WebSite` once, and each page emits one `@graph` of its own (`WebPage`, `FAQPage`, breadcrumb…).
AI crawlers don't run JavaScript, so schema added client-side or through a tag manager is invisible
to them — and the Rich Results Test *does* run JS, so it can't prove the markup is in the HTML. The
check that can: `curl -s <url> | grep -o 'application/ld+json' | wc -l` (the RSC payload repeats the
string, so count the `<script>` blocks in the parsed HTML when exactness matters).

- `<JsonLd data={…} />` (`src/components/shared/JsonLd.tsx`) renders the block and escapes `<`.
  Never hand-write the script tag.
- Builders are **pure** and take values the page already has. `core.ts` holds the primitives
  (`graph`, `compactDeep`, `breadcrumb`, `faqPage`, `collectionPage`, `imageUrl`, `isoInstant`),
  `organization.ts` the org/website nodes, `page.ts` the page builders (`webPageGraph`,
  `breadcrumbOnlyGraph`, `archiveGraph`). Compose with `graph(...nodes)`, which drops empty nodes.
- **Never emit `""` or `null`.** `graph()` runs everything through `compactDeep`, so an unfilled field
  simply disappears — write builders as if every field were present, and don't add emptiness checks.
- **Never publish placeholder facts.** The organisation's address, phone, email and social profiles
  are deliberately absent until real (the legal entity is set up after the MVP). A fake contact in
  `Organization` is worse than none.
- **Link entities by `@id`, never duplicate them.** `ORG_ID`, `WEBSITE_ID` and `pageId(path)` are
  fixed; add an id helper in `core.ts` when a page type gets its own entity.
- **The root is the bare origin**, matching the canonical and the sitemap.
- **Image URLs must be the original file** (`imageUrl`/`imageUrls` absolutise paths).
- **Dates are ISO 8601 in UTC** (`isoInstant(date)`) — Proc-Robot is global — and only from a real
  timestamp, never invented.
- **Only mark up what the page shows.** `faqPage()` takes the same FAQs the accordion renders.
- `AccordionContent` (`src/components/ui/accordion.tsx`) uses `forceMount`: Radix otherwise renders
  `isOpen && children`, which keeps collapsed FAQ answers out of the HTML. **FAQPage markup depends on
  that `forceMount` — if it goes, FAQPage markup has to go with it.**

## Public SEO screen (`/admin/seo`)

Read-only: it lists every registry page with its emitted title and description (and their length
against the ranges), and `/admin/seo/[key]` shows `SeoDetailsPanel` — title, description, share
image, each with its provenance badge — plus `JsonLdPreview`, which **fetches the live page and parses
its HTML** rather than re-running the builders, so it shows exactly what a crawler receives.

- To change a page's SEO, edit `src/lib/page-seo-registry.ts`.
- Possible later (not built): a Supabase `page_seo` table + an admin form so the Super Admin can
  override the registry per page — Swillfam's Page SEO pattern (`SeoFields` in `~/galo/swillfam`).
  The override becomes the first candidate in `staticPageSeoValues()`; nothing else changes.
- Once the workspace moves to `app.proc-robot.com`, the preview's same-origin fetch must target the
  public origin instead.

## Headings and landmarks

- **One `<h1>` per page, naming the page's subject.** Taglines are paragraphs.
- **One `<main>`, one `<header>`, one `<footer>` per page.** The public layout owns them; in the
  workspace and admin, `SidebarInset` is the `<main>`.
- **Every `<nav>` needs an `aria-label`** (the sidebars use "<Section> navigation").
- **Don't skip heading levels.** Section headings are `h2`; cards inside a titled section are `h3`.
- Verify against the built HTML with `<script>` blocks stripped — Next serialises client-component
  props into `self.__next_f.push(...)`, so text inside a `<script>` is payload, not rendered markup.

## Icons and images

- `npm run icons` (`scripts/generate-icons.ts`) writes, from `public/brand/proc-robot-head.png`
  (512×512): `src/app/favicon.ico`, `src/app/icon.png`, `src/app/apple-icon.png` (on navy), and
  `public/icon-192.png`, `public/icon-512.png`, `public/og-default.png`. All outputs are committed.
  Re-run it when the logo changes; an SVG master (TASKS.md TP.16) would sharpen the small sizes.
- `favicon.ico` / `icon.png` / `apple-icon.png` are Next file conventions — the root layout sets no
  `icons` key. The manifest's icons live in `public/` because the convention files get hashed URLs.
- **`priority` belongs to the hero image and nothing else** (the header logo is the exception: it is
  tiny and above the fold).

## Loading states (global top bar)

Navigation loading is a single global `<NextTopLoader>` (accent green `#0F6B57`) mounted once in
`src/app/layout.tsx`. **There are no per-route `loading.tsx` files** — don't add them. Job progress
(extraction, discovery, rendering) is shown from Realtime on `ai_jobs`, not with route loading UI.

## Formatting: money and dates (`src/lib/format.ts`)

- **The UI is English only — no translations, no message files, no locale in the URL.** What
  varies per user is the **format** of numbers and dates:

  | Format | Money | Date | Date + time |
  |---|---|---|---|
  | `en-US` (default) | USD 1,234.50 · IDR 1,500,000 | Nov 4, 2026 | Nov 4, 2026, 14:05 UTC |
  | `en-ID` | USD 1.234,50 · IDR 1.500.000 | 4 Nov 2026 | 4 Nov 2026, 14.05 WIB |

  `en-ID` keeps English month names (`id-ID` would print "Agu", "Okt", "Des"). To offer another
  format, add it to `FORMAT_LOCALES` / `FORMAT_LOCALE_NAMES` and to the tests.
- **Get a formatter, then call `money` / `date` / `calendarDate` / `dateTime`:**
  - Server Components and Server Actions: `const format = await getFormatter()`
    (`src/lib/format-server.ts`).
  - Client Components: `const format = useFormatter()` (`components/providers/FormatProvider.tsx`).
  - No signed-in user (public site, emails): `createFormatter()` with the defaults.
- **Never** `toLocaleString()`, `Intl.*` inline, or hand-built strings for money and dates.
- **Money:** `format.money(amount, currency)` shows the ISO code, not a symbol ("$" is both USD and
  SGD). IDR has no decimals. Display only — every money figure comes from `calculate_quotation()`.
- **Dates:** `format.date(timestamptz)` converts into the user's time zone; `format.calendarDate(
  "2026-11-04")` is for `date` columns (validity, deadlines) and never shifts. Times are 24-hour
  with the zone shown.
- **The preference** lives in the `format_locale` cookie, set by `setFormatLocale()`
  (`src/lib/format-actions.ts`) from the sidebar picker. The `(app)` and `admin` layouts read it with
  `getFormatPrefs()` and pass it to `AppProviders`, so server and client format the same way. With
  auth: sign-in copies `profiles.format_locale` into the cookie, the profile page edits both, and the
  time zone comes from `profiles.timezone` (UTC until then, T1.1.1).
- Reading the cookie renders a route per request. That is fine for the workspace and `/admin`;
  **never call `getFormatPrefs()` / `getFormatter()` on the public site**, which stays static.

## Forms, Server Actions, data fetching, toasts

- **Forms:** React Hook Form + `zodResolver` + the shadcn **`Field`** components (`FieldGroup`,
  `Field`, `FieldLabel`, `FieldDescription`, `FieldError`) through RHF's `Controller`; put
  `data-invalid` on `Field` and `aria-invalid` on the control. The schema lives next to the action
  and is shared by the form (instant feedback) and the action (the real check).
- **Server Actions return `ActionResult<T>`** (`src/lib/forms/action-result.ts`) instead of
  throwing: `actionOk(data)`, `actionError(message)`, or `invalidInput(zodError, message)` after a
  failed `safeParse`. Always re-validate on the server; a Server Action is a public endpoint.
- **On the client**, `applyActionErrors(form, result)` puts each field error under its field (RHF
  dot paths, e.g. `items.0.quantity`) and toasts the message.

```tsx
// action (server):  const parsed = schema.safeParse(input);
//                   if (!parsed.success) return invalidInput(parsed.error);
//                   const { data, error } = await supabase.rpc("create_project", parsed.data);
//                   return error ? actionError("Could not create the project.") : actionOk({ id: data });
// form (client):    const result = await createProject(values);
//                   if (!result.ok) return applyActionErrors(form, result);
```

- **Data fetching:** pages read in Server Components (supabase-js with the user's session); writes go
  through Server Actions. **TanStack Query** (`AppProviders`) is for data the browser keeps fresh by
  itself — job progress next to Realtime, polling, search-as-you-type. Don't wrap ordinary page
  loads in `useQuery`.
- **Toasts:** `toast.success()` / `toast.error()` from `sonner`. The `<Toaster>` lives in
  `AppProviders` (workspace + admin), not on the public site.
- The old Swillfam `form-fields` (uncontrolled inputs + `useFormStatus`) suit simple admin forms that
  post `FormData`; use the RHF pattern for everything else.

## Admin building blocks (`src/components/admin/`)

Kept from Swillfam, Prisma-free, zinc-styled — use these instead of re-implementing:
`AdminTable` (`columns`/`getKey`/`empty`), `PageHeader` / `EditHeader` / `Card`, `SearchInput`,
`Pagination`, `form-fields` (`Field`, `TextareaField`, `CheckboxField`, `SelectField`, `SaveButton`,
…), `MultiSelectField`, `ConfirmDeleteButton`, `SeoDetailsPanel`, `JsonLdPreview`. Toasts come from
`sonner` (see above).

**Every admin list page includes:**
1. **Search** — `SearchInput` above the `Card`. It filters on typing (debounced 300ms, min 3 chars)
   via `?q=`. The server reads `q` from `searchParams` and applies `.ilike("<column>", `%${q}%`)`.
2. **Pagination** — `Pagination` below `AdminTable` inside the `Card`. Read `page` from
   `searchParams`, page size 20, and query with `.range(from, to)` and `{ count: "exact" }` in the
   same request. Type it: `searchParams: Promise<{ q?: string; page?: string }>`.

Every admin page and Server Action starts with the Super Admin guard once auth exists, and every
cross-tenant read/write by a Super Admin is written to `audit_logs` (by the RPC, not the UI).

## Confidentiality — rules for UI work

From CORE_FEATURES.md §1 and PLAN.md → Security:
- Everything an organization creates is **private by default**; never show one org's projects,
  suppliers, purchase prices, margins, quotations, templates or files to another.
- **An RFQ never contains prices or margins.** Selling prices and margins are never shared.
- **Nothing is published automatically** — publishing a saleable item or sharing a price is always an
  explicit action.
- Online prices are labelled honestly ("Lowest observed", "Lowest verified", …) and dated with a
  source — never "best market price".
- Show the **credit estimate before** any credit-consuming action (extraction, online search).
