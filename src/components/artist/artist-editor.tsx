"use client";

import { useRef, useState, useTransition } from "react";
import { submitArtistDraft } from "@/lib/artist-actions";
import { proofreadBio, type ProofreadMode } from "@/lib/proofread-actions";
import { ExternalIcon } from "@/components/icons";

function wordCount(s: string) {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

type Initial = {
  name: string;
  medium: string;
  bio: string;
  website: string;
  socials: Record<string, string>;
  logoUrl: string | null;
  photoUrls: string[];
};

const SOCIALS = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "etsy", label: "Etsy" },
  { key: "tiktok", label: "TikTok" },
] as const;

const MAX_PHOTOS = 6;

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/artist/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Upload failed.");
  }
  return (await res.json()).url as string;
}

export function ArtistEditor({
  initial,
  status,
  slug,
  published,
}: {
  initial: Initial;
  status: "draft" | "pending" | "published";
  slug: string;
  published: boolean;
}) {
  const [bio, setBio] = useState(initial.bio);
  const [website, setWebsite] = useState(initial.website);
  const [socials, setSocials] = useState<Record<string, string>>(initial.socials);
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl);
  const [photos, setPhotos] = useState<string[]>(initial.photoUrls);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [dragging, setDragging] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const [proofing, setProofing] = useState<ProofreadMode | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [proofErr, setProofErr] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  async function onAddPhotos(files: FileList | null) {
    if (!files) return;
    setUploadErr("");
    setUploading(true);
    try {
      const room = MAX_PHOTOS - photos.length;
      for (const file of Array.from(files).slice(0, room)) {
        const url = await uploadFile(file);
        setPhotos((p) => [...p, url]);
      }
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (photoInput.current) photoInput.current.value = "";
    }
  }

  async function onSetLogo(files: FileList | null) {
    if (!files?.[0]) return;
    setUploadErr("");
    setUploading(true);
    try {
      setLogoUrl(await uploadFile(files[0]));
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (logoInput.current) logoInput.current.value = "";
    }
  }

  async function onProofread(mode: ProofreadMode) {
    setProofErr("");
    setSuggestion(null);
    setProofing(mode);
    try {
      const res = await proofreadBio(bio, mode);
      if ("suggestion" in res && res.suggestion) setSuggestion(res.suggestion);
      else setProofErr(("error" in res && res.error) || "Couldn't help just now.");
    } catch {
      setProofErr("Couldn't help just now. Please try again.");
    } finally {
      setProofing(null);
    }
  }

  function acceptSuggestion() {
    if (suggestion) setBio(suggestion);
    setSuggestion(null);
  }

  function onSubmit() {
    setSaved(false);
    start(async () => {
      const res = await submitArtistDraft({ bio, website, socials, logoUrl, photoUrls: photos });
      if (res && "ok" in res && res.ok) setSaved(true);
      else setUploadErr((res && "error" in res && res.error) || "Couldn't save.");
    });
  }

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div>
        <h1 className="text-3xl font-extrabold">Your artist page</h1>
        <p className="mt-1 text-ink-soft">
          {initial.name}
          {initial.medium ? ` · ${initial.medium}` : ""}
        </p>
        <StatusBanner status={saved ? "pending" : status} slug={slug} published={published} />
      </div>

      {/* Photos */}
      <Card
        title="Photos of your work"
        hint={`Up to ${MAX_PHOTOS}. Drag & drop or click to add. These appear on your public page.`}
      >
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            e.preventDefault();
            if (e.currentTarget === e.target) setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onAddPhotos(e.dataTransfer.files);
          }}
          className={`rounded-xl p-1 transition-colors ${
            dragging ? "bg-fern-soft ring-2 ring-fern-deep" : ""
          }`}
        >
          <div className="grid grid-cols-3 gap-3">
            {photos.map((url, i) => (
              <div key={url} className="group relative overflow-hidden rounded-lg bg-cream">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="aspect-square w-full object-cover" />
                <button
                  onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                  className="absolute right-1.5 top-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-xs font-bold text-white"
                >
                  Remove
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                onClick={() => photoInput.current?.click()}
                disabled={uploading}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ink/25 text-sm font-semibold text-ink-soft hover:border-fern-deep hover:bg-cream disabled:opacity-60"
              >
                <span className="text-2xl leading-none">＋</span>
                {uploading ? "Uploading…" : "Add photos"}
              </button>
            )}
          </div>
          {photos.length < MAX_PHOTOS && (
            <p className="mt-2 text-center text-xs text-ink-soft/70">
              {dragging ? "Drop to upload" : "Drag & drop images anywhere in this box"}
            </p>
          )}
        </div>
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => onAddPhotos(e.target.files)}
        />
      </Card>

      {/* Logo */}
      <Card title="Logo" hint="Optional. A square logo works best.">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="Your logo" className="h-20 w-20 rounded-lg object-contain" />
              <button onClick={() => setLogoUrl(null)} className="text-sm font-semibold text-poppy">
                Remove
              </button>
            </>
          ) : (
            <button
              onClick={() => logoInput.current?.click()}
              disabled={uploading}
              className="rounded-md border-2 border-ink/15 px-4 py-2 text-sm font-semibold hover:bg-cream disabled:opacity-60"
            >
              Upload logo
            </button>
          )}
        </div>
        <input ref={logoInput} type="file" accept="image/*" hidden onChange={(e) => onSetLogo(e.target.files)} />
      </Card>

      {uploadErr && <p className="text-sm font-medium text-poppy">{uploadErr}</p>}

      {/* Statement */}
      <Card
        title="Artist statement"
        hint="Tell shoppers who you are and what you make. A short paragraph — 40–120 words — works best."
      >
        <textarea
          value={bio}
          onChange={(e) => {
            setBio(e.target.value);
            if (suggestion) setSuggestion(null);
          }}
          rows={6}
          placeholder="Example: I'm a potter based in Athens, throwing functional stoneware in small batches. Each piece is wheel-thrown and glazed by hand, so no two are quite alike. I've sold at local markets for six years and love making pieces people reach for every day."
          className="w-full rounded-md border-2 border-ink/15 bg-white px-3 py-2 outline-none focus:border-fern-deep"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onProofread("grammar")}
            disabled={proofing !== null || wordCount(bio) < 3}
            className="rounded-md border-2 border-ink/15 px-3 py-1.5 text-sm font-semibold hover:bg-cream disabled:opacity-50"
          >
            {proofing === "grammar" ? "Checking…" : "Check grammar & spelling"}
          </button>
          <button
            type="button"
            onClick={() => onProofread("polish")}
            disabled={proofing !== null || wordCount(bio) < 3}
            className="rounded-md border-2 border-ink/15 px-3 py-1.5 text-sm font-semibold hover:bg-cream disabled:opacity-50"
          >
            {proofing === "polish" ? "Polishing…" : "Polish for clarity"}
          </button>
          <span className="ml-auto text-xs text-ink-soft/70">{wordCount(bio)} words</span>
        </div>

        {proofErr && <p className="text-sm font-medium text-poppy">{proofErr}</p>}

        {suggestion && (
          <div className="rounded-lg border-2 border-fern-deep/25 bg-fern-soft/40 p-4">
            <p className="mb-1 text-sm font-bold text-fern-deep">Suggested version</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{suggestion}</p>
            <p className="mt-2 text-xs text-ink-soft/80">
              These are just suggestions — your words stay yours. Use them or keep your own.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={acceptSuggestion}
                className="rounded-md bg-fern-deep px-4 py-1.5 text-sm font-bold text-white hover:opacity-90"
              >
                Use this
              </button>
              <button
                type="button"
                onClick={() => setSuggestion(null)}
                className="rounded-md border-2 border-ink/15 px-4 py-1.5 text-sm font-semibold hover:bg-cream"
              >
                Keep mine
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Links */}
      <Card title="Website & socials" hint="Optional links to your shop and channels.">
        <Field label="Website">
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="yourwebsite.com"
            className="input"
          />
        </Field>
        {SOCIALS.map((s) => (
          <Field key={s.key} label={s.label}>
            <input
              value={socials[s.key] ?? ""}
              onChange={(e) => setSocials((prev) => ({ ...prev, [s.key]: e.target.value }))}
              placeholder={`${s.label} URL`}
              className="input"
            />
          </Field>
        ))}
      </Card>

      {/* Submit */}
      <div className="sticky bottom-4 rounded-xl bg-ink p-4 shadow-[var(--shadow-lift)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-paper/80">
            Submitting sends your page to our team for review before it goes live.
          </p>
          <button
            onClick={onSubmit}
            disabled={pending || uploading}
            className="rounded-md bg-fuchsia px-6 py-2.5 font-display font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Submitting…" : "Submit for review"}
          </button>
        </div>
        {saved && <p className="mt-2 text-sm font-semibold text-chartreuse">Submitted! We&apos;ll review it soon. ✓</p>}
      </div>

      <style>{`.input{height:2.75rem;width:100%;border-radius:0.375rem;border:2px solid rgba(23,22,27,0.15);background:#fff;padding:0 0.75rem;outline:none}.input:focus{border-color:var(--color-fern-deep)}`}</style>
    </div>
  );
}

function StatusBanner({ status, slug, published }: { status: string; slug: string; published: boolean }) {
  const map: Record<string, { cls: string; text: string }> = {
    draft: { cls: "bg-sky-soft text-sky", text: "Draft — not yet submitted. Fill this in and submit for review." },
    pending: { cls: "bg-[#fdf0e0] text-tangerine", text: "In review — our team is reviewing your submission. We'll email you when it's live." },
    published: { cls: "bg-fern-soft text-fern-deep", text: "Live on the site." },
  };
  const s = map[status] ?? map.draft;
  return (
    <div className={`mt-4 flex flex-wrap items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold ${s.cls}`}>
      <span>{s.text}</span>
      {published && (
        <a href={`/artists/${slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-4">
          View your live page
          <ExternalIcon size={14} aria-hidden />
        </a>
      )}
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)]">
      <h2 className="font-display text-lg font-extrabold">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-ink-soft">{hint}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
