"use client";

import { useRef, useState, useTransition } from "react";
import { submitArtistDraft } from "@/lib/artist-actions";
import { ProofreadField } from "@/components/proofread-field";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { ExternalIcon } from "@/components/icons";

type Initial = {
  name: string;
  medium: string;
  statement: string;
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
const TEXTAREA = "w-full rounded-lg border-2 border-ink/15 bg-white px-3 py-2 outline-none focus:border-fern-deep";

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
  const [statement, setStatement] = useState(initial.statement);
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

  function onSubmit() {
    setSaved(false);
    start(async () => {
      const res = await submitArtistDraft({ statement, bio, website, socials, logoUrl, photoUrls: photos });
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
        titleSize="lg"
        hint={`Up to ${MAX_PHOTOS}. Drag & drop or click to add. These appear on your public page.`}
        bodyClassName="space-y-3"
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
          className={`rounded-xl p-1 transition-colors ${dragging ? "bg-fern-soft ring-2 ring-fern-deep" : ""}`}
        >
          <div className="grid grid-cols-3 gap-3">
            {photos.map((url, i) => (
              <div key={url} className="group relative overflow-hidden rounded-lg bg-cream">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="aspect-square w-full object-cover" />
                <button
                  onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                  aria-label={`Remove photo ${i + 1}`}
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
        <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={(e) => onAddPhotos(e.target.files)} />
      </Card>

      {/* Logo */}
      <Card title="Logo" titleSize="lg" hint="Optional. A square logo works best." bodyClassName="space-y-3">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="Your logo" className="h-20 w-20 rounded-lg object-contain" />
              <button onClick={() => setLogoUrl(null)} className="text-sm font-semibold text-poppy-deep hover:underline">
                Remove
              </button>
            </>
          ) : (
            <Button variant="secondary" size="sm" disabled={uploading} onClick={() => logoInput.current?.click()}>
              Upload logo
            </Button>
          )}
        </div>
        <input ref={logoInput} type="file" accept="image/*" hidden onChange={(e) => onSetLogo(e.target.files)} />
      </Card>

      {uploadErr && <StatusMessage tone="error">{uploadErr}</StatusMessage>}

      {/* Artist statement — about the work */}
      <Card
        title="Artist statement"
        titleSize="lg"
        hint="About your work — what you make and what makes it special. This is the main text on your page. 40–120 words works well."
        bodyClassName="space-y-3"
      >
        <ProofreadField
          value={statement}
          onChange={setStatement}
          rows={6}
          placeholder="Example: I throw functional stoneware in small batches — mugs, bowls, and vases meant for everyday use. Each piece is wheel-thrown and glazed by hand, so no two are quite alike."
          textareaClassName={TEXTAREA}
        />
      </Card>

      {/* Artist bio — about the person */}
      <Card
        title="Artist bio"
        titleSize="lg"
        hint="About you — where you're based, how you started, what you love about making. (Optional, but a nice touch.)"
        bodyClassName="space-y-3"
      >
        <ProofreadField
          value={bio}
          onChange={setBio}
          rows={4}
          placeholder="Example: I'm a potter based in Athens. I fell for clay in a community studio ten years ago and haven't stopped since."
          textareaClassName={TEXTAREA}
        />
      </Card>

      {/* Links */}
      <Card title="Website & socials" titleSize="lg" hint="Optional links to your shop and channels." bodyClassName="space-y-3">
        <Field label="Website" htmlFor="ae-website">
          <Input id="ae-website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="yourwebsite.com" />
        </Field>
        {SOCIALS.map((s) => (
          <Field key={s.key} label={s.label} htmlFor={`ae-${s.key}`}>
            <Input
              id={`ae-${s.key}`}
              value={socials[s.key] ?? ""}
              onChange={(e) => setSocials((prev) => ({ ...prev, [s.key]: e.target.value }))}
              placeholder={`${s.label} URL`}
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
          <Button variant="create" disabled={pending || uploading} loading={pending} loadingLabel="Submitting…" onClick={onSubmit}>
            Submit for review
          </Button>
        </div>
        {saved && <p className="mt-2 text-sm font-semibold text-chartreuse">Submitted! We&apos;ll review it soon. ✓</p>}
      </div>
    </div>
  );
}

function StatusBanner({ status, slug, published }: { status: string; slug: string; published: boolean }) {
  const map: Record<string, { cls: string; text: string }> = {
    draft: { cls: "bg-sky-soft text-sky-deep", text: "Draft — not yet submitted. Fill this in and submit for review." },
    pending: { cls: "bg-tangerine-soft text-tangerine-deep", text: "In review — our team is reviewing your submission. We'll email you when it's live." },
    published: { cls: "bg-fern-soft text-fern-deep", text: "Live on the site." },
  };
  const s = map[status] ?? map.draft;
  return (
    <div className={`mt-4 flex flex-wrap items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold ${s.cls}`}>
      <span>{s.text}</span>
      {published && (
        <a href={`/artists/${slug}`} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1">
          View your live page
          <ExternalIcon size={14} aria-hidden />
        </a>
      )}
    </div>
  );
}
