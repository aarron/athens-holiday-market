# Athens Holiday Market

The website and jury/admin system for the **Athens Holiday Market** — a juried, two-evening
market of handmade goods from local artists, held each December in the Big City Bread
courtyard in Athens, GA.

Live at **[athensholidaymarket.com](https://athensholidaymarket.com)**.

---

## What it does

**Public site**
- Marketing home page — hero drone video, live split-flap countdown, save-the-date, category
  showcase, mailing-list signup.
- Artist directory + individual artist pages (auto-generated from accepted applications).
- Vendor application form with photo uploads, date-gated to the application window.
- Contact page with a spam-protected form and directions.
- SEO: per-page metadata, sitemap, robots, Open Graph card, brand favicon.

**Admin & jury console** (`/admin`, magic-link auth)
- Multi-year application dashboard with medium-blend view, filtering, and a sortable table.
- Application detail: photo lightbox, grouped artist details, jury voting (Yes / Maybe / No),
  per-juror tally, notes, participation history, and an email-delivery timeline.
- Status management (accept / waitlist / reject) + booth-fee tracking.
- **Email hub** — batch decision emails with a high-stakes confirmation screen, general
  broadcasts with segments and templates, and per-recipient Resend delivery receipts.
- **Text artists** — event-day SMS to accepted artists via Twilio, with a test send and a
  type-to-confirm gate.
- Subscriber management (imported from MailChimp).
- Artists can build their own public page via a magic link; admins review before it goes live.

## Tech stack

- **[Next.js 16](https://nextjs.org)** (App Router, Server Components, Server Actions) + **React 19**
- **TypeScript** + **Tailwind CSS v4**
- **[Drizzle ORM](https://orm.drizzle.team)** on **[Neon](https://neon.tech)** Postgres
- **[Resend](https://resend.com)** for transactional + broadcast email (delivery webhooks)
- **[Twilio](https://twilio.com)** for event-day SMS
- **[Vercel Blob](https://vercel.com/storage/blob)** for artist photo uploads
- Passwordless **magic-link auth** (jose-signed httpOnly cookie sessions)
- **[Central Icons](https://iconists.co/central)** for iconography
- Hosted on **[Vercel](https://vercel.com)**

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
| `RESEND_API_KEY` | Email sending |
| `RESEND_WEBHOOK_SECRET` | Verifies Resend delivery webhooks |
| `EMAIL_FROM` | From address (default `hello@athensholidaymarket.com`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob uploads |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | SMS |
| `CENTRAL_LICENSE_KEY` | Central Icons license (needed at **install** time) |

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
    (site)/        Public pages (home, apply, artists, contact)
    admin/         Jury/admin console (magic-link protected)
    api/           Route handlers (apply, contact, subscribe, Resend webhook, …)
  components/      UI — brand mark, forms, admin widgets, icons barrel
  db/              Drizzle schema + seed
  lib/             Data access, server actions, mediums, email/SMS, auth
scripts/           One-off imports, normalization, OG image assets
```

## Notes

- **Medium categories** are normalized from free-text application mediums by a keyword
  categorizer (`src/lib/mediums.ts`); re-run with `scripts/normalize-mediums.ts`.
- The application window opens/closes automatically based on dates in `src/lib/site.ts`
  (no deploy needed). Staff can preview the live form early at `/apply?preview=1`.
- The brand flower mark is a single shared SVG mask (`FlowerDefs`), so it scales cleanly
  on any background.

---

Private project for the Athens Holiday Market at Big City Bread.
