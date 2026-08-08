# Athens Holiday Market

The website and jury/admin system for the **Athens Holiday Market** — a juried, two-evening
market of handmade goods from local artists, held each December in the Big City Bread
courtyard in Athens, GA.

Live at **[athensholidaymarket.com](https://athensholidaymarket.com)**.

> **New here (human or AI agent)?** Read [AGENTS.md](AGENTS.md) first — this is Next.js 16,
> whose APIs and conventions differ from older training data. Then skim
> **[Working in this codebase](#working-in-this-codebase)** below for the non-obvious rules
> (no DB transactions, shared prod database, design-system-first, the auth/role model).

---

## What it does

**Public site** (`src/app/(site)`)
- Marketing home — hero drone video, live split-flap countdown, save-the-date, category showcase, mailing-list signup.
- Artist directory + individual artist pages (generated from accepted applications).
- Vendor application form with photo uploads, date-gated to the application window.
- Contact page with a spam-protected form and directions.
- A reduce-motion toggle + WCAG-AA pass; SEO metadata, sitemap, robots, OG card, favicon.

**Admin & jury console** (`src/app/admin`, magic-link auth)
- Multi-year application dashboard: medium-blend view, filtering, sortable table, cycle selector.
- Application detail: photo lightbox, grouped details, jury voting (Yes / Maybe / No with
  thumbs-up / mouthless / thumbs-down icons), per-juror roster, notes, participation history,
  and an email-delivery timeline.
- Status management (accept / waitlist / reject) + booth-fee tracking.
- **Email & Text hub** (`/admin/broadcasts`): decisions, named broadcasts with segments,
  templates, per-send open/click/bounce stats, "add recipient" (resend a past email to one
  person), tab deep-links, and per-recipient Resend delivery receipts. Event-day SMS via Twilio
  with recipient checkboxes (accepted artists / judges / other numbers).
- **PayPal booth-fee invoicing**: auto-send on acceptance, reminders, webhook auto-marks paid.
- Subscriber management (imported from MailChimp).

**Artist onboarding**
- Accepted artists build their own public page via a magic link; admins review before it goes live.
- **Add an artist** (Artist pages): bring in a non-juried artist (dropout replacement) — creates
  a `directAdd` accepted application and emails them a link to complete the real application form.
- **Exhibiting judges**: a judge can also run their own artist page from a dashboard card; one
  login holds both roles (see [auth model](#auth--roles)).

## Tech stack

- **[Next.js 16](https://nextjs.org)** (App Router, Server Components, Server Actions) + **React 19**
- **TypeScript** + **Tailwind CSS v4** (`@theme` tokens in `src/app/globals.css`)
- **[Drizzle ORM](https://orm.drizzle.team)** on **[Neon](https://neon.tech)** Postgres (`neon-http` driver)
- **[Resend](https://resend.com)** — transactional + broadcast email (delivery webhooks)
- **[Twilio](https://twilio.com)** — event-day SMS
- **[PayPal Invoicing v2](https://developer.paypal.com/docs/api/invoicing/v2/)** — booth fees
- **[Vercel Blob](https://vercel.com/storage/blob)** — artist/application photo uploads
- **[Anthropic API](https://docs.anthropic.com)** — optional AI proofreading on the application form
- Passwordless **magic-link auth** (jose-signed httpOnly cookie sessions)
- **[Central Icons](https://iconists.co/central)** for iconography (licensed)
- Hosted on **[Vercel](https://vercel.com)**; one **Vercel Cron** (`/api/cron/daily`) drives
  scheduled broadcasts, booth-fee reminders, and page-build nudges.

## Getting started

```bash
npm install          # requires CENTRAL_LICENSE_KEY in the environment (licensed icon package)
cp .env.local.example .env.local   # then fill in the values below
npm run db:migrate   # apply the schema to your database
npm run dev          # http://localhost:3000
```

### Environment variables (`.env.local`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection string |
| `AUTH_SECRET` | Secret for signing session cookies |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for links in emails/redirects (falls back to `VERCEL_URL`) |
| `ADMIN_EMAILS` / `JUDGE_EMAILS` | Comma-separated allowlists that bootstrap admin/judge roles |
| `RESEND_API_KEY` / `RESEND_WEBHOOK_SECRET` | Email sending + delivery-receipt webhook verification |
| `EMAIL_FROM` | From address (default `hello@athensholidaymarket.com`) |
| `CONTACT_FORM_TO` | Where the contact form delivers |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob uploads |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | SMS |
| `JUDGE_PHONES` | Comma-separated numbers for the Text tab "Judges" option (kept in env — repo is public) |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_WEBHOOK_ID` | PayPal invoicing + webhook verify |
| `PAYPAL_ENV` | `sandbox` (default) or `live` |
| `ANTHROPIC_API_KEY` | AI proofread helper on the application form (optional) |
| `CRON_SECRET` | Authorizes the daily cron route |
| `CENTRAL_LICENSE_KEY` | Central Icons license — needed at **install** time |
| `ADMIN_DEV_BYPASS` / `ADMIN_DEV_EMAIL` | Non-prod only: sign in as an admin without email. Never set in production. |

Optional: `NPR_REMINDER_EMAIL` / `NPR_REMINDER_PHONE`, `SOCIAL_POSTING_TEAM` for the social-kit reminders.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a Drizzle migration from schema changes |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Seed local data |

## Project structure

```
src/
  app/
    (site)/        Public pages (home, apply, artists, contact, venue, unsubscribe)
    admin/         Jury/admin console (magic-link protected)
    artist/        Artist portal — build/edit your page; /artist/finish completes a direct-add
    api/           Route handlers (apply, uploads, Resend + PayPal + Resend webhooks, cron, …)
    auth/verify/   Magic-link consumption → session
    style/         Living design-system reference (/style)
  components/
    ui/            Design-system primitives (Button, Card, Field, Badge, StatusMessage, …)
    admin/         Admin widgets (composer, controls, tables, badges/VoteTally, …)
    artist/        Artist-portal editor + share panel
    icons.tsx      Central Icons barrel (import icons from here)
  db/              Drizzle schema + seed
  lib/             Data access, server actions, mediums, email/SMS/PayPal, auth
drizzle/           Generated SQL migrations + journal
scripts/           One-off imports, normalization, backfills
```

## Domain model (key tables — `src/db/schema.ts`)

- **cycles** — one per market year; exactly one `isActive`. Everything is scoped to a cycle.
- **applications** — the participation record. `status` (submitted→under_review→accepted/waitlisted/rejected),
  `directAdd` (added outside the jury round), photos, medium, booth-fee + decision-email + PayPal tracking.
- **artists** — the public page, seeded from an accepted application (`ensureArtistForApplication` /
  `publishArtist`). Edits are held in `pendingContent` until an admin approves.
- **users** — staff allowlist, `role` = `admin | judge`. (`artist` is an app-level role resolved
  from an accepted application, not a DB row.)
- **broadcasts / broadcastRecipients** — emails + per-recipient delivery receipts.
- **login_tokens** — single-use, hashed, expiring magic-link tokens.

## Working in this codebase

Conventions and gotchas that aren't obvious from the code — read before making changes:

- **Read [AGENTS.md](AGENTS.md).** This is Next.js 16; verify APIs against the installed docs
  rather than memory. The dev server rewrites the agent block in that file.
- **One shared database.** Local dev and production point at the same Neon DB. Migrations and
  data scripts you run locally hit prod data. Prefer additive, idempotent changes; clean up test rows.
- **No transactions.** The `neon-http` driver has no transaction support. Sequence writes to be
  idempotent (e.g. insert-then-delete, `onConflict`, re-query on race) instead of wrapping in a tx.
- **Migrations:** edit `src/db/schema.ts` → `npm run db:generate` → `npm run db:migrate`. Commit the
  generated `drizzle/*.sql` with your change.
- **Design-system first.** `src/app/style` (`/style`) is the living reference and renders the *real*
  components. Build UI from `src/components/ui/*` primitives. Inline text links use the `.link` class
  (globals.css). Jury vote states come from `VOTE_STATES` in `components/admin/badges.tsx`. When you
  make a broad style change, update `/style` in the same pass.
- **Admin headings = nav labels.** Each admin page's `<h1>` matches its nav label in `admin-nav.tsx`.
- **Icons** are Central Icons, imported through `src/components/icons.tsx`. Add new ones there by
  re-exporting from `@central-icons-react/round-outlined-radius-1-stroke-2/<Name>`.
- <a name="auth--roles"></a>**Auth & roles.** Magic-link only. `resolveIdentity(email)` returns a single
  role, staff-first (admin → judge → artist-if-accepted-application). Portal access is granted by
  email via `requireArtistAccess()`, independent of staff role — that's how a **judge can also exhibit**
  (dual role) on one login. Server-side gates live in `src/lib/admin-auth.ts`.
- **The application window** opens/closes by dates in `src/lib/site.ts` (no deploy needed). Staff can
  preview the live form early at `/apply?preview=1`. Direct-add invitees complete the form
  authenticated, bypassing the window.
- **Medium categories** are normalized from free-text mediums by a keyword categorizer
  (`src/lib/mediums.ts`).
- **Keep this README current.** When you add a feature, integration, env var, or convention, update
  the relevant section here so the next collaborator (human or agent) has what they need.

---

Private project for the Athens Holiday Market at Big City Bread.
