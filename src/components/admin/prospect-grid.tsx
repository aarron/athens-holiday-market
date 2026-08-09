"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BlobImage } from "@/components/blob-image";
import { setProspectStatus, updateProspectContact } from "@/lib/prospect-actions";
import { splitProspectName, athensProximity, webSearchUrl } from "@/lib/prospects";
import type { ProspectCard, ProspectStatus } from "@/lib/prospect-data";
import {
  ThumbsUpIcon,
  ThumbsDownIcon,
  MaybeIcon,
  BackIcon,
  ArrowRightIcon,
  CloseIcon,
  GlobeIcon,
  InstagramIcon,
  MailIcon,
  MapPinIcon,
  ExternalIcon,
} from "@/components/icons";

const PROX_TONE: Record<"local" | "near" | "far", string> = {
  local: "bg-fern-soft text-fern-deeper",
  near: "bg-sky-soft text-sky-deep",
  far: "bg-poppy/10 text-poppy-deep",
};

function ProximityBadge({ card }: { card: ProspectCard }) {
  const p = athensProximity(card);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${PROX_TONE[p.tone]}`}>
      <MapPinIcon size={12} aria-hidden /> {p.label}
    </span>
  );
}

type Decision = "shortlisted" | "maybe" | "passed";
const DECISION: Record<
  Decision,
  { label: string; key: string; Icon: typeof ThumbsUpIcon; hue: string; soft: string; text: string }
> = {
  shortlisted: { label: "Invite", key: "Y", Icon: ThumbsUpIcon, hue: "var(--color-fern-deep)", soft: "bg-fern-soft", text: "text-fern-deeper" },
  maybe: { label: "Maybe", key: "M", Icon: MaybeIcon, hue: "var(--color-tangerine)", soft: "bg-tangerine-soft", text: "text-tangerine-deep" },
  passed: { label: "Ignore", key: "N", Icon: ThumbsDownIcon, hue: "var(--color-poppy)", soft: "bg-poppy/10", text: "text-poppy-deep" },
};

const STATUS_CHIP: Record<ProspectStatus, string> = {
  new: "bg-cream text-ink-soft",
  shortlisted: "bg-fern-soft text-fern-deeper",
  maybe: "bg-tangerine-soft text-tangerine-deep",
  passed: "bg-poppy/10 text-poppy-deep",
};
const STATUS_LABEL: Record<ProspectStatus, string> = {
  new: "New",
  shortlisted: "Invite",
  maybe: "Maybe",
  passed: "Ignore",
};

/** The three Yes / Maybe / No buttons, reused on tiles and in the modal. */
function TriageButtons({
  current,
  onPick,
  size = "sm",
  disabled,
}: {
  current: ProspectStatus;
  onPick: (s: Decision) => void;
  size?: "sm" | "lg";
  disabled?: boolean;
}) {
  return (
    <div className="flex items-stretch gap-1.5">
      {(["shortlisted", "passed", "maybe"] as Decision[]).map((s) => {
        const d = DECISION[s];
        const active = current === s;
        const Icon = d.Icon;
        return (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onPick(s);
            }}
            title={`${d.label} (${d.key})`}
            aria-label={d.label}
            aria-pressed={active}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg border-2 font-display font-bold transition-transform hover:-translate-y-0.5 disabled:opacity-50 ${
              size === "lg" ? "px-4 py-2.5 text-sm" : "px-2 py-1.5 text-xs"
            } ${active ? `${d.soft} ${d.text}` : "bg-white text-ink-soft"}`}
            style={{ borderColor: active ? d.hue : "var(--color-ink-10, rgba(23,22,27,0.12))" }}
          >
            <Icon size={size === "lg" ? 20 : 16} aria-hidden />
            {size === "lg" && d.label}
          </button>
        );
      })}
    </div>
  );
}

export function ProspectGrid({
  cards,
  viewStatus = "all",
}: {
  cards: ProspectCard[];
  viewStatus?: ProspectStatus | "all";
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [statuses, setStatuses] = useState<Record<number, ProspectStatus>>({});
  const [openId, setOpenId] = useState<number | null>(null);

  const statusOf = (c: ProspectCard): ProspectStatus => statuses[c.id] ?? c.status;

  const triage = useCallback(
    (id: number, status: Decision) => {
      setStatuses((m) => ({ ...m, [id]: status }));
      start(async () => {
        await setProspectStatus({ id, status });
        router.refresh(); // keep the top stat tiles + filter counts in sync
      });
    },
    [router],
  );

  // Inbox behavior: in a specific bucket (e.g. "To review"), a tile leaves the
  // pile the moment its optimistic status no longer matches the view.
  const visible =
    viewStatus === "all" ? cards : cards.filter((c) => statusOf(c) === viewStatus);

  const open = cards.find((c) => c.id === openId) ?? null;

  return (
    <>
      {viewStatus === "new" && visible.length > 0 && (
        <p className="text-sm font-semibold text-ink-soft">
          {visible.length} left to review
        </p>
      )}
      {viewStatus === "new" && visible.length === 0 && (
        <div className="rounded-xl bg-white p-10 text-center shadow-[var(--shadow-card)]">
          <p className="text-ink-soft">🎉 Inbox zero — you triaged everything in this pile.</p>
        </div>
      )}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((p) => {
          const st = statusOf(p);
          const { business, maker } = splitProspectName(p.name);
          return (
            <li
              key={p.id}
              className="flex flex-col overflow-hidden rounded-xl bg-white shadow-[var(--shadow-card)]"
            >
              <button
                type="button"
                onClick={() => setOpenId(p.id)}
                className="relative block aspect-[4/3] w-full bg-cream text-left"
                aria-label={`View ${business}`}
              >
                <BlobImage
                  src={p.images[0] ?? p.sitePreview}
                  alt={business}
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 25vw"
                />
                <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_CHIP[st]}`}>
                  {STATUS_LABEL[st]}
                </span>
                {p.images.length > 1 && (
                  <span className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2 py-0.5 text-xs font-semibold text-paper">
                    {p.images.length} photos
                  </span>
                )}
                {p.images.length === 0 && p.sitePreview && (
                  <span className="absolute bottom-2 left-2 rounded-full bg-ink/70 px-2 py-0.5 text-xs font-semibold text-paper">
                    Site preview
                  </span>
                )}
              </button>
              <div className="flex flex-1 flex-col gap-1.5 p-4">
                <button type="button" onClick={() => setOpenId(p.id)} className="text-left">
                  <h2 className="font-display text-lg font-bold leading-tight hover:underline">{business}</h2>
                  {maker && <p className="text-xs font-semibold text-ink-soft">{maker}</p>}
                </button>
                {p.medium && <p className="text-sm text-ink-soft">{p.medium}</p>}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-ink-soft">
                    {[p.city, p.state].filter(Boolean).join(", ") || p.category}
                  </span>
                  <ProximityBadge card={p} />
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-sm font-semibold">
                  {p.website ? (
                    <a
                      href={p.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="link inline-flex items-center gap-1"
                    >
                      <GlobeIcon size={14} aria-hidden /> Website
                    </a>
                  ) : (
                    <a
                      href={webSearchUrl(splitProspectName(p.name).business, p.medium)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="link inline-flex items-center gap-1"
                    >
                      <GlobeIcon size={14} aria-hidden /> Search
                    </a>
                  )}
                  {p.instagram && (
                    <a
                      href={`https://instagram.com/${p.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="link inline-flex items-center gap-1"
                    >
                      <InstagramIcon size={14} aria-hidden /> @{p.instagram}
                    </a>
                  )}
                  {p.email ? (
                    <a
                      href={`mailto:${p.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="link inline-flex items-center gap-1"
                    >
                      <MailIcon size={14} aria-hidden /> Email
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-ink-soft/70">
                      <MailIcon size={14} aria-hidden /> no email
                    </span>
                  )}
                </div>
                <div className="mt-auto pt-2">
                  <TriageButtons current={st} onPick={(s) => triage(p.id, s)} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {open && (
        <ProspectModal
          card={open}
          status={statusOf(open)}
          onTriage={(s) => triage(open.id, s)}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}

function ProspectModal({
  card,
  status,
  onTriage,
  onClose,
}: {
  card: ProspectCard;
  status: ProspectStatus;
  onTriage: (s: Decision) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [, startSave] = useTransition();
  const [idx, setIdx] = useState(0);
  const { business, maker } = splitProspectName(card.name);
  const imgs = card.images;

  // Manual contact editing (email / website / Instagram).
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    email: card.email ?? "",
    website: card.website ?? "",
    instagram: card.instagram ?? "",
  });
  const [saveMsg, setSaveMsg] = useState("");

  const step = useCallback(
    (d: number) => imgs.length > 1 && setIdx((n) => (n + d + imgs.length) % imgs.length),
    [imgs.length],
  );

  function saveContact() {
    setSaveMsg("");
    startSave(async () => {
      const r = await updateProspectContact({ id: card.id, ...form });
      if (r && "ok" in r && r.ok) {
        setEditing(false);
        router.refresh(); // reflect the saved values (and any new photos)
      } else {
        setSaveMsg(r?.error ?? "Couldn't save.");
      }
    });
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack typing while editing contact fields.
      if (editing) {
        if (e.key === "Escape") setEditing(false);
        return;
      }
      const k = e.key.toLowerCase();
      if (e.key === "Escape") return onClose();
      if (e.key === "ArrowRight") return step(1);
      if (e.key === "ArrowLeft") return step(-1);
      if (k === "y") return onTriage("shortlisted");
      if (k === "m") return onTriage("maybe");
      if (k === "n") return onTriage("passed");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, onTriage, onClose, editing]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={business}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-lift)] lg:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full bg-ink/60 p-1.5 text-paper hover:bg-ink/80"
        >
          <CloseIcon size={18} aria-hidden />
        </button>

        {/* Photos */}
        <div className="flex flex-col bg-cream lg:w-[58%]">
          <div className="relative aspect-[4/3] w-full">
            {imgs.length > 0 ? (
              <BlobImage src={imgs[idx] ?? null} alt={business} sizes="(max-width: 1024px) 100vw, 58vw" flowerSize={56} />
            ) : card.sitePreview && card.website ? (
              <a href={card.website} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
                <BlobImage src={card.sitePreview} alt={`${business} website`} sizes="(max-width: 1024px) 100vw, 58vw" flowerSize={56} />
                <span className="absolute inset-x-0 bottom-0 bg-ink/70 px-3 py-1.5 text-center text-xs font-semibold text-paper">
                  Website preview — click to open the site ↗
                </span>
              </a>
            ) : (
              <BlobImage src={null} alt={business} sizes="(max-width: 1024px) 100vw, 58vw" flowerSize={56} />
            )}
            {imgs.length > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/55 p-1.5 text-paper hover:bg-ink/75">
                  <BackIcon size={18} aria-hidden />
                </button>
                <button type="button" onClick={() => step(1)} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/55 p-1.5 text-paper hover:bg-ink/75">
                  <ArrowRightIcon size={18} aria-hidden />
                </button>
              </>
            )}
          </div>
          {imgs.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto p-2">
              {imgs.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md ring-2 ${i === idx ? "ring-fern-deep" : "ring-transparent"}`}
                  aria-label={`Photo ${i + 1}`}
                >
                  <BlobImage src={src} alt="" sizes="56px" flowerSize={18} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info + triage */}
        <div className="flex flex-1 flex-col overflow-y-auto p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_CHIP[status]}`}>
                {STATUS_LABEL[status]}
              </span>
              {card.foundVia && <span className="text-xs text-ink-soft">via {card.foundVia}</span>}
            </div>
            {!editing && (
              <button
                type="button"
                onClick={() => {
                  setForm({ email: card.email ?? "", website: card.website ?? "", instagram: card.instagram ?? "" });
                  setSaveMsg("");
                  setEditing(true);
                }}
                className="link text-sm font-semibold"
              >
                Edit details
              </button>
            )}
          </div>
          <h2 className="mt-2 font-display text-2xl font-extrabold leading-tight">{business}</h2>
          {maker && <p className="text-sm font-semibold text-ink-soft">{maker}</p>}
          <p className="mt-1 text-sm text-ink-soft">
            {[card.medium, card.category].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {(card.city || card.state) && (
              <span className="text-xs text-ink-soft">
                {[card.city, card.state].filter(Boolean).join(", ")}
              </span>
            )}
            <ProximityBadge card={card} />
          </div>
          {card.description && <p className="mt-3 text-sm text-ink">{card.description}</p>}
          {card.notes && <p className="mt-2 text-sm text-ink-soft">{card.notes}</p>}

          {editing ? (
            /* Manual contact edit */
            <div className="mt-3 space-y-2">
              {(["website", "instagram", "email"] as const).map((f) => (
                <label key={f} className="block">
                  <span className="mb-0.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    {f === "instagram" ? "Instagram (handle or URL)" : f}
                  </span>
                  <input
                    value={form[f]}
                    onChange={(e) => setForm((m) => ({ ...m, [f]: e.target.value }))}
                    placeholder={
                      f === "email" ? "artist@email.com" : f === "website" ? "https://…" : "@handle"
                    }
                    className="h-9 w-full rounded-lg border-2 border-ink/15 bg-paper px-3 text-sm outline-none focus:border-fern-deep"
                  />
                </label>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={saveContact}
                  className="rounded-lg bg-fern-deep px-4 py-2 text-sm font-display font-bold text-white hover:bg-fern-deeper"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-cream"
                >
                  Cancel
                </button>
                {saveMsg && <span className="text-xs text-poppy-deep">{saveMsg}</span>}
              </div>
            </div>
          ) : (
            <>
              {/* See the work */}
              <div className="mt-3 flex flex-wrap gap-2">
                {card.website ? (
                  <a
                    href={card.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm font-display font-bold text-paper hover:bg-ink-soft"
                  >
                    <GlobeIcon size={15} aria-hidden /> Visit website <ExternalIcon size={13} aria-hidden />
                  </a>
                ) : (
                  <a
                    href={webSearchUrl(business, card.medium)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border-2 border-ink/15 px-3 py-2 text-sm font-semibold text-ink hover:bg-cream"
                  >
                    <GlobeIcon size={15} aria-hidden /> Search the web <ExternalIcon size={13} aria-hidden />
                  </a>
                )}
                {card.instagram && (
                  <a
                    href={`https://instagram.com/${card.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border-2 border-ink/15 px-3 py-2 text-sm font-semibold text-ink hover:bg-cream"
                  >
                    <InstagramIcon size={15} aria-hidden /> Instagram <ExternalIcon size={13} aria-hidden />
                  </a>
                )}
              </div>

              {/* Email on file? */}
              <div className="mt-2 text-sm">
                {card.email ? (
                  <a href={`mailto:${card.email}`} className="link inline-flex items-center gap-1">
                    <MailIcon size={14} aria-hidden /> {card.email}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                    <MailIcon size={13} aria-hidden /> No email on file — you&rsquo;d need to track it down
                  </span>
                )}
              </div>
            </>
          )}

          <div className="mt-auto pt-6">
            <TriageButtons current={status} onPick={onTriage} size="lg" />
            <p className="mt-2 text-center text-xs text-ink-soft">
              Keys: <kbd className="rounded bg-cream px-1">Y</kbd> <kbd className="rounded bg-cream px-1">M</kbd>{" "}
              <kbd className="rounded bg-cream px-1">N</kbd> · <kbd className="rounded bg-cream px-1">←</kbd>{" "}
              <kbd className="rounded bg-cream px-1">→</kbd> photos · <kbd className="rounded bg-cream px-1">Esc</kbd>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
