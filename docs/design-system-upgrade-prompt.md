# Builder prompt — Athens Holiday Market design system upgrade

**Goal:** Close the gap between the `/style` design system and the real product. The guide is a beautiful, hand-built showcase of tokens + marketing primitives, but it documents almost none of the components the admin and artist portal actually run on — and those components each re-implement the same primitives inline, so they've drifted from each other and from the guide. Bring the system back to one source of truth: extract shared components, tokenize the magic values, and rewrite `/style` to document what the product actually is — public **and** admin, treated as equally important.

Do this in the order below. Keep the mid-century-modern brand intact (warm paper, flat brights, geometric shapes, crisp small radii, the signature raised-ledge primary button). This is a refactor + documentation pass, **not** a visual redesign — every screen should look the same or better afterward, just built from shared parts.

---

## Evidence of the drift (verify before you start, then use as your punch list)

Run these from `src/` and confirm the counts, then fix them:

- **25 files** re-declare the text-input style inline (`border-2 border-ink/15 … focus:border-fern-deep`). There is no shared `<Input>`/`<Textarea>`/`<Select>`.
- **28 files** re-declare the card wrapper inline (`rounded-xl bg-white p-5 shadow-[var(--shadow-card)]`). There is no shared `<Card>` — `Card` is defined *locally and differently* in both `app/style/page.tsx` and `components/artist/artist-editor.tsx`.
- **Only 12 of 71** `.tsx` files import the shared `<Button>`. The admin hand-rolls ~20 action buttons as raw `bg-fuchsia px-5 …` / `bg-poppy px-5 …` / `bg-fern-deep px-4 …` — none of which are `<Button>` variants, and none of which carry the documented focus/disabled/active behavior.
- **Magic hex tints** used as status surfaces are untokenized and repeated: `bg-[#fdf0e0]` (14×), `bg-[#fde7e6]` (4×), `bg-[#fdeceb]` (1×). These are really "tangerine-soft" and "poppy-soft" and belong in the token set. The `/style` guide *itself* uses `bg-[#fdf0e0]` in its Pills example, so the doc is teaching the anti-pattern.
- `components/artist/artist-editor.tsx` injects a `<style>` tag defining `.input` at `border-radius: 0.375rem` (6px) — a **different radius** than the documented input radius (`rounded-lg`, 8px). Inputs are literally two different shapes depending on which screen you're on.

---

## Step 1 — Tokens: finish the set (`src/app/globals.css`)

Add the missing tokens so nothing downstream needs a magic hex:

- `--color-tangerine-soft: #fdf0e0;` (replaces the repeated `bg-[#fdf0e0]`)
- `--color-poppy-soft: #fde7e6;` (replaces `bg-[#fde7e6]` / `#fdeceb` — consolidate to one)
- Confirm every "deep" AA-safe text sibling already exists (it does: `poppy-deep`, `sky-deep`, `teal-deep`, `tangerine-deep`, `fuchsia-deep`). Good — keep them.
- Add a documented **status-color map** as the single reference for the five application states and the send states (see Step 3).

Do a repo-wide replace of the magic hexes with the new utilities. After this, `grep -r "bg-\[#" src` should return nothing (or only genuinely one-off decorative values, which should be justified in a comment).

## Step 2 — Extract the shared component library (`src/components/ui/`)

Today `ui/` has one file (`button.tsx`). Build out the primitives that the 25–28 duplicate sites collapse into. Each must be the **single** definition, driven by tokens, with the documented focus ring and disabled states baked in:

1. **`Input`, `Textarea`, `Select`** — the `h-11/h-12 rounded-lg border-2 border-ink/15 bg-white focus:border-fern-deep` field. Select includes the `ChevronDownIcon` affordance. Delete the injected `<style>` in `artist-editor.tsx` and every inline field.
2. **`Field`** — label + control + optional hint + error slot. Consolidates the two local `Field` helpers. Wires `htmlFor`/`id`, `autoComplete`, and error text with `aria-describedby`.
3. **`Card`** — `rounded-xl bg-white p-5 shadow-[var(--shadow-card)]` with optional `title`/`hint` header. Replace both local `Card`s and the 28 inline wrappers.
4. **`Button`** — extend the existing one rather than replace it. Add the admin **semantic fills** as real variants so the raw `bg-fuchsia/poppy/fern-deep` buttons disappear: `create` (fuchsia), `confirm` (fern-deep), `send`/`danger` (poppy). Add a `loading` state that renders the "Working…/Sending…" label convention the admin already uses ad hoc. Add `sm` (h-10) to the existing `md`/`lg`.
5. **`StatusBadge` / `Pill`** — promote `components/admin/badges.tsx` into `ui/`, driven by the Step 1 status map. One badge component, not per-screen chips.
6. **`StatusBanner`** — the inline colored banner (`draft/pending/published`, `submitted/under_review/…`). Consolidate the artist-editor + decision-sender banners.
7. **`ConfirmGate` / destructive-action pattern** — this is the app's strongest, most consistent pattern and it's completely undocumented. Codify both tiers:
   - **Inline confirm** (composer's "Send to N people now? / Yes, send"),
   - **High-stakes gate** (decision-sender's checkbox + "type SEND to confirm"). Make it a reusable component with configurable copy and confirmation word.
8. **`Toast` / inline status message** — 9 files use ad-hoc `role="status"` messages. One component, polite live region, success/error tone.
9. **`EmptyState`** — currently ad hoc or missing on the long tables (subscribers, applications, artists). One component: icon + headline + hint + optional action.
10. **`StickyActionBar`** — the artist-editor's `sticky bottom-4 bg-ink` submit bar; reuse for any long form.
11. Keep **`SectionTabs`** (`components/admin/section-tabs.tsx`) as-is — it's already correct (roving-tabindex ARIA). Just move it to `ui/` and document it.

Refactor all call sites to use these. Net effect: the composer, decision-sender, artist-editor, and the tables should get materially shorter and stop carrying their own primitive CSS.

## Step 3 — Document the real system: rewrite `/style` (`src/app/style/page.tsx`)

The current guide covers: assets, color, type, radii, buttons, forms, pills, icons, nav, tables, layout, motion, a11y, social. Keep all of that (it's good), fix its magic-hex pills, and **add the sections that describe the product as it actually works.** Organize the guide into two clearly labeled tracks — **Public site** and **Admin & portal** — since they're equally important:

**New/expanded component sections (each with live example + the token/class recipe + a "when to use" note):**

- **Cards & surfaces** — the card, section header, hint text.
- **Form system** — Field anatomy, input/select/textarea, checkbox, validation & error text, `autoComplete` guidance, the sticky action bar.
- **Feedback & status** — toast/inline status, the full **status-color map** (application lifecycle: submitted / under review / accepted / waitlisted / rejected; booth fee paid/unpaid; send status: draft / scheduled / sent / failed / canceled). This is the single most valuable missing table.
- **Confirmation & destructive actions** — document both the inline confirm and the "type SEND" high-stakes gate as the sanctioned patterns, with rules for when each applies. (Note explicitly that the app deliberately uses inline confirmation instead of modals — that's a real decision worth stating.)
- **Tabs** — the SectionTabs pattern + keyboard model.
- **Empty & loading states** — empty tables, button loading labels, and (if you add them) skeletons for the data tables.
- **Badges & counts** — nav count badges, vote tally, filter pills.

**Domain patterns — document the three admin workflows as first-class UI, because none are in the guide today:**

- **Email marketing** — the compose+live-preview split layout, the markdown toolbar, the email shell/template styling, the segment picker with recipient counts, the "Send now / Schedule send" segmented control, the scheduled/queued send list, and send-status chips.
- **Art jurying** — the applications table, the review/vote controls (yes/maybe/no), the **VoteTally** component, the application status lifecycle, and the batch **decision sender** (the high-stakes gate lives here).
- **Artist-page tools** — the drag-and-drop photo gallery + upload tile, logo upload, statement/bio fields, socials, the draft→pending→published status model, and the on-brand social share card generator (per-medium accent). Add **media/image guidance** (aspect ratios, max counts, alt text) — currently absent.

**Make the guide honest about source of truth:** every documented component should render the **actual** `ui/` component (import it), not a hand-copied facsimile, so the guide can't drift again. Where the guide shows a recipe, it should match the component's real classes.

## Step 4 — Consistency fixes surfaced along the way

- Reconcile input radius everywhere to the documented `rounded-lg` (kill the 6px `.input`).
- Reconcile button heights: admin uses raw h-10; fold into the `sm` size.
- Ensure every icon-only control has an `aria-label` (spot-check the toolbar, gallery remove buttons, share buttons).
- Ensure the new components all carry the `3px berry` focus ring and `disabled:opacity-50` from the base — don't let semantic-fill buttons lose the focus treatment the way the raw ones may have.
- Add pagination or a documented "load more / virtualized" approach for subscribers/applications tables if they can grow long (note it in the guide even if you defer the implementation).

## Guardrails

- **No brand/visual redesign.** Same look, built from shared parts. Screenshots before/after should be near-identical on public pages.
- Keep it **light-mode only** (the system is intentionally single-theme); don't add dark mode.
- Preserve all accessibility behavior already present (skip links, landmarks, reduced-motion, roving tabindex).
- Verify in the browser after refactor: run the dev server, load `/style`, `/admin/broadcasts/new`, `/admin/decisions`, and an artist editor page; check the console for errors and confirm focus rings, disabled states, and confirm-gates still work.
- Land it in reviewable PRs, ideally split: (1) tokens, (2) `ui/` primitives + call-site refactor, (3) `/style` rewrite.
