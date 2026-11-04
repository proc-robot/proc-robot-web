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
| `/sign-in`, `/onboarding` | Sign-in (Google or email link) and organization setup |
| `/admin` | Super Admin console (zinc sidebar), incl. `/admin/seo` |

Sign in locally with any seeded user from `supabase/seed.sql` through the email link (it arrives in
Mailpit at http://127.0.0.1:54324), or sign up with any address.

### Google sign-in setup (TASKS.md T0.3.1)

1. In Google Cloud Console, open **Google Auth Platform** and set up **Branding**:
   - app name "Proc-Robot", a support email and the logo;
   - the home page `https://proc-robot.com`, plus links to the privacy policy and terms;
   - authorized domains `proc-robot.com` and `supabase.co`.

   Then set **Audience** to External. **Data access** needs only `openid`, `email` and
   `profile`; these are non-sensitive scopes, so Google checks the branding only, not a security
   review.
2. **Clients → Create client → Web application**, one per environment:
   - **Local:** JavaScript origin `http://localhost:3000`, redirect URI
     `http://127.0.0.1:54321/auth/v1/callback`.
   - **Hosted:** JavaScript origin `https://app.proc-robot.com`, redirect URI
     `https://<project-ref>.supabase.co/auth/v1/callback`.
3. **Local:** copy `supabase/.env.example` to `supabase/.env`, fill in the client id and secret,
   then run `npm run db:stop && npm run db:start`.
4. **Hosted:** in the Supabase dashboard, configure:
   - **Auth → Providers → Google:** the client id and secret.
   - **Auth → URL Configuration:** Site URL `https://app.proc-robot.com`, and the redirect
     allow list `https://app.proc-robot.com/**`.
   - **Auth → Emails:** the two templates in `supabase/templates/`.
   - **Auth → Hooks:** the custom access token hook.
5. Brand verification needs the privacy policy and terms pages live on `proc-robot.com`
   (TASKS.md T1.13.5), and the domain verified in Google Search Console.

### Checks

Before committing: `npm run check && npm run build` (type check, lint, format check, unit tests,
build), and `npm run db:test` after database changes. After changes to routing, layouts, auth or
interactive UI, also `npm run test:e2e` (Playwright on port 3210; needs `npm run db:start`).

Conventions for working in this repo are in [`CLAUDE.md`](./CLAUDE.md). Product scope:
`../CORE_FEATURES.md`; build plan: `../PLAN.md`; progress: `../TASKS.md`; design: `../design/THEME.md`.

Hosting: Vercel (`iad1`). Production must set `NEXT_PUBLIC_SITE_URL="https://proc-robot.com"` at build
time and `SITE_INDEXABLE="true"`.
