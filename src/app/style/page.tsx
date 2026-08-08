import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { site } from "@/lib/site";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Textarea, Field } from "@/components/ui/field";
import { StatusMessage } from "@/components/ui/status-message";
import { SectionTabs } from "@/components/admin/section-tabs";
import { APPLICATION_STATUS, SEND_STATUS, BOOTH_FEE_STATUS, ARTIST_STATUS } from "@/components/ui/status";
import { Flower, ColorWord } from "@/components/brand";
import { CopyToken } from "@/components/style/copy-token";
import {
  CalendarIcon, ClockIcon, MapPinIcon, MailIcon, MusicIcon, GiftIcon, SparkleIcon,
  ArrowRightIcon, BackIcon, ExternalIcon, ChevronDownIcon, CloseIcon, CelebrateIcon,
  TreeIcon, MailboxIcon, InstagramIcon, FacebookIcon, XIcon, TiktokIcon, YoutubeIcon,
  ShareIcon, LinkIcon, GlobeIcon, GhostIcon, CatIcon, RobotIcon, OwlIcon, RocketIcon, CrownIcon,
} from "@/components/icons";

export const metadata: Metadata = {
  title: "Design System",
  description: "The Athens Holiday Market design system — tokens, components, and brand assets.",
  robots: { index: false },
};

/* ─────────────────────────── data ─────────────────────────── */

type Color = { name: string; token: string; hex: string; use: string; aa?: boolean };

const NEUTRALS: Color[] = [
  { name: "Ink", token: "--color-ink", hex: "#17161B", use: "Primary text, dark fills", aa: true },
  { name: "Ink soft", token: "--color-ink-soft", hex: "#423E44", use: "Secondary text", aa: true },
  { name: "Paper", token: "--color-paper", hex: "#FAF5EA", use: "Page background" },
  { name: "Cream", token: "--color-cream", hex: "#F3EAD6", use: "Muted surfaces, hovers" },
  { name: "Cream soft", token: "--color-cream-soft", hex: "#F8F1E2", use: "Subtle row/section tint" },
  { name: "White", token: "--color-white", hex: "#FFFFFF", use: "Cards, inputs" },
];

const BRIGHTS: Color[] = [
  { name: "Fuchsia", token: "--color-fuchsia", hex: "#D21C96", use: "Logo mark, brand accent" },
  { name: "Berry", token: "--color-berry", hex: "#9C1C50", use: "Focus ring, deep accent", aa: true },
  { name: "Poppy", token: "--color-poppy", hex: "#E23127", use: "Alerts, destructive" },
  { name: "Tangerine", token: "--color-tangerine", hex: "#F07F22", use: "Warnings, “to do” state" },
  { name: "Chartreuse", token: "--color-chartreuse", hex: "#B7C72C", use: "Playful highlight" },
  { name: "Fern", token: "--color-fern", hex: "#6CAE43", use: "Light green accent" },
  { name: "Fern deep", token: "--color-fern-deep", hex: "#3F7D22", use: "Buttons, links on white", aa: true },
  { name: "Fern deeper", token: "--color-fern-deeper", hex: "#2C5817", use: "Button shadow ledge" },
  { name: "Teal", token: "--color-teal", hex: "#17A898", use: "Cool accent" },
  { name: "Sky", token: "--color-sky", hex: "#45BCED", use: "Cool highlight" },
];

const TINTS: Color[] = [
  { name: "Fuchsia soft", token: "--color-fuchsia-soft", hex: "#FBE6F4", use: "Soft brand surface" },
  { name: "Fern soft", token: "--color-fern-soft", hex: "#EAF3E1", use: "Success surface / active nav" },
  { name: "Sky soft", token: "--color-sky-soft", hex: "#E2F4FC", use: "Info surface" },
];

const RADII = [
  { token: "--radius-sm", px: "3px", cls: "rounded-sm", use: "Chips, tiny elements" },
  { token: "--radius-md", px: "5px", cls: "rounded-md", use: "Inline code, small tags" },
  { token: "--radius-lg", px: "8px", cls: "rounded-lg", use: "Buttons, inputs, controls" },
  { token: "--radius-xl", px: "10px", cls: "rounded-xl", use: "Cards, boxes, photos" },
  { token: "9999px", px: "full", cls: "rounded-full", use: "Pills, avatars, icon buttons" },
];

const ICONS: { Icon: React.ComponentType<{ size?: number }>; name: string }[] = [
  { Icon: CalendarIcon, name: "Calendar" }, { Icon: ClockIcon, name: "Clock" },
  { Icon: MapPinIcon, name: "MapPin" }, { Icon: MailIcon, name: "Mail" },
  { Icon: MusicIcon, name: "Music" }, { Icon: GiftIcon, name: "Gift" },
  { Icon: SparkleIcon, name: "Sparkle" }, { Icon: CelebrateIcon, name: "Celebrate" },
  { Icon: TreeIcon, name: "Tree" }, { Icon: MailboxIcon, name: "Mailbox" },
  { Icon: ArrowRightIcon, name: "ArrowRight" }, { Icon: BackIcon, name: "Back" },
  { Icon: ExternalIcon, name: "External" }, { Icon: ChevronDownIcon, name: "ChevronDown" },
  { Icon: CloseIcon, name: "Close" }, { Icon: ShareIcon, name: "Share" },
  { Icon: LinkIcon, name: "Link" }, { Icon: GlobeIcon, name: "Globe" },
  { Icon: InstagramIcon, name: "Instagram" }, { Icon: FacebookIcon, name: "Facebook" },
  { Icon: XIcon, name: "X" }, { Icon: TiktokIcon, name: "Tiktok" },
  { Icon: YoutubeIcon, name: "Youtube" },
];

const AVATARS: { Icon: React.ComponentType<{ size?: number }>; name: string }[] = [
  { Icon: GhostIcon, name: "Ghost" }, { Icon: CatIcon, name: "Cat" },
  { Icon: RobotIcon, name: "Robot" }, { Icon: OwlIcon, name: "Owl" },
  { Icon: RocketIcon, name: "Rocket" }, { Icon: CrownIcon, name: "Crown" },
];

const ASSETS = [
  { title: "Logo — full color (SVG)", desc: "Primary lockup, scalable", href: "/brand/logo-athens-holiday-market.svg", bg: "bg-white" },
  { title: "Logo — full color (PNG)", desc: "Raster fallback", href: "/brand/logo.png", bg: "bg-white" },
  { title: "Pinwheel mark (SVG)", desc: "Standalone flower mark", href: "/brand/pinwheel.svg", bg: "bg-fuchsia-soft" },
  { title: "Pinwheel mark (PNG)", desc: "Raster flower mark", href: "/brand/pinwheel.png", bg: "bg-fuchsia-soft" },
  { title: "Social share image", desc: "1200×630 OG card", href: "/og.png", bg: "bg-cream" },
  { title: "Favicon", desc: "Browser tab icon", href: "/icon.svg", bg: "bg-white" },
];

const SECTIONS = [
  ["assets", "Brand assets"], ["color", "Color"], ["type", "Typography"], ["radii", "Radii & shadows"],
  ["buttons", "Buttons"], ["forms", "Forms"], ["status", "Status & badges"], ["cards", "Cards & surfaces"],
  ["feedback", "Feedback & confirmation"], ["tabs", "Tabs"], ["icons", "Icons"], ["nav", "Navigation"],
  ["tables", "Tables"], ["layout", "Layout & grid"], ["motion", "Motion"], ["a11y", "Accessibility"],
  ["social", "Social"],
] as const;

/* ─────────────────────────── helpers ─────────────────────────── */

function Section({ id, title, kicker, children }: { id: string; title: string; kicker?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-ink/10 pt-12">
      <div className="mb-6">
        {kicker && (
          <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-deep">{kicker}</p>
        )}
        <h2 className="mt-1 font-display text-3xl font-extrabold sm:text-4xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function StatusMap({ title, map }: { title: string; map: Record<string, { label: string; cls: string }> }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)]">
      <div className="border-b border-ink/10 px-5 py-3">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">{title}</h3>
      </div>
      <table className="w-full text-left text-sm">
        <tbody>
          {Object.entries(map).map(([key, s]) => (
            <tr key={key} className="border-b border-ink/5 last:border-0">
              <td className="px-5 py-3"><Badge style={s} /></td>
              <td className="px-5 py-3 font-mono text-xs text-ink-soft">{key}</td>
              <td className="px-5 py-3 font-mono text-xs text-ink-soft">{s.cls}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Swatch({ c }: { c: Color }) {
  const dark = ["#17161B", "#423E44", "#9C1C50", "#3F7D22", "#2C5817", "#D21C96", "#E23127"].includes(c.hex);
  return (
    <div className="overflow-hidden rounded-xl border border-ink/10 bg-white shadow-[var(--shadow-card)]">
      <div className="flex h-20 items-end justify-between p-3" style={{ backgroundColor: c.hex }}>
        {c.aa && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${dark ? "bg-white/20 text-white" : "bg-ink/10 text-ink"}`}>
            AA
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-display text-sm font-bold">{c.name}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <CopyToken value={c.hex} />
          <CopyToken value={c.token} />
        </div>
        <p className="mt-2 text-xs text-ink-soft">{c.use}</p>
      </div>
    </div>
  );
}

function Spec({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
      <span className="w-28 shrink-0 font-semibold text-ink-soft">{label}</span>
      <span className="text-ink">{children}</span>
    </div>
  );
}


/* ─────────────────────────── page ─────────────────────────── */

export default function StyleGuidePage() {
  return (
    <div className="min-h-screen bg-paper">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-ink/10 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-2.5">
            <Flower size={30} color="var(--color-fuchsia)" />
            <span className="font-display font-extrabold">Design System</span>
          </div>
          <Link href="/" className="text-sm font-semibold text-ink-soft hover:text-fern-deep">
            ← Back to site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-24 pt-10 sm:px-8">
        {/* Hero */}
        <div className="max-w-3xl">
          <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-fuchsia-deep">
            Athens <ColorWord /> Market
          </p>
          <h1 className="mt-3 font-display text-5xl font-extrabold leading-[0.95] sm:text-6xl">
            The design system
          </h1>
          <p className="mt-5 text-lg text-ink-soft">
            A living reference for the tokens, components, and brand assets that make the market feel
            like itself — mid-century modern, warm paper, flat brights, geometric shapes. Use it to keep
            new work consistent and to run audits as the site grows.
          </p>
        </div>

        {/* Section nav */}
        <nav aria-label="Sections" className="mt-8 flex flex-wrap gap-2">
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full border-2 border-ink/12 px-3 py-1 text-sm font-semibold text-ink-soft transition-colors hover:border-fern-deep hover:text-fern-deep"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="mt-14 space-y-14">
          {/* ── Brand assets ── */}
          <Section id="assets" title="Brand assets" kicker="Download">
            <p className="-mt-2 mb-6 max-w-2xl text-ink-soft">
              The logo and marks, ready to drop into decks, print, and partner sites. Keep clear space
              around the lockup and never recolor the mark outside the palette below.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ASSETS.map((a) => (
                <a
                  key={a.href}
                  href={a.href}
                  download
                  className="group flex flex-col overflow-hidden rounded-xl border border-ink/10 bg-white shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5"
                >
                  <div className={`flex h-36 items-center justify-center ${a.bg}`}>
                    <Image
                      src={a.href}
                      alt={a.title}
                      width={200}
                      height={120}
                      className="max-h-24 w-auto object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-ink/10 p-3">
                    <div>
                      <p className="font-display text-sm font-bold">{a.title}</p>
                      <p className="text-xs text-ink-soft">{a.desc}</p>
                    </div>
                    <span className="shrink-0 text-fern-deep transition-transform group-hover:translate-y-0.5">
                      <ArrowRightIcon size={18} />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </Section>

          {/* ── Color ── */}
          <Section id="color" title="Color" kicker="Tokens">
            <p className="-mt-2 mb-6 max-w-2xl text-ink-soft">
              Palette keyed off the logo. Colors are CSS variables in the Tailwind theme — use{" "}
              <CopyToken value="bg-fern-deep" /> / <CopyToken value="text-fern-deep" /> utilities, or the
              raw <CopyToken value="var(--color-fern-deep)" />. An <strong>AA</strong> badge marks colors
              that pass WCAG AA for small text on white.
            </p>
            <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ink-soft">Neutrals</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {NEUTRALS.map((c) => <Swatch key={c.token} c={c} />)}
            </div>
            <h3 className="mb-3 mt-8 font-display text-sm font-bold uppercase tracking-wide text-ink-soft">Brights</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {BRIGHTS.map((c) => <Swatch key={c.token} c={c} />)}
            </div>
            <h3 className="mb-3 mt-8 font-display text-sm font-bold uppercase tracking-wide text-ink-soft">Soft tints</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {TINTS.map((c) => <Swatch key={c.token} c={c} />)}
            </div>
            <div className="mt-6 rounded-xl border border-tangerine/30 bg-tangerine/5 p-4 text-sm text-ink-soft">
              <strong className="text-ink">Contrast rule:</strong> on white/paper, only Ink, Ink soft,
              Fern deep, and Berry are safe for small text. Light brights (teal, tangerine, chartreuse,
              fuchsia, sky, fern) are for fills, large display type, and UI accents — never body-size text.
            </div>
          </Section>

          {/* ── Typography ── */}
          <Section id="type" title="Typography" kicker="Type">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
              <div className="space-y-4 rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
                <div>
                  <p className="font-display text-2xl font-extrabold">Plus Jakarta Sans</p>
                  <p className="text-sm text-ink-soft">Display — headings &amp; buttons</p>
                  <p className="mt-1"><CopyToken value="font-display" /> · <CopyToken value="var(--font-display)" /></p>
                </div>
                <div className="border-t border-ink/10 pt-4">
                  <p className="text-2xl" style={{ fontFamily: "var(--font-inter)" }}>Inter</p>
                  <p className="text-sm text-ink-soft">Body — running text &amp; UI</p>
                  <p className="mt-1"><CopyToken value="font-body" /> · <CopyToken value="var(--font-body)" /></p>
                </div>
                <div className="border-t border-ink/10 pt-4 text-sm text-ink-soft">
                  <Spec label="Base">1.0625rem / 1.6 line-height</Spec>
                  <Spec label="Headings">700–800, tracking −0.02em, leading 1.02, balanced</Spec>
                  <Spec label="Weights">400 · 500 · 600 · 700 · 800</Spec>
                </div>
              </div>

              <div className="space-y-4 rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
                <div className="flex items-baseline justify-between gap-3 border-b border-ink/5 pb-3">
                  <span className="font-display text-5xl font-extrabold leading-none">Display</span>
                  <CopyToken value="text-5xl/6xl font-extrabold" />
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-ink/5 pb-3">
                  <h3 className="font-display text-4xl font-extrabold">Heading 1</h3>
                  <CopyToken value="text-4xl font-extrabold" />
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-ink/5 pb-3">
                  <h3 className="font-display text-2xl font-extrabold">Heading 2</h3>
                  <CopyToken value="text-2xl font-extrabold" />
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-ink/5 pb-3">
                  <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-deep">Eyebrow</p>
                  <CopyToken value="uppercase tracking-[0.18em]" />
                </div>
                <div className="flex items-baseline justify-between gap-3 border-b border-ink/5 pb-3">
                  <p className="text-lg">Body large — lead paragraphs</p>
                  <CopyToken value="text-lg" />
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm text-ink-soft">Small / secondary text</p>
                  <CopyToken value="text-sm text-ink-soft" />
                </div>
              </div>
            </div>
          </Section>

          {/* ── Radii & shadows ── */}
          <Section id="radii" title="Radii & shadows" kicker="Shape">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
                <h3 className="mb-4 font-display font-bold">Corner radii</h3>
                <div className="space-y-3">
                  {RADII.map((r) => (
                    <div key={r.token} className="flex items-center gap-4">
                      <div className={`h-12 w-12 shrink-0 border-2 border-ink/15 bg-cream ${r.cls}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{r.cls} <span className="font-normal text-ink-soft">· {r.px}</span></p>
                        <p className="text-xs text-ink-soft">{r.use}</p>
                      </div>
                      <span className="ml-auto"><CopyToken value={r.token} /></span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
                <h3 className="mb-4 font-display font-bold">Elevation</h3>
                <div className="space-y-5">
                  <div>
                    <div className="flex h-20 items-center justify-center rounded-xl bg-white shadow-[var(--shadow-card)]">
                      <span className="text-sm text-ink-soft">Card</span>
                    </div>
                    <p className="mt-2"><CopyToken value="shadow-[var(--shadow-card)]" /></p>
                  </div>
                  <div>
                    <div className="flex h-20 items-center justify-center rounded-xl bg-white shadow-[var(--shadow-lift)]">
                      <span className="text-sm text-ink-soft">Lift (hover / hero)</span>
                    </div>
                    <p className="mt-2"><CopyToken value="shadow-[var(--shadow-lift)]" /></p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Buttons ── */}
          <Section id="buttons" title="Buttons" kicker="Components">
            <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
              <p className="mb-5 text-sm text-ink-soft">
                One shared <CopyToken value="<Button>" /> / <CopyToken value="<ButtonLink>" /> — every example
                below is the real component. Sizes <code className="font-mono text-xs">sm · md · lg</code>;
                <code className="font-mono text-xs"> loading</code> swaps the label and disables. Every variant
                carries the 3px berry focus ring and <code className="font-mono text-xs">disabled:opacity-50</code>.
              </p>
              <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
                Marketing
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="ink">Ink</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <ButtonLink href="#buttons" variant="primary">
                  With icon <ArrowRightIcon size={16} aria-hidden />
                </ButtonLink>
              </div>
              <p className="mt-2 text-xs text-ink-soft">
                <code className="font-mono text-xs">primary</code> carries the signature raised ledge — reserve it
                for the one hero action on marketing pages.
              </p>
              <div className="mt-6 border-t border-ink/10 pt-5">
                <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
                  Admin — semantic fills &amp; states
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="create" size="sm">+ Create</Button>
                  <Button variant="confirm" size="sm">Confirm</Button>
                  <Button variant="danger" size="sm">Send / delete</Button>
                  <Button variant="secondary" size="sm">Secondary</Button>
                  <Button variant="confirm" size="sm" loading loadingLabel="Sending…">Send</Button>
                  <Button variant="create" size="sm" disabled>Disabled</Button>
                </div>
                <p className="mt-2 text-xs text-ink-soft">
                  <code className="font-mono text-xs">create</code> = fuchsia (new/primary send),{" "}
                  <code className="font-mono text-xs">confirm</code> = fern (approve),{" "}
                  <code className="font-mono text-xs">danger</code> = poppy (blast / destructive),{" "}
                  <code className="font-mono text-xs">secondary</code> = light outline. Admin buttons use{" "}
                  <code className="font-mono text-xs">size="sm"</code>.
                </p>
              </div>
            </div>
          </Section>

          {/* ── Forms ── */}
          <Section id="forms" title="Forms" kicker="Components">
            <div className="grid gap-5 rounded-xl bg-white p-6 shadow-[var(--shadow-card)] sm:grid-cols-2">
              <Field label="Text input" htmlFor="ds-email">
                <Input id="ds-email" type="email" autoComplete="email" placeholder="you@email.com" />
              </Field>
              <Field label="Select" htmlFor="ds-medium">
                <Select id="ds-medium" defaultValue="">
                  <option value="">Choose a medium…</option>
                  <option>Ceramics</option>
                  <option>Jewelry</option>
                </Select>
              </Field>
              <Field label="Textarea" htmlFor="ds-note" className="sm:col-span-2">
                <Textarea id="ds-note" rows={3} placeholder="How can we help?" />
              </Field>
              <Field label="With an error" htmlFor="ds-err" error="This field is required." className="sm:col-span-2">
                <Input id="ds-err" aria-invalid aria-describedby="ds-err-error" defaultValue="" />
              </Field>
              <label className="flex items-start gap-2.5 text-sm text-ink-soft sm:col-span-2">
                <input type="checkbox" defaultChecked className="mt-0.5 h-4 w-4 accent-fern-deep" />
                Checkbox — <code className="font-mono text-xs">accent-fern-deep</code>
              </label>
              <p className="text-xs text-ink-soft sm:col-span-2">
                Every field is the shared <CopyToken value="<Field>" /> + <CopyToken value="<Input>/<Select>/<Textarea>" />{" "}
                (<code className="font-mono text-xs">h-11 rounded-lg border-2 border-ink/15 focus:border-fern-deep</code>).
                Field renders the error with a stable <code className="font-mono text-xs">{"{htmlFor}-error"}</code> id;
                point the control&apos;s <code className="font-mono text-xs">aria-describedby</code> at it, and set{" "}
                <code className="font-mono text-xs">autoComplete</code>.
              </p>
            </div>
          </Section>

          {/* ── Status & badges ── */}
          <Section id="status" title="Status & badges" kicker="Single source of truth">
            <p className="-mt-2 mb-6 max-w-2xl text-ink-soft">
              Every status color comes from one map — <CopyToken value="src/components/ui/status.ts" /> — rendered
              by the shared <CopyToken value="<Badge>" />. Never hand-roll a status color. Text is always the AA-safe
              &ldquo;deep&rdquo; sibling on the matching soft tint.
            </p>
            <div className="space-y-6">
              <StatusMap title="Application lifecycle" map={APPLICATION_STATUS} />
              <StatusMap title="Email / broadcast send" map={SEND_STATUS} />
              <StatusMap title="Booth fee" map={BOOTH_FEE_STATUS} />
              <StatusMap title="Artist-page publication" map={ARTIST_STATUS} />
            </div>
            <div className="mt-6 rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
              <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
                Counts &amp; filter pills
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-tangerine px-3 py-1 text-sm font-bold text-white">2 to notify</span>
                <span className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-ink">
                  Applications
                  <span className="ml-1.5 rounded-full bg-tangerine px-1.5 py-0.5 text-xs font-bold text-white">3</span>
                </span>
                <span className="rounded-md bg-cream px-2 py-0.5 text-xs font-semibold text-ink-soft">Channel tag</span>
              </div>
              <p className="mt-3 text-xs text-ink-soft">
                A <strong>label</strong> (filled tag, <code className="font-mono text-xs">rounded-md bg-cream</code>)
                must never look like a <strong>button</strong>. Row actions are tertiary text links, not bordered pills.
              </p>
            </div>
          </Section>

          {/* ── Cards & surfaces ── */}
          <Section id="cards" title="Cards & surfaces" kicker="Components">
            <p className="-mt-2 mb-6 max-w-2xl text-ink-soft">
              The shared <CopyToken value="<Card>" /> is the one white surface —{" "}
              <code className="font-mono text-xs">rounded-xl bg-white p-5 shadow-card</code>. Optional{" "}
              <code className="font-mono text-xs">title</code>/<code className="font-mono text-xs">hint</code>{" "}
              render the header; <code className="font-mono text-xs">titleSize</code> picks the dense admin label or
              the friendly portal heading.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card title="Admin card" hint="titleSize=&quot;sm&quot; — dense uppercase label.">
                <p className="text-sm text-ink-soft">Body content sits under the header.</p>
              </Card>
              <Card title="Portal card" titleSize="lg" hint="titleSize=&quot;lg&quot; — friendly heading.">
                <p className="text-sm text-ink-soft">Same surface, larger heading for artist-facing screens.</p>
              </Card>
            </div>
          </Section>

          {/* ── Feedback & confirmation ── */}
          <Section id="feedback" title="Feedback & confirmation" kicker="Patterns">
            <div className="space-y-4">
              <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
                <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
                  Inline status message
                </h3>
                <p className="mb-3 text-sm text-ink-soft">
                  <CopyToken value="<StatusMessage>" /> — a polite live region (SR-announced). Tone sets color; no
                  toast/portal.
                </p>
                <div className="space-y-1">
                  <StatusMessage tone="success">Draft saved ✓</StatusMessage>
                  <StatusMessage tone="error">That doesn&apos;t look like an email address.</StatusMessage>
                  <StatusMessage>Working…</StatusMessage>
                </div>
              </div>
              <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
                <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
                  Confirmation — two sanctioned tiers
                </h3>
                <p className="mb-4 text-sm text-ink-soft">
                  The app deliberately uses <strong>inline confirmation</strong>, never modals. Two tiers by stakes:
                </p>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">
                      Tier 1 · inline arm → confirm
                    </p>
                    <div className="rounded-lg border-2 border-fuchsia/40 bg-fuchsia/5 p-4">
                      <p className="font-display font-bold">Send to 504 people now?</p>
                      <p className="mt-1 text-sm text-ink-soft">This can&apos;t be undone.</p>
                      <div className="mt-3 flex gap-3">
                        <Button variant="create" size="sm">Yes, send to 504</Button>
                        <Button variant="ghost" size="sm">Cancel</Button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-ink-soft">Everyday reversible-ish actions (send, publish).</p>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">
                      Tier 2 · high-stakes &ldquo;type SEND&rdquo; gate
                    </p>
                    <div className="rounded-lg border-2 border-ink/15 bg-white p-4">
                      <label className="flex items-start gap-2.5 text-sm">
                        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-fern-deep" />
                        I&apos;ve reviewed all 45 recipients and their votes.
                      </label>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-sm text-ink-soft">Type <strong>SEND</strong>:</span>
                        <Input className="!w-28 uppercase" placeholder="SEND" aria-label="Type SEND to confirm" />
                        <Button variant="confirm" size="sm" disabled>Send 45 emails</Button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-ink-soft">
                      Irreversible fan-outs to real people (decision emails, event-day SMS blast).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Tabs ── */}
          <Section id="tabs" title="Tabs" kicker="Components">
            <p className="-mt-2 mb-6 max-w-2xl text-ink-soft">
              <CopyToken value="<SectionTabs>" /> — underline affordance, roving arrow-key navigation
              (←/→/Home/End), and full <code className="font-mono text-xs">role=tab/tabpanel</code> wiring. Only the
              active panel renders.
            </p>
            <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
              <SectionTabs
                tabs={[
                  { id: "one", label: "Decisions", badge: 2, content: <p className="text-sm text-ink-soft">Panel one.</p> },
                  { id: "two", label: "Email", content: <p className="text-sm text-ink-soft">Panel two.</p> },
                  { id: "three", label: "Automations", content: <p className="text-sm text-ink-soft">Panel three.</p> },
                ]}
              />
            </div>
          </Section>

          {/* ── Icons ── */}
          <Section id="icons" title="Icons" kicker="System">
            <p className="-mt-2 mb-6 max-w-2xl text-ink-soft">
              Central Icons — <code className="font-mono text-xs">round · outlined · radius-1 · stroke-2</code>.
              Render in <code className="font-mono text-xs">currentColor</code>; pass{" "}
              <code className="font-mono text-xs">size</code>. Swappable in one barrel: {" "}
              <code className="font-mono text-xs">src/components/icons.tsx</code>.
            </p>
            <div className="grid grid-cols-3 gap-3 rounded-xl bg-white p-6 shadow-[var(--shadow-card)] sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {ICONS.map(({ Icon, name }) => (
                <div key={name} className="flex flex-col items-center gap-1.5 rounded-lg py-3 text-ink">
                  <Icon size={24} />
                  <span className="text-[11px] text-ink-soft">{name}</span>
                </div>
              ))}
            </div>
            <h3 className="mb-3 mt-6 font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
              Playful avatars (admin)
            </h3>
            <div className="flex flex-wrap gap-3">
              {AVATARS.map(({ Icon, name }) => (
                <div key={name} className="flex flex-col items-center gap-1.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-fuchsia-soft text-fuchsia-deep">
                    <Icon size={24} />
                  </div>
                  <span className="text-[11px] text-ink-soft">{name}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Navigation ── */}
          <Section id="nav" title="Navigation" kicker="Components">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-ink/10 bg-white shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-1 px-5 py-4">
                  <span className="rounded-lg bg-fern-soft px-3 py-2 text-sm font-semibold text-fern-deep">Active</span>
                  <span className="rounded-lg px-3 py-2 text-sm font-semibold text-ink hover:bg-cream">Hover me</span>
                  <span className="rounded-lg px-3 py-2 text-sm font-semibold text-ink">Default</span>
                  <span className="rounded-lg px-3 py-2 text-sm font-semibold text-ink">
                    Badge
                    <span className="ml-1.5 rounded-full bg-tangerine px-1.5 py-0.5 text-xs font-bold text-white">3</span>
                  </span>
                </div>
              </div>
              <p className="text-sm text-ink-soft">
                Links: <CopyToken value="rounded-lg px-3 py-2 text-sm font-semibold" />. Active state{" "}
                <CopyToken value="bg-fern-soft text-fern-deep" />, hover <CopyToken value="hover:bg-cream" />.
              </p>
            </div>
          </Section>

          {/* ── Tables ── */}
          <Section id="tables" title="Tables" kicker="Components">
            <div className="overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink-soft">
                    <th className="px-5 py-4 font-semibold">Artist</th>
                    <th className="px-5 py-4 font-semibold">Medium</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Barbara Odil", "Wood Sculpture", "Live", "bg-fern-soft text-fern-deep"],
                    ["Tex McCallister", "Ceramics", "Needs review", "bg-tangerine-soft text-tangerine-deep"],
                    ["Jamie Rowe", "Textiles", "Draft", "bg-cream text-ink-soft"],
                  ].map(([n, m, s, cls]) => (
                    <tr key={n} className="border-b border-ink/5 last:border-0 hover:bg-cream-soft">
                      <td className="px-5 py-4 font-display font-bold">{n}</td>
                      <td className="px-5 py-4 text-ink-soft">{m}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{s}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-ink/10 px-5 py-4 text-sm text-ink-soft">3 artists</div>
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              Container <CopyToken value="rounded-xl bg-white shadow-[var(--shadow-card)]" />; header row{" "}
              <CopyToken value="text-xs uppercase tracking-wide text-ink-soft" />; hover{" "}
              <CopyToken value="hover:bg-cream-soft" />.
            </p>
          </Section>

          {/* ── Layout & grid ── */}
          <Section id="layout" title="Layout & grid" kicker="Structure">
            <div className="space-y-4">
              <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
                <Spec label="Container"><CopyToken value="mx-auto max-w-7xl px-5 sm:px-8" /></Spec>
                <div className="mt-2"><Spec label="Left edge">Content aligns with the header logo — every page uses the same container.</Spec></div>
                <div className="mt-2"><Spec label="Section rhythm"><CopyToken value="py-14" /> to <CopyToken value="py-28" /> vertical padding</Spec></div>
                <div className="mt-2"><Spec label="Gutters"><CopyToken value="gap-3" /> tiles · <CopyToken value="gap-10" />–<CopyToken value="gap-20" /> columns</Spec></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {["1", "2", "3", "4"].map((n) => (
                  <div key={n} className="flex h-16 items-center justify-center rounded-lg bg-cream text-sm font-semibold text-ink-soft">
                    Col {n}
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── Motion ── */}
          <Section id="motion" title="Motion" kicker="Feel">
            <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
              <div className="ahm-rise inline-flex items-center gap-2 rounded-lg bg-fern-soft px-4 py-2 font-semibold text-fern-deep">
                <SparkleIcon size={18} /> ahm-rise — the signature entrance
              </div>
              <div className="mt-5 space-y-1 text-sm">
                <Spec label="Easing"><CopyToken value="--ease-out-expo" /> · cubic-bezier(0.16, 1, 0.3, 1)</Spec>
                <Spec label="Entrance"><CopyToken value=".ahm-rise" /> — fade + rise + de-blur, 0.9s</Spec>
                <Spec label="Flower spin"><CopyToken value=".ahm-spin" /> — 60s linear loop</Spec>
                <Spec label="Marquee"><CopyToken value=".ahm-marquee" /> — 120s, pauses on hover</Spec>
              </div>
              <p className="mt-4 text-sm text-ink-soft">
                All motion is disabled under <code className="font-mono text-xs">prefers-reduced-motion</code>.
              </p>
            </div>
          </Section>

          {/* ── Accessibility ── */}
          <Section id="a11y" title="Accessibility" kicker="Non-negotiable">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
                <h3 className="font-display font-bold">Focus</h3>
                <p className="mt-1 text-sm text-ink-soft">
                  <CopyToken value="3px solid var(--color-berry)" />, offset 2px, on every interactive element.
                </p>
                <button className="mt-3 rounded-lg border-2 border-ink/15 px-4 py-2 text-sm font-semibold">
                  Tab to me to see the ring
                </button>
              </div>
              <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
                <h3 className="font-display font-bold">Selection</h3>
                <p className="mt-1 text-sm text-ink-soft">
                  Highlight this sentence — selection is fern deep on white.
                </p>
              </div>
              <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)] sm:col-span-2">
                <h3 className="font-display font-bold">Checklist</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                  <li>• Contrast: body text uses AA-safe colors only (see Color).</li>
                  <li>• Skip-to-content link on every page; semantic landmark + heading order.</li>
                  <li>• Icon-only controls carry an <code className="font-mono text-xs">aria-label</code>.</li>
                  <li>• Motion respects <code className="font-mono text-xs">prefers-reduced-motion</code>.</li>
                  <li>• Inputs have visible labels and <code className="font-mono text-xs">autoComplete</code>.</li>
                </ul>
              </div>
            </div>
          </Section>

          {/* ── Social ── */}
          <Section id="social" title="Social" kicker="Channels">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
                <h3 className="font-display font-bold">Handles</h3>
                <div className="mt-3 space-y-2 text-sm">
                  <a href={site.social.instagramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-semibold text-ink hover:text-fern-deep">
                    <InstagramIcon size={18} /> {site.social.instagram}
                  </a>
                  <a href={site.social.facebookUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-semibold text-ink hover:text-fern-deep">
                    <FacebookIcon size={18} /> /athensholidaymarket
                  </a>
                  <p className="flex items-center gap-2 text-ink-soft">
                    <SparkleIcon size={18} /> Hashtag: <span className="font-semibold text-ink">{site.social.hashtag}</span>
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
                <h3 className="font-display font-bold">Share graphics</h3>
                <p className="mt-1 text-sm text-ink-soft">
                  Feed &amp; story cards are generated on-brand from artist photos (canvas) in the admin
                  Social kit and the artist hub — accent color per medium, pinwheel badge, letter-spaced eyebrow.
                </p>
                <div className="mt-3 flex gap-2">
                  <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-fuchsia to-berry" />
                  <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-teal to-fern-deep" />
                  <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-tangerine to-poppy" />
                </div>
              </div>
            </div>
          </Section>
        </div>

        <footer className="mt-16 border-t border-ink/10 pt-8 text-sm text-ink-soft">
          <p>
            Athens Holiday Market design system · built by{" "}
            <a href="https://aarronwalter.com" target="_blank" rel="noreferrer" className="font-semibold text-fern-deep underline underline-offset-4">
              Aarron Walter
            </a>. Tokens live in <code className="font-mono text-xs">src/app/globals.css</code>.
          </p>
        </footer>
      </main>
    </div>
  );
}
