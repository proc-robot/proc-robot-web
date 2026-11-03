# Proc-Robot — web

The Next.js frontend for **Proc-Robot**, an AI-powered procurement & quotation platform
(*from specification to quotation*). It contains the public marketing site, the signed-in
workspace and the Super Admin console. The backend is Supabase (Auth, Postgres + RLS, Storage,
Queues) plus a Railway worker — see `../PLAN.md`.

```bash
cp .env.example .env.local
npm install
npx playwright install chromium   # once, for the end-to-end tests
npm run dev        # http://localhost:3000
```

| URL | Section |
|---|---|
| `/` | Public site (indexable; SEO metadata, sitemap, JSON-LD) |
| `/dashboard`, `/projects`, … | Workspace (navy sidebar) |
| `/admin` | Super Admin console (zinc sidebar), incl. `/admin/seo` |

> ⚠️ The workspace and `/admin` have **no auth guard yet** (TASKS.md T0.3). Don't deploy them
> publicly before it lands.

Before committing: `npm run check && npm run build` (type check, lint, format check, unit tests,
build). After changes to routing, layouts or interactive UI, also `npm run test:e2e` (Playwright,
port 3210).

Conventions for working in this repo are in [`CLAUDE.md`](./CLAUDE.md). Product scope:
`../CORE_FEATURES.md`; build plan: `../PLAN.md`; progress: `../TASKS.md`; design: `../design/THEME.md`.

Hosting: Vercel (`iad1`). Production must set `NEXT_PUBLIC_SITE_URL="https://proc-robot.com"` at build
time and `SITE_INDEXABLE="true"`.
