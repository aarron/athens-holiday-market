"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { BlobImage } from "@/components/blob-image";
import { setProspectStatus } from "@/lib/prospect-actions";
import { splitProspectName } from "@/lib/prospects";
import type { ProspectCard } from "@/lib/prospect-data";
import {
  ThumbsUpIcon,
  ThumbsDownIcon,
  MaybeIcon,
  BackIcon,
  ArrowRightIcon,
  GlobeIcon,
  InstagramIcon,
  MailIcon,
  CelebrateIcon,
} from "@/components/icons";

type Decision = "shortlisted" | "maybe" | "passed";
const DECISION = {
  shortlisted: { label: "Shortlist", key: "Y", Icon: ThumbsUpIcon, hue: "var(--color-fern-deep)", soft: "bg-fern-soft", text: "text-fern-deeper" },
  maybe: { label: "Maybe", key: "M", Icon: MaybeIcon, hue: "var(--color-tangerine)", soft: "bg-tangerine-soft", text: "text-tangerine-deep" },
  passed: { label: "Pass", key: "N", Icon: ThumbsDownIcon, hue: "var(--color-poppy)", soft: "bg-poppy/10", text: "text-poppy-deep" },
} as const;

const SWIPE_THRESHOLD = 110;

export function ProspectDeck({ queue }: { queue: ProspectCard[] }) {
  // Freeze the working set on mount. Deciding a card revalidates the prospects
  // list, which can shrink the `queue` prop mid-session; a frozen snapshot keeps
  // the deck deterministic so cards are never skipped underneath the reviewer.
  const [cards] = useState(queue);
  const [idx, setIdx] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);
  const [counts, setCounts] = useState({ shortlisted: 0, maybe: 0, passed: 0 });
  const [history, setHistory] = useState<{ id: number; status: Decision }[]>([]);
  const [exit, setExit] = useState<null | "left" | "right" | "up">(null);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [, startTransition] = useTransition();

  const total = cards.length;
  const current = cards[idx];
  const done = idx >= total;

  const decide = useCallback(
    (status: Decision) => {
      if (!current || exit) return;
      const dir = status === "shortlisted" ? "right" : status === "passed" ? "left" : "up";
      const id = current.id;
      setHistory((h) => [...h, { id, status }]);
      setExit(dir);
      startTransition(() => void setProspectStatus({ id, status }));
      window.setTimeout(() => {
        setCounts((c) => ({ ...c, [status]: c[status] + 1 }));
        setIdx((i) => i + 1);
        setImgIdx(0);
        setDrag(null);
        setExit(null);
      }, 180);
    },
    [current, exit, startTransition],
  );

  const undo = useCallback(() => {
    if (exit) return;
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setCounts((c) => ({ ...c, [last.status]: Math.max(0, c[last.status] - 1) }));
    setIdx((i) => Math.max(0, i - 1));
    setImgIdx(0);
    startTransition(() => void setProspectStatus({ id: last.id, status: "new" }));
  }, [exit, history, startTransition]);

  // Fall back to a live website screenshot when a prospect has no real photos.
  const images = current
    ? current.images.length
      ? current.images
      : current.sitePreview
        ? [current.sitePreview]
        : []
    : [];
  const stepImg = useCallback(
    (delta: number) => {
      if (images.length < 2) return;
      setImgIdx((n) => (n + delta + images.length) % images.length);
    },
    [images.length],
  );

  // Keyboard: Y / M / N to decide, ← / → to flip photos, U or Z to undo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "y") return decide("shortlisted");
      if (k === "m") return decide("maybe");
      if (k === "n") return decide("passed");
      if (k === "u" || k === "z") return undo();
      if (e.key === "ArrowRight") return stepImg(1);
      if (e.key === "ArrowLeft") return stepImg(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, undo, stepImg]);

  // Pointer swipe on the image surface.
  const onPointerDown = (e: React.PointerEvent) => {
    if (exit) return;
    dragStart.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    setDrag({ dx: e.clientX - dragStart.current.x, dy: e.clientY - dragStart.current.y });
  };
  const onPointerUp = () => {
    if (!dragStart.current) return;
    const d = drag;
    dragStart.current = null;
    if (!d) return;
    if (d.dx > SWIPE_THRESHOLD) return decide("shortlisted");
    if (d.dx < -SWIPE_THRESHOLD) return decide("passed");
    if (d.dy < -SWIPE_THRESHOLD) return decide("maybe");
    setDrag(null);
  };

  if (done) {
    const reviewed = counts.shortlisted + counts.maybe + counts.passed;
    return (
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-10 text-center shadow-[var(--shadow-card)]">
        <CelebrateIcon size={44} aria-hidden />
        <h2 className="mt-3 font-display text-2xl font-extrabold">
          {reviewed > 0 ? "Deck cleared!" : "Nothing to review"}
        </h2>
        <p className="mt-1 text-ink-soft">
          {reviewed > 0
            ? `You triaged ${reviewed} prospect${reviewed === 1 ? "" : "s"} this session.`
            : "Every prospect has already been triaged."}
        </p>
        {reviewed > 0 && (
          <div className="mt-5 flex justify-center gap-3">
            {(Object.keys(DECISION) as Decision[]).map((s) => (
              <span key={s} className={`flex items-center gap-1.5 rounded-full ${DECISION[s].soft} px-3 py-1.5 text-sm font-bold ${DECISION[s].text}`}>
                {(() => { const I = DECISION[s].Icon; return <I size={15} aria-hidden />; })()}
                {counts[s]} {DECISION[s].label.toLowerCase()}
              </span>
            ))}
          </div>
        )}
        <div className="mt-6 flex justify-center gap-3">
          {history.length > 0 && (
            <button onClick={undo} className="rounded-lg border-2 border-ink/15 px-4 py-2 text-sm font-semibold hover:bg-cream">
              Undo last
            </button>
          )}
          <Link href="/admin/prospects" className="rounded-lg bg-ink px-4 py-2 text-sm font-display font-bold text-paper hover:bg-ink-soft">
            Back to all prospects
          </Link>
        </div>
      </div>
    );
  }

  const { business, maker } = splitProspectName(current.name);
  const reviewed = idx;
  const pct = total ? Math.round((reviewed / total) * 100) : 0;

  // Card transform from drag or exit animation.
  const cardStyle: React.CSSProperties = exit
    ? {
        transform:
          exit === "left"
            ? "translateX(-140%) rotate(-12deg)"
            : exit === "right"
              ? "translateX(140%) rotate(12deg)"
              : "translateY(-140%)",
        opacity: 0,
        transition: "transform 180ms ease-out, opacity 180ms ease-out",
      }
    : drag
      ? {
          transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(${drag.dx / 22}deg)`,
        }
      : { transition: "transform 160ms ease-out" };

  // Which decision the current drag is leaning toward (for the overlay hint).
  const lean: Decision | null = drag
    ? drag.dx > 60
      ? "shortlisted"
      : drag.dx < -60
        ? "passed"
        : drag.dy < -60
          ? "maybe"
          : null
    : null;

  return (
    <div className="mx-auto max-w-xl">
      {/* Progress */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-semibold text-ink-soft">
            {reviewed} of {total} reviewed
          </span>
          <span className="flex gap-2">
            {(Object.keys(DECISION) as Decision[]).map((s) => (
              <span key={s} className={`flex items-center gap-1 text-xs font-bold ${DECISION[s].text}`}>
                {(() => { const I = DECISION[s].Icon; return <I size={13} aria-hidden />; })()}
                {counts[s]}
              </span>
            ))}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-cream">
          <div className="h-full rounded-full bg-fern-deep transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Card */}
      <div className="relative select-none rounded-2xl bg-white shadow-[var(--shadow-card)]" style={cardStyle}>
        {/* Image / swipe surface */}
        <div
          className="relative h-[38vh] min-h-[220px] max-h-[360px] cursor-grab touch-none overflow-hidden rounded-t-2xl bg-cream active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <BlobImage
            key={imgIdx}
            src={images[imgIdx] ?? null}
            alt={business}
            sizes="(max-width: 640px) 100vw, 576px"
            flowerSize={48}
          />
          {/* Swipe-lean overlay */}
          {lean && (
            <div
              className={`pointer-events-none absolute inset-0 flex items-center justify-center ${DECISION[lean].soft} opacity-80`}
            >
              <span className={`flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2 font-display text-xl font-extrabold ${DECISION[lean].text}`}>
                {(() => { const I = DECISION[lean].Icon; return <I size={24} aria-hidden />; })()}
                {DECISION[lean].label}
              </span>
            </div>
          )}
          {/* Carousel controls */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => stepImg(-1)}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/55 p-1.5 text-paper hover:bg-ink/75"
              >
                <BackIcon size={18} aria-hidden />
              </button>
              <button
                onClick={() => stepImg(1)}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/55 p-1.5 text-paper hover:bg-ink/75"
              >
                <ArrowRightIcon size={18} aria-hidden />
              </button>
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                {images.map((_, i) => (
                  <span key={i} className={`h-1.5 rounded-full transition-all ${i === imgIdx ? "w-4 bg-paper" : "w-1.5 bg-paper/50"}`} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Details */}
        <div className="space-y-2 p-5">
          <div>
            <h2 className="font-display text-2xl font-extrabold leading-tight">{business}</h2>
            {maker && <p className="text-sm font-semibold text-ink-soft">{maker}</p>}
          </div>
          <p className="text-sm text-ink-soft">
            {[current.medium, current.category].filter(Boolean).join(" · ")}
          </p>
          {(current.city || current.region) && (
            <p className="text-xs text-ink-soft">
              {[current.city, current.state].filter(Boolean).join(", ")}
              {current.region ? ` · ${current.region}` : ""}
            </p>
          )}
          {current.description && <p className="text-sm text-ink">{current.description}</p>}
          {current.notes && <p className="text-sm text-ink-soft">{current.notes}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm">
            {current.website && (
              <a href={current.website} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
                <GlobeIcon size={14} aria-hidden /> Website
              </a>
            )}
            {current.instagram && (
              <a href={`https://instagram.com/${current.instagram}`} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
                <InstagramIcon size={14} aria-hidden /> @{current.instagram}
              </a>
            )}
            {current.email && (
              <a href={`mailto:${current.email}`} className="link inline-flex items-center gap-1">
                <MailIcon size={14} aria-hidden /> Email
              </a>
            )}
            {current.foundVia && <span className="text-ink-soft">via {current.foundVia}</span>}
          </div>
        </div>
      </div>

      {/* Decision buttons */}
      <div className="mt-5 flex items-stretch justify-center gap-3">
        {(["passed", "maybe", "shortlisted"] as Decision[]).map((s) => {
          const d = DECISION[s];
          const Icon = d.Icon;
          return (
            <button
              key={s}
              onClick={() => decide(s)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl border-2 bg-white px-4 py-3 font-display font-bold transition-transform hover:-translate-y-0.5 ${d.text}`}
              style={{ borderColor: d.hue }}
            >
              <Icon size={26} aria-hidden />
              <span>{d.label}</span>
              <kbd className="rounded bg-cream px-1.5 py-0.5 text-xs font-semibold text-ink-soft">{d.key}</kbd>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 text-sm text-ink-soft">
        <button
          onClick={undo}
          disabled={history.length === 0}
          className="inline-flex items-center gap-1 font-semibold hover:text-ink disabled:opacity-40"
        >
          <BackIcon size={15} aria-hidden /> Undo (U)
        </button>
        <span aria-hidden>·</span>
        <span>Swipe or use ← → for photos</span>
      </div>
    </div>
  );
}
