# Prompt: Accessibility & UX Remediation — Athens Holiday Market

> Paste everything below into the building agent.

---

You are working in the **Athens Holiday Market** repo — a Next.js 16 (App Router) site with
Tailwind v4 and React 19. It has a public marketing/application site and a protected admin tool
that organizers use to review artist applications and send emails/SMS to real people.

Your job is to fix the accessibility (WCAG 2.2 AA) and UX issues below. Work through them **in
priority order (P0 → P3)** and open the change as small, reviewable commits grouped by priority.
Each item gives the file, line, the standard it violates, and the required fix.

## Ground rules
- Preserve the existing mid-century-modern visual design and palette *feel*. When a color must
  be darkened for contrast, **add a new sibling token** (e.g. `--color-teal-deep`) in
  `src/app/globals.css` rather than mutating the hue used for decorative fills.
- After any contrast change, verify the computed ratio in context: **≥ 4.5:1** for normal text,
  **≥ 3:1** for large text (≥ 24px, or ≥ 19px bold) and UI components.
- Don't regress what's already correct: the skip link, landmark regions, `lang`/metadata, the
  global `:focus-visible` outline, `prefers-reduced-motion` handling, icon-button `aria-label`s,
  and the existing confirm gates on the broadcast/SMS/decision send flows.
- Don't change business logic in `src/lib/*-actions.ts` beyond what a fix requires.
- For every UI you touch, test the keyboard-only path and the screen-reader path.

---

## P0 — Blocker (do first)

**1. Keyboard users can't upload photos → can't submit a vendor application.**
`src/components/application-form.tsx:296` hides the `<input type="file">` with Tailwind `hidden`
(`display:none`), removing it from the tab order. Photos are **required**, so keyboard-only
applicants are fully blocked. *(WCAG 2.1.1 Keyboard, A)*
**Fix:** Use a visually-hidden-but-focusable pattern (`sr-only`/clip — never
`display:none`/`visibility:hidden`), tie the dropzone `<label>` to the input, and give the
dropzone a visible focus ring. **Accept:** Tab to it, press Enter → the file dialog opens.

---

## P1 — Critical / High

**2. Fix color-contrast tokens (site-wide).** Add darker text-only sibling tokens in
`src/app/globals.css` and swap them in at the usages below; keep the originals for decorative
fills. *(WCAG 1.4.3, AA)* — **Do the sky "Under review" pill first; it's on the most-used admin
screen and is effectively illegible.**

| Token | Value | Worst measured | Fails as text at |
|---|---|---|---|
| `--color-sky` | `#45bced` | ~1.9:1 on `sky-soft` | "Under review" pill (applications table), subscriber "pending" |
| `--color-tangerine` | `#f07f22` | ~2.5:1 on tint; white-on-tangerine ~2.8:1 | "Waitlisted"/"Unpaid" pills, VoteTally "maybe", nav/tab count badges |
| `--color-teal` | `#17a898` | ~2.7–3.0:1 | eyebrow labels: `page.tsx:265`, `artists/[slug]/page.tsx:123` |
| `--color-poppy` | `#e23127` | ~4.0–4.5:1 | form error text + required asterisks; "Rejected"/"unsubscribed" pills |
| `--color-fuchsia` | `#d21c96` | ~4.49:1 on paper | contact eyebrow + email link `contact/page.tsx:23,91` |
| `--color-fern-deep` | `#3f7d22` | ~4.1:1 on `fern-soft` | "Accepted"/"Paid" pills — **leave buttons alone; they pass ~5:1 on white** |

Usage sites: `src/components/admin/badges.tsx:4-6,25,49`, `subscribers-table.tsx:17-21,127-138`,
`scheduled-sends.tsx:9-13`, `decision-sender.tsx:22`, `section-tabs.tsx:37`,
`admin-nav.tsx:29,83`, `login/page.tsx:36`; public `page.tsx:265`, `artists/[slug]/page.tsx:123`,
`contact/page.tsx:23,91`, and poppy error text across the three forms. Suggested targets:
tangerine → ~`#9a4a00`, poppy → ~`#c01f16`, teal → ~`#0f7268`, sky → a dark blue; for
white-on-tangerine badges, darken the fill or use dark-ink text. Re-measure each in context.

**3. Add live regions for status messages.** There are **no** `aria-live`/`role="status"`/
`role="alert"` anywhere, so screen-reader users get no announcement after sends, saves, deletes,
or form submissions — including irreversible real-people email/SMS sends. *(WCAG 4.1.3, AA)*
Wrap each result/error container in `role="status"` (polite) for success, `role="alert"`
(assertive) for errors.
Admin: `composer.tsx:122`, `text-artists.tsx:110`, `decision-sender.tsx:194`,
`controls.tsx:36,76,211,239`, `review-controls.tsx:36`, `email-logistics-button.tsx:51`,
`email-posting-team-button.tsx:30`, `spotlight-downloader.tsx:66`, `subscribers-table.tsx:115`.
Public: `application-form.tsx`, `subscribe-form.tsx:102`, `contact-form.tsx:133`.

**4. Associate form errors with their fields.** `application-form.tsx` (uses `noValidate`;
errors at `:137,146,153,214,226,252,309,336`), `subscribe-form.tsx:102`, `contact-form.tsx:133`
render errors as plain `<p>`s with no `aria-invalid`/`aria-describedby`, and failed submit moves
no focus. *(WCAG 3.3.1 A, 1.3.1 A, 4.1.3 AA)*
**Fix:** Set `aria-invalid` + `aria-describedby="<error-id>"` per field; give each error a stable
`id`; move focus to the first invalid field on submit (pairs with #3's live regions).

**5. Label the social-channel inputs.** `application-form.tsx:188-190` (Instagram / Facebook /
TikTok) are placeholder-only; the shared `<legend>` doesn't disambiguate them. *(WCAG 1.3.1,
3.3.2 A, 4.1.2 A)* **Fix:** Add a visible `<label>` per input (or at minimum `aria-label`).

**6. Warn before Publish/Approve emails the artist.** `controls.tsx:191-210` (`PublishControls`
→ `sendArtistPageLive`, `admin-actions.ts:167`) and `review-controls.tsx:12-23`
(`approveArtistSubmission` → `sendArtistPageLive` on first publish, `admin-actions.ts:261`) fire
a real "your page is live" email on a single click with no warning. *(Nielsen #1, #5)*
**Fix:** State the side effect near the button and add a lightweight arm/confirm step matching the
existing delete/logistics pattern.

**7. Show recipient count on the bulk logistics email.** `email-logistics-button.tsx:20-41`'s
confirm reads "send to all accepted artists" with no number. *(Nielsen #5)* **Fix:** Show the
accepted-artist count in the confirm ("Send to 47 accepted artists?").

---

## P2 — Medium

**8. Decorative flowers announce to screen readers.** `src/components/brand.tsx:26-28` hardcodes
`role="img"` + `aria-label`. *(WCAG 1.1.1 A)* **Fix:** Make `Flower` decorative by default
(`aria-hidden`, no role); expose a label only via an explicit `label` prop when meaningful.

**9. Hide the decorative marquee from AT.** `src/app/(site)/page.tsx:112-129` only hides the
duplicate group; the first announces six words tripled + ~18 flower labels. *(WCAG 1.3.1 A)*
**Fix:** `aria-hidden="true"` on the whole marquee band.

**10. Countdown is garbled/duplicated for AT.** `src/components/countdown.tsx:61-92` renders each
digit in both flap halves. *(WCAG 1.3.1, 4.1.2)* **Fix:** `aria-hidden` the visual flaps; add one
`sr-only` summary ("5 days, 3 hours, 20 minutes until the market opens") with `aria-live="off"`.

**11. No keyboard-operable pause for motion.** Marquee pauses on hover only (`globals.css:117-122`);
hero video (`hero-video.tsx`) autoplays/loops with no control. *(WCAG 2.2.2 A)* **Fix:** One
visible, keyboard-operable "pause motion" toggle covering both, independent of reduced-motion.

**12. Sortable headers expose no sort state.** `applications-table.tsx:105-125` (`Th`) shows
direction only via a chevron. *(WCAG 1.3.1, 4.1.2)* **Fix:** `aria-sort` on each `<th>`.

**13. Filter pills expose no selected state.** `subscribers-table.tsx:127-138` — active state is
color-only. *(WCAG 4.1.2)* **Fix:** `aria-pressed` (or a radiogroup).

**14. Overlays lack focus management.** `photo-gallery.tsx:47-100` (dialog) and
`avatar-menu.tsx:94-116` (menu): focus doesn't enter on open, Tab isn't trapped, focus isn't
restored on close (Escape already works). *(WCAG 2.4.3)* **Fix:** move focus in on open, trap Tab,
restore on close; add roving arrow-key focus to the menu (or drop `role="menu"`).

**15. "Email the posting team" sends with no confirm.** `email-posting-team-button.tsx:14-29` →
`emailPostingTeam` (`admin-actions.ts:190`). *(Nielsen #3/#5)* **Fix:** Show the count and add a
confirm/arm step.

---

## P3 — Low / polish

**16. Content bug (quick win):** `subscribe-form.tsx:52` — `&apos;` sits in a JS string literal
and renders literally ("We&apos;ve noted…"). **Fix:** use a real apostrophe.
**17.** Mobile menu toggle (`site-header.tsx:58-95`): add `id` to the mobile `<nav>`,
`aria-controls` it, and close on Escape.
**18.** Inconsistent required-field indication — application form uses `*` (no legend); contact
form (`contact-form.tsx:88-121`) shows none. Make it consistent; add a "* required" note.
**19.** Placeholder contrast ~2.6:1 (`application-form.tsx:34`, `subscribe-form.tsx:74`,
`magic-link-form.tsx`). Raise toward ~4.5:1 (labels exist, so low urgency).
**20.** `controls.tsx:106-123` (`DecisionControls`) applies status instantly; `setStatus` errors
are silent (`admin-actions.ts:48`). Add inline confirmation + surface errors.
**21.** `section-tabs.tsx:23-52` tabs lack arrow-key nav and `aria-controls`/`aria-labelledby`.
Enhancement only.

---

## Before you finish
- Keyboard-only pass: apply form (incl. upload), subscribe, contact, and the admin send flows.
- Screen-reader pass (VoiceOver/NVDA): form errors announced, send results announced, marquee/
  flowers/countdown quiet, table sort state spoken.
- Re-measure every changed pill/label/error at its real background ≥ 4.5:1.
- Confirm no visual regression to buttons and fern-deep surfaces that already pass.
