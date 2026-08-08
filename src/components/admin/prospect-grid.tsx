"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BlobImage } from "@/components/blob-image";
import { setProspectStatus } from "@/lib/prospect-actions";
import { splitProspectName } from "@/lib/prospects";
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
} from "@/components/icons";

type Decision = "shortlisted" | "maybe" | "passed";
const DECISION: Record<
  Decision,
  { label: string; key: string; Icon: typeof ThumbsUpIcon; hue: string; soft: string; text: string }
> = {
  shortlisted: { label: "Yes", key: "Y", Icon: ThumbsUpIcon, hue: "var(--color-fern-deep)", soft: "bg-fern-soft", text: "text-fern-deeper" },
  maybe: { label: "Maybe", key: "M", Icon: MaybeIcon, hue: "var(--color-tangerine)", soft: "bg-tangerine-soft", text: "text-tangerine-deep" },
  passed: { label: "No", key: "N", Icon: ThumbsDownIcon, hue: "var(--color-poppy)", soft: "bg-poppy/10", text: "text-poppy-deep" },
};

const STATUS_CHIP: Record<ProspectStatus, string> = {
  new: "bg-cream text-ink-soft",
  shortlisted: "bg-fern-soft text-fern-deeper",
  maybe: "bg-tangerine-soft text-tangerine-deep",
  passed: "bg-poppy/10 text-poppy-deep",
};
const STATUS_LABEL: Record<ProspectStatus, string> = {
  new: "New",
  shortlisted: "Shortlisted",
  maybe: "Maybe",
  passed: "Passed",
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
      {(["passed", "maybe", "shortlisted"] as Decision[]).map((s) => {
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

export function ProspectGrid({ cards }: { cards: ProspectCard[] }) {
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

  const open = cards.find((c) => c.id === openId) ?? null;

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((p) => {
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
                <p className="text-xs text-ink-soft">
                  {[p.city, p.state].filter(Boolean).join(", ")}
                  {p.category ? ` · ${p.category}` : ""}
                </p>
                {(p.website || p.instagram || p.email) && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-sm font-semibold">
                    {p.website && (
                      <a
                        href={p.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="link inline-flex items-center gap-1"
                      >
                        <GlobeIcon size={14} aria-hidden /> Website
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
                    {p.email && (
                      <a
                        href={`mailto:${p.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="link inline-flex items-center gap-1"
                      >
                        <MailIcon size={14} aria-hidden /> Email
                      </a>
                    )}
                  </div>
                )}
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
  const [idx, setIdx] = useState(0);
  const { business, maker } = splitProspectName(card.name);
  const imgs = card.images;

  const step = useCallback(
    (d: number) => imgs.length > 1 && setIdx((n) => (n + d + imgs.length) % imgs.length),
    [imgs.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
  }, [step, onTriage, onClose]);

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
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_CHIP[status]}`}>
              {STATUS_LABEL[status]}
            </span>
            {card.foundVia && <span className="text-xs text-ink-soft">via {card.foundVia}</span>}
          </div>
          <h2 className="mt-2 font-display text-2xl font-extrabold leading-tight">{business}</h2>
          {maker && <p className="text-sm font-semibold text-ink-soft">{maker}</p>}
          <p className="mt-1 text-sm text-ink-soft">
            {[card.medium, card.category].filter(Boolean).join(" · ")}
          </p>
          {(card.city || card.region) && (
            <p className="text-xs text-ink-soft">
              {[card.city, card.state].filter(Boolean).join(", ")}
              {card.region ? ` · ${card.region}` : ""}
            </p>
          )}
          {card.description && <p className="mt-3 text-sm text-ink">{card.description}</p>}
          {card.notes && <p className="mt-2 text-sm text-ink-soft">{card.notes}</p>}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {card.website && (
              <a href={card.website} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
                <GlobeIcon size={14} aria-hidden /> Website
              </a>
            )}
            {card.instagram && (
              <a href={`https://instagram.com/${card.instagram}`} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
                <InstagramIcon size={14} aria-hidden /> @{card.instagram}
              </a>
            )}
            {card.email && (
              <a href={`mailto:${card.email}`} className="link inline-flex items-center gap-1">
                <MailIcon size={14} aria-hidden /> {card.email}
              </a>
            )}
          </div>

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
