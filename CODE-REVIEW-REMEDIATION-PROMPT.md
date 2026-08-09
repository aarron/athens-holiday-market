# Holiday Market — Code Review Remediation Prompt

You are improving the **Athens Holiday Market** app (Next.js 16 App Router, React 19, Drizzle + Neon Postgres, custom magic-link auth, Resend/Twilio/PayPal). This prompt is the output of a full-codebase review. Every finding below was read and verified against current code; `file:line` references are accurate as of this review.

> **Start with the [★ Blast-radius safety](#-blast-radius-safety--the-biggest-operational-risks-do-these-with-p0) section (risks R1–R6, tasks 25–29) — it covers the failures that hurt most: errant emails/texts, mis-clicked accept/reject, and unsafe published content. Do those alongside P0.**

## How to work

- **Read `AGENTS.md` first.** This is a customized Next.js build; check `node_modules/next/dist/docs/` for version-specific APIs before writing framework code. **Do not delete the auto-generated agent block from `AGENTS.md`** — commit it with your work so the tree stays clean.
- Work **top-down by priority** (P0 → P3). P0 and P1 are the point of this pass; P2/P3 are opportunistic.
- After each change: `npm run typecheck` and `npm run lint` must stay clean (typecheck currently passes; keep it that way). The dev server can be previewed for UI changes.
- **Neon HTTP driver caveat:** `drizzle-orm/neon-http` does **not** support interactive transactions. Where I ask for atomicity, use the batched form `db.batch([...])` (or a single statement), not `db.transaction(async (tx) => …)`.
- Prefer small, reviewable commits grouped by finding.

## Do NOT "fix" these — they are correct by design

So you don't waste effort or regress working behavior:

- `email-template.ts` (singular: `emailShell`/`renderMarkdown`) and `email-templates.ts` (plural: `getBroadcastTemplates` seed data) are **different live modules**, not duplicates. Likewise `resend.ts` (client + `EMAIL_FROM`) vs `emails.ts` (send functions). All four are imported and used. (You may *rename* them for clarity — see P3 — but don't merge or delete.)
- `renderMarkdown` escapes HTML before the `dangerouslySetInnerHTML` in `composer.tsx`/`decision-sender.tsx` — this is **not** an XSS hole.
- `ADMIN_DEV_BYPASS` is hard-gated to `NODE_ENV !== "production"` — a legitimate local convenience, not a prod backdoor.
- The booth-fee reminder path (`booth-fee.ts`) and the Resend-webhook status `RANK` gate are already idempotent/replay-safe. Leave them.
- The public site's semantics, heading hierarchy, landmarks, `next/image` usage on the home page, `prefers-reduced-motion` handling, and skip link are strong — don't churn them.

---

## P0 — Critical (security). Do these first.

### 1. Session JWT falls back to a public, hardcoded secret → admin-session forgery
`src/lib/session.ts:7-9` signs/verifies session JWTs with `process.env.AUTH_SECRET || "dev-insecure-secret-change-me-please"`. `src/lib/env.ts:8` deliberately treats empty env vars as unset and never fails the build. **This repo is public.** If a production deploy is missing `AUTH_SECRET`, anyone can mint `{email, role:"admin"}` and forge a full admin session (`getSessionUser` trusts the token's `role` claim verbatim — `admin-auth.ts:23-25`).

**Fix:** fail closed. Throw at module load / startup when `AUTH_SECRET` is missing in production (e.g. require it in `serverSchema` when `NODE_ENV === "production"`, or `throw` in `session.ts` instead of using the literal fallback). Keep a dev-only fallback guarded by `NODE_ENV !== "production"`. After deploying, rotate `AUTH_SECRET` (also invalidates any tokens forged with the old literal).
**Acceptance:** a prod build with no `AUTH_SECRET` refuses to boot; dev still works.

### 2. Role is frozen in a 30-day JWT with no revocation
`session.ts:18` (`MAX_AGE_DAYS = 30`) + `admin-auth.ts:23-25`: `getSessionUser` reads `role`/`artistId` straight from the cookie and never re-checks the DB/bootstrap lists. Removing someone from `ADMIN_EMAILS`, deleting their `users` row, demoting a judge, or un-accepting an artist does **not** revoke their access for up to 30 days.

**Fix:** re-resolve authority from source on each request — call `resolveIdentity(session.email)` (`magic.ts:12`) in `getSessionUser` and use *that* role, treating the cookie as identity only; return null if identity no longer resolves. (Cache within the request if needed.) Alternatively add a `tokenVersion`/session-store you can bump. Also shorten `MAX_AGE_DAYS` (e.g. 7).
**Acceptance:** removing an email from the admin allowlist locks that user out on their next request.

### 3. Abuse-prone unauthenticated endpoints (no rate limiting)
There is a real per-IP DB rate limiter already used by the contact form (`api/contact/route.ts:39-64`) — reuse that pattern.
- `src/lib/proofread-actions.ts:20-46` — public server action that calls the **Anthropic API on the shared key** from the unauthenticated apply form. Length-capped only. Anyone can loop it to burn quota/budget.
- `src/app/api/apply/upload/route.ts:12-32` — issues Vercel **Blob upload tokens** to anyone while the apply window is open (type/size constrained, but unlimited count) → storage/bandwidth abuse.
- `src/lib/auth-actions.ts:12-23` + `magic.ts:36-44` — `requestMagicLink` sends an email + inserts a token row per call, no throttle → email-bombing a known staff address + unbounded `login_tokens` growth (enumeration is correctly prevented; only throttling is missing).

**Fix:** add per-IP (and per-target-email for magic links) rate limiting to all three; prune expired `login_tokens`. Keep the generic non-enumerating responses.

### 4. Add baseline security headers
`next.config.ts` is empty — no HSTS, `X-Content-Type-Options`, `Referrer-Policy`, frame protection, or CSP. Add a `headers()` block with sensible defaults (start report-only for CSP if unsure).

### 5. State-changing GET on unsubscribe
`src/app/api/unsubscribe/route.ts:15-19` unsubscribes on **GET** before redirecting, so email-client link prefetchers/scanners silently unsubscribe people. (RFC 8058 one-click POST is already correct.) **Fix:** GET renders a confirm page; only POST mutates.

---

## P1 — High (correctness / data integrity). These send real emails to real people.

### 6. Decision emails re-send to the entire group on a repeat click
`src/lib/decision-actions.ts:45-48` selects **every** application in the group with no `decisionSentAt` guard, so clicking "Send" twice — or re-opening the group after adding one late acceptance — re-emails everyone "You're in!". Also the failure branch (`:82`) stamps `decisionSentAt = now` even on failure, which will wrongly suppress retries once a guard exists.
**Fix:** add `isNull(applications.decisionSentAt)` (or exclude `decisionEmailStatus = 'sent'`) to the where clause; don't set `decisionSentAt` on the failure path. Guard the transition so concurrent runs can't both claim the same rows.

### 7. Event reminder marks itself "sent" even when zero actually sent
`src/lib/event-reminders.ts:131-163` checks a sent-flag, loops `resend.emails.send` one-by-one over the whole list, then sets the flag **unconditionally** after the loop (`:159`) — even if every send threw. Result: a transient Resend outage marks the reminder sent forever (never retried). The check→set window also spans the entire loop with no atomic claim (double-send risk if re-invoked). Contrast `npr-flagpole-reminder.ts:73` and `artist-reminders.ts:58`, which correctly stamp only on success.
**Fix:** only set the flag when `sent > 0`; claim the flag atomically **before** sending (e.g. insert the settings flag with `onConflictDoNothing`, bail if not claimed). Switch to `resend.batch.send` (as `deliverBroadcast` does) instead of N sequential calls.

### 8. "Send now" broadcast + `deliverBroadcast` have no idempotency/claim
`src/lib/broadcast-actions.ts:94-103`: the draft path guards with `where status='draft'`, but the non-draft path always `insert`s a fresh broadcast and sends the segment again — a double-click sends twice. `src/lib/broadcast-send.ts:45-48` flips status to `sending` with **no `where` predicate**, so it's not a concurrency guard either, and `runScheduledBroadcasts` (`:86-100`) doesn't atomically claim a scheduled row before sending.
**Fix:** make the `draft/scheduled → sending` transition a conditional `UPDATE … WHERE status IN ('draft','scheduled') RETURNING`, and only proceed if a row was claimed. Consider a client idempotency token for the button.

### 9. Non-atomic multi-write sequences can orphan data
Use `db.batch([...])` (neon-http-safe) to make these atomic:
- `admin-actions.ts` `publishArtist` (`:127-132`, `:145-164`) and `approveArtistSubmission` (`:228-249`): `delete artistPhotos` then `insert` — a mid-way failure leaves an artist with **zero photos**.
- `api/apply/route.ts:59-80`: application insert then photos insert — a photo failure orphans an application with no images.
- `broadcast-send.ts:47,80-81`: `recipientCount` set up front, recipient rows inserted later — a crash between leaves count ≠ rows.

Also `publishArtist`'s slug loop (`admin-actions.ts:143`) is check-then-insert: two concurrent publishes can pick the same slug. Rely on the unique constraint + retry rather than pre-checking. (Same pattern in `magic.ts:75`.)

### 10. Default `<button type>` is `submit` — proofread controls submit the application form
`src/components/ui/button.tsx:55` renders `<button>` with **no default `type`**, so it's `type="submit"`. `ProofreadField` (`src/components/proofread-field.tsx:81,91,114`) renders `Button`s with no `type`, and it lives inside `<form onSubmit=…>` (`application-form.tsx:131,248,276`). Clicking **"Check grammar & spelling"**, **"Polish for clarity"**, or **"Use this"** submits/validates the application instead of doing its job (WCAG 3.2.2; keyboard Enter hits the same trap).
**Fix:** default `type="button"` in `ui/button.tsx` (real submit buttons already pass `type="submit"` explicitly, so this is safe), or add `type="button"` to the four ProofreadField buttons.

---

## P2 — Medium (robustness, performance, accessibility)

### 11. Add missing DB indexes (all are hot, currently sequential scans)
In `src/db/schema.ts`:
- `applications.decisionResendId` — looked up on **every** Resend webhook (`api/resend/webhook/route.ts:86`), which fires per open/click/delivery. (The parallel `broadcastRecipients.resendId` is indexed; this one isn't.)
- `applications.paypalInvoiceId` — PayPal webhook `where` (`api/paypal/webhook/route.ts:43`).
- `applications(cycleId, status)` — hot filter in decisions, booth-fee, reminders, scheduled-sends (only `(cycleId, email)` exists today).
- `artists.published` — every public page render; `artists.applicationId` — joined in reminders/scheduled-sends and `findFirst` in publish/unpublish.
- Consider functional `lower(email)` indexes on `applications.email` and `broadcastRecipients.email` (used by `admin-data.ts:34,82,86`, `broadcast-data.ts:49`).

Generate a migration (`npm run db:generate`) — don't hand-edit generated SQL.

### 12. No `error.tsx` / `loading.tsx` boundaries anywhere
Only `src/app/not-found.tsx` exists — no `error.tsx`, `global-error.tsx`, `loading.tsx`, or `Suspense` in the tree. A thrown Server Component/action (DB down) shows the bare Next error screen. **Fix:** add an `error.tsx` (client, with `reset()`) under `(site)` and `admin/(protected)`, and `loading.tsx`/`<Suspense>` for the data-heavy admin and `/artists` pages.

### 13. Admin optimistic UI never rolls back on failure
`src/components/admin/controls.tsx`: `VoteButtons` (`:38-41`) and `DecisionControls` (`:114-117,132-135`) commit `setCurrent`/`setPaid` independently of the server action, which returns `void` — so a failed `castVote`/`setStatus` (network drop, auth redirect) leaves the UI showing a vote/decision that never persisted. **Fix:** use React 19 `useOptimistic` (auto-reverts on rejected transition), or have the actions return `{ ok }` and reconcile/restore prior state in a `.catch`.

### 14. Public artist photos bypass `next/image`
`src/app/(site)/artists/page.tsx` (via `SafeImg`) and `artists/[slug]/page.tsx:98` render Vercel-Blob uploads through `SafeImg` — a raw `<img>` with no width/height (`components/admin/safe-img.tsx:31`). These are the most image-heavy, SEO-facing public pages; the home page correctly uses `next/image`. **Fix:** use `next/image` (fixed dims or `fill` + `sizes`) on the public pages, keeping the branded `onError` fallback. `SafeImg`'s raw `<img>` is legitimately needed only for admin's hotlink-blocked Google-Drive thumbnails — leave that use.

### 15. Announce form errors in the three remaining forms
Errors render as bare `<p>` (no `role`/`aria-live`), so screen readers get nothing on failure (WCAG 4.1.3): `contact-form.tsx:133`, `subscribe-form.tsx:101-103`, `magic-link-form.tsx:42`. **Fix:** wrap in `role="alert"` or reuse `<StatusMessage tone="error">`.

### 16. Hero label contrast over video
`src/app/(site)/page.tsx`: `text-white/60` quick-fact labels (`:63,73,80`) and "Scroll" hint (`:98`) over the mid scrim band (`ink/45`, `:44`) can fall below 4.5:1 on bright frames (WCAG 1.4.3). **Fix:** raise labels to `text-white/80`+ and/or deepen the mid scrim stop; verify against the brightest video/poster frame.

### 17. Efficiency: batch the N+1 loops
- `decision-actions.ts:66-77` — one sequential `UPDATE … WHERE id = …` per applicant over Neon HTTP. Batch into a single `UPDATE … WHERE id IN (…)` (CASE for `decisionResendId`) or `db.batch`.
- `broadcast-data.ts:71-85` (`segmentCounts`) runs ~6 sequential queries and re-runs the full segment join per cycle-segment; `scheduled-sends.ts:53` calls the whole thing just for `counts.all`. Compute only the count needed and parallelize the rest.
- `admin-data.ts:217-219` (`countPendingArtistReviews`) selects all ids then `.length` — use `count(*)`.

---

## P3 — Low (clarity, dead code, reuse)

18. **Rename the confusingly-named modules** (don't merge): `email-template.ts` → `email-shell.ts`, `email-templates.ts` → `broadcast-templates.ts`, `resend.ts` → `resend-client.ts`. Update imports.
19. **Remove or document the unscheduled duplicate cron routes** `api/cron/event-reminders` and `api/cron/artist-reminders` — `vercel.json` schedules only `/api/cron/daily`, which already runs both. They're dead entry points and a double-send footgun if ever re-scheduled.
20. **De-duplicate `chunk` and `personalize`** — defined/exported in `broadcast-send.ts` and re-implemented in `decision-actions.ts:25-36`. Import the shared copies.
21. **Consolidate the two "current cycle" resolvers** — `getActiveCycle` (`isActive`-based, used by sends/booth-fee/reminders) vs `getJudgingCycle` (`admin-data.ts:121`, max-application-count). If `isActive` isn't set they diverge from what judges see. Pick one source of truth.
22. **Route hand-rolled inputs through `ui/field.tsx`** — `application-form.tsx:33-36`, `subscribe-form.tsx:64-76`, `magic-link-form.tsx:30-37`, `subscribers-table.tsx:87-113` each re-implement the same input recipe (already drifting: `h-14`/`border-ink/20` vs `field.tsx`'s `h-11`/`border-ink/15`). `Field` also gives free label+error+`aria-describedby` wiring.
23. **`.env.example` is missing live vars** — `CRON_SECRET`, `RESEND_WEBHOOK_SECRET`, `TWILIO_*`, `ANTHROPIC_API_KEY`, `PAYPAL_ENV`, `CONTACT_FORM_TO`, `NPR_REMINDER_*`, `SOCIAL_POSTING_TEAM` are read in code but undocumented. Add them (this compounds P0#1: an operator following `.env.example` wouldn't know `AUTH_SECRET` is mandatory or that `CRON_SECRET` gates the crons).
24. **Lint nits:** `markdown-toolbar.tsx:112` (real error: ref accessed during render — `react-hooks/refs`), `share-panel.tsx:29` unused `first`, `snow.tsx:83` / `booth-fee.ts:62` unused-expression warnings. Also add multiple-`<nav>` labels: `site-header.tsx:47,95` (`aria-label="Primary"` / `"Mobile"`).

---

# ★ Blast-radius safety — the biggest operational risks (do these WITH P0)

This app emails and texts real people, makes accept/reject calls that affect real artists, and publishes self-submitted content to a public site. The failures that hurt most aren't crashes — they're an **irreversible message to the wrong people, a mis-clicked decision, or unsafe content going live.** Ranked by blast radius. Each references the concrete implementation task numbers below.

### R1 — SMS blast has no confirmation, no idempotency, and no record (highest risk)
- **Blast radius:** an irreversible text to every accepted artist's personal phone. Cannot be recalled; SMS mistakes are the most visible and least forgivable.
- **Current state:** `TextArtists` (`src/components/admin/text-artists.tsx:127`) sends on a **single "Send Text" click** with the **"Accepted artists" box checked by default** (`:15`). No confirm step, no forced test-send, and `sendEventText` (`src/lib/sms-actions.ts:86`) has **no idempotency** (a second click / retry re-texts everyone who already succeeded) and **stores no per-recipient record** (unlike broadcasts). This is glaringly inconsistent with the email flows, which are well-gated — and a recent commit *removed* the SMS send-gate.
- **Mitigation:** bring SMS up to the decision-email bar → **task 25**.

### R2 — Decision emails re-send to the ENTIRE group; wrong-cohort risk
- **Blast radius:** every accepted (or rejected/waitlisted) applicant gets a second "You're in!" / "Unfortunately…" email; or, if the active cycle is mis-resolved, the *wrong year's* cohort is emailed.
- **Current state:** `sendDecisionBatch` (`src/lib/decision-actions.ts:45-48`) selects the whole group with **no `decisionSentAt` filter**, so adding one late acceptance and re-sending re-emails everyone. The UI honestly *discloses* "N have already been notified and will be re-sent" (`decision-sender.tsx:89`) but offers **no way to target only the not-yet-notified**. The failure branch also stamps `decisionSentAt` on failure (`:82`). Separately, two competing "active cycle" resolvers (task 21) can bind a segment/decision send to the wrong cycle. The typed-"SEND" gate here is otherwise excellent — keep it.
- **Mitigation:** **task 6** (default to `isNull(decisionSentAt)`, opt-in re-send, never stamp on failure) + **task 21** (one cycle resolver).

### R3 — Accidental accept/reject: one-click, optimistic, no confirm, no rollback, no audit
- **Blast radius:** flipping an application to **accepted** silently grants that email **portal login** (`resolveIdentity` treats any accepted app as an artist — `magic.ts:23-28`) and pulls them into **every future accepted-artist email, SMS, and logistics batch**; flipping to **rejected** mis-tags them for the next decision send. A stray click is enough.
- **Current state:** the Decision buttons (`src/components/admin/controls.tsx:114-117`) do `setCur(s); start(() => setStatus(...))` — optimistic, **no confirmation**, and `setStatus` returns `void` so a failed write leaves the UI lying (see task 13). No record of who changed a decision or when. The per-application `sendDecision` (`admin-actions.ts:70`) also emails a decision immediately with no confirm.
- **Mitigation:** **task 26** (confirm + reconcile on decision changes) + **task 27** (audit log).

### R4 — Unsafe published content: social links skip URL sanitization; approve trusts raw input
- **Blast radius:** a phishing/redirect link or malicious/mislabeled social rendered on a public artist page under your domain. (True script injection is largely contained — statement/bio render as **React-escaped text**, and `website` is sanitized at display via `cleanUrl` — so this is phishing/offensive-content, not stored XSS. Don't downgrade it for that reason: it's still your brand hosting hostile links.)
- **Current state:** social links render with a **raw `href`** and **no `cleanUrl`** (`artists/[slug]/page.tsx:143-149`); **arbitrary social keys become visible labels** (unknown key → label = the key string). `submitArtistDraft` stores `website`/`socials` as unvalidated strings (`artist-actions.ts:14-15`), and `approveArtistSubmission`/`publishArtist` copy them **live without re-validation** (`admin-actions.ts:228-241`, `:118-158`) — sanitization rests entirely on an admin eyeballing the draft.
- **Mitigation:** **task 28** (sanitize every outbound artist URL on write *and* render; whitelist social keys).

### R5 — Slow/still-cached takedown of offensive photos or copy
- **Blast radius:** an offensive image or text stays live after you try to pull it. Photos have no automated moderation (reasonable) — but the *takedown* path must be instant.
- **Current state:** the only lever is `unpublishArtist` (`admin-actions.ts:198`). The public `[slug]` page uses `export const revalidate = 300` + `generateStaticParams` (`artists/[slug]/page.tsx:33-38`), so a taken-down page can serve from ISR/static cache for **up to 5 minutes**. `unpublishArtist` revalidates `/artists` but not the specific `/artists/${slug}`.
- **Mitigation:** **task 29** (make takedown immediate + a one-click "take down now").

### R6 — No audit trail for any high-stakes action
- **Blast radius:** when something goes wrong (who texted everyone? who rejected this artist? who deleted this application?), there's **no way to answer it.** For a system with irreversible outward actions, the absence of a log is itself a top risk.
- **Current state:** no audit/event table exists anywhere in `schema.ts`; SMS sends in particular persist nothing.
- **Mitigation:** **task 27** (append-only `admin_events` log).

**Bottom line:** the email decision flow and artist-approval flow are already well-guarded (typed-"SEND" gate, arm-then-confirm, honest re-send disclosure, delete confirmation) — **the gaps are SMS (R1), the decision re-send logic (R2), one-click status changes (R3), un-sanitized artist URLs (R4), takedown latency (R5), and the missing audit log (R6).** Bring the weak paths up to the standard the strong ones already set.

## Operational-safety tasks (implement the mitigations above)

### 25. Gate the SMS blast like the decision emails (R1)
In `text-artists.tsx` / `sms-actions.ts`: (a) add a confirmation step showing the **resolved** recipient count and a sample (server-computed, not the rough client estimate at `text-artists.tsx:29`) — reuse the decision-sender's checkbox + type-"SEND" pattern, or at minimum a two-step arm/confirm like `ReviewControls`; (b) **require a test-to-self send** before the real send is enabled; (c) default the "Accepted artists" checkbox to **unchecked**; (d) make `sendEventText` idempotent (accept a client token / disable-and-claim so a double-submit can't re-blast); (e) **persist a send record** (a `text_sends` + recipients table, or rows in a shared send log) so texts are auditable and retries can skip already-sent numbers.
**Acceptance:** you cannot text the list without an explicit confirm; a double-click sends once; the send is queryable afterward.

### 26. Confirm + reconcile decision (accept/reject/waitlist) changes (R3)
In `controls.tsx`, require a confirmation for transitions into `accepted` / `rejected` / `waitlisted` (a stray click shouldn't grant login or queue someone for a blast). Have `setStatus` return `{ ok }` and reconcile the optimistic state on failure (ties into task 13 / `useOptimistic`). Show what accepting implies ("grants portal login and includes them in accepted-artist emails/texts").
**Acceptance:** changing a decision takes a deliberate confirm; a failed write reverts the button.

### 27. Add an append-only admin audit log (R3, R6)
New `admin_events` table (actor email, action, target type/id, summary, `createdAt`). Write to it from every outward/irreversible action: decision-batch sends, SMS sends, broadcast sends, status changes, publish/unpublish, and `deleteApplication`. Surface a simple read-only view in admin.
**Acceptance:** every send and every decision change leaves a row naming who did it and when.

### 28. Sanitize all artist-supplied URLs on write and render (R4)
Route **every** outbound artist URL through `cleanUrl` — the website link already is; apply the same to **each social** in `artists/[slug]/page.tsx:143-149` (drop any that don't sanitize). Validate `website`/`socials` in the `submitArtistDraft` zod schema (`artist-actions.ts:11-18`) and again when promoting to live in `approveArtistSubmission`/`publishArtist`. **Whitelist social keys** to the known set (instagram/facebook/tiktok/youtube/x/etsy) so arbitrary keys can't render as labels.
**Acceptance:** a social value of `javascript:…`, `data:…`, or a bare/garbage string is dropped, not linked; unknown platform keys don't appear on the page.

### 29. Make content takedown immediate (R5)
`unpublishArtist` must `revalidatePath('/artists/${slug}')` (and `/artists`) so a pulled page clears from ISR/static cache at once; verify the `[slug]` route's `revalidate = 300` + `generateStaticParams` don't keep serving it. Consider a prominent one-click "Take down now" on the admin artist page.
**Acceptance:** unpublishing an artist hides the public page on the next request, not up to 5 minutes later.

---

## What's already strong (context, not tasks)
Auth is re-checked server-side inside every mutation (`requireAdmin`/`requireStaff`/`requireArtist`), IDs derive from the session (no IDOR), `revalidatePath` coverage is thorough, magic tokens are hashed/single-use/TTL-bound, webhook signatures verify and fail closed, the contact form has layered anti-abuse, and the public site's accessibility (landmarks, single h1, focus-visible, reduced-motion, skip link) is well done. Keep these patterns — extend them to the gaps above.

When done, report per-item: what changed, the acceptance check result, and anything you intentionally skipped.
