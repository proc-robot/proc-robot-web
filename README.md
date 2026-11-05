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

# Database (needs Docker and the Supabase CLI)
npm run db:start   # local Supabase with all migrations and the demo seed
npm run db:test    # database tests (RLS, plan limits, onboarding, storage, jobs)
```

| URL | Section |
|---|---|
| `/` | Public site (indexable; SEO metadata, sitemap, JSON-LD) |
| `/dashboard`, `/projects`, … | Workspace (navy sidebar) |
| `/sign-in`, `/onboarding` | Sign-in (email link; Google from Phase 4) and organization setup |
| `/admin` | Super Admin console (zinc sidebar), incl. `/admin/seo` |

Sign in locally with any seeded user from `supabase/seed.sql` through the email link (it arrives in
Mailpit at http://127.0.0.1:54324), or sign up with any address.

### Accounts (Supabase, Vercel, Railway, …)

Creating and configuring every external account — including the hosted Supabase settings
(templates, token hook, redirect URLs) and, from Phase 4, the Google OAuth client — is described in
`../SETUP_ACCOUNT.md`. There is one hosted environment, `prod`: a merge to `main` goes live.

Google sign-in is built but off: it shows only with `GOOGLE_SIGN_IN="true"` and the provider
enabled in `supabase/config.toml` (see `CLAUDE.md` → Auth).

### Checks

Before committing: `npm run check && npm run build` (type check, lint, format check, unit tests,
build), and `npm run db:test` after database changes. After changes to routing, layouts, auth or
interactive UI, also `npm run test:e2e` (Playwright on port 3210; needs `npm run db:start`).

Conventions for working in this repo are in [`CLAUDE.md`](./CLAUDE.md). Product scope:
`../CORE_FEATURES.md`; build plan: `../PLAN.md`; progress: `../TASKS.md`; design: `../design/THEME.md`.

The background worker is a separate repo, `../proc-robot-worker`; the database it works against
(queues, `ai_jobs`, the `procrobot_worker` role) is defined here in `supabase/`.

Hosting: Vercel (`iad1`). Production must set `NEXT_PUBLIC_SITE_URL="https://proc-robot.com"` at build
time and `SITE_INDEXABLE="true"`.
