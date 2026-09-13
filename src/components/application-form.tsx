"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { upload } from "@vercel/blob/client";
import { Button } from "@/components/ui/button";
import { Flower } from "@/components/brand";
import { ProofreadField } from "@/components/proofread-field";
import { CelebrateIcon } from "@/components/icons";
import { site } from "@/lib/site";
import { MEDIUM_CATEGORIES } from "@/lib/mediums";

const schema = z.object({
  name: z.string().min(1, "Your name is required."),
  businessName: z.string().optional(),
  email: z.string().min(1, "Email is required.").email("Enter a valid email."),
  phone: z.string().min(3, "A mobile number is required."),
  website: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  tiktok: z.string().optional(),
  medium: z.string().min(1, "Tell us the medium of your work."),
  mediumCategory: z.string().min(1, "Please choose a category."),
  description: z.string().min(1, "Please describe your work."),
  bio: z.string().optional(),
  shareBooth: z.enum(["yes", "no"]),
  shareBoothWith: z.string().optional(),
  smsConsent: z.boolean().optional(),
});
type Values = z.infer<typeof schema>;

const field =
  "w-full rounded-lg border-2 border-ink/15 bg-white px-4 py-3 text-base text-ink outline-none transition-colors focus:border-fern-deep placeholder:text-ink-soft/60";
const label = "block font-display text-sm font-bold text-ink";
const errCls = "mt-1 text-sm font-medium text-poppy-deep";

export type ApplicationFormPayload = {
  name: string;
  businessName?: string;
  email: string;
  phone: string;
  website?: string;
  medium: string;
  mediumCategory: string;
  description: string;
  bio?: string;
  shareBooth: boolean;
  shareBoothWith?: string;
  smsConsent?: boolean;
  socials: { instagram?: string; facebook?: string; tiktok?: string };
  photoUrls: string[];
};

export function ApplicationForm({
  mode = "apply",
  initialValues,
  uploadEndpoint = "/api/apply/upload",
  onSubmit: onSubmitProp,
}: {
  mode?: "apply" | "finish";
  initialValues?: Partial<Values>;
  uploadEndpoint?: string;
  /** When provided, replaces the default POST /api/apply (e.g. the completion
   *  server action). Return `{ ok }` on success or `{ error }` to show a message.
   *  `published: true` means the page went live immediately (staff auto-approve). */
  onSubmit?: (
    payload: ApplicationFormPayload,
  ) => Promise<{ ok?: boolean; error?: string; published?: boolean }>;
} = {}) {
  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { shareBooth: "no", ...initialValues },
  });

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const [publishedLive, setPublishedLive] = useState(false);

  const shareBooth = watch("shareBooth");
  const min = site.applications.minPhotos;
  const max = site.applications.maxPhotos;
  const maxBytes = site.applications.maxPhotoMb * 1024 * 1024;

  const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic"];

  /**
   * Add photos to the current selection (merging, not replacing — people add
   * their 3–6 photos one at a time). Dedupes re-picks of the same file,
   * validates type (drag & drop bypasses the input's `accept`) and size, and
   * caps the total at `max`.
   */
  function addFiles(incoming: File[]) {
    setPhotoError("");
    if (!incoming.length) return;
    const badType = incoming.find((f) => f.type && !ACCEPTED.includes(f.type));
    if (badType) {
      setPhotoError(`"${badType.name}" isn't a supported image. Please use JPG, PNG, or WEBP.`);
      return;
    }
    const tooBig = incoming.find((f) => f.size > maxBytes);
    if (tooBig) {
      setPhotoError(`Each photo must be under ${site.applications.maxPhotoMb}MB.`);
      return;
    }
    const seen = new Set(photos.map((f) => `${f.name}|${f.size}|${f.lastModified}`));
    const fresh = incoming.filter((f) => !seen.has(`${f.name}|${f.size}|${f.lastModified}`));
    const merged = [...photos, ...fresh];
    if (merged.length > max) {
      setPhotoError(`You can add up to ${max} photos — you've selected ${merged.length}. Remove some to continue.`);
      return;
    }
    setPhotos(merged);
  }

  function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []));
    // Reset so picking the same file again (after removing it) still fires onChange.
    e.target.value = "";
  }

  function removePhoto(idx: number) {
    setPhotoError("");
    setPhotos((p) => p.filter((_, i) => i !== idx));
  }

  // Real drag & drop. Without these, the browser's default drop takes over —
  // Safari refuses it ("action not permitted") and other browsers navigate away.
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!dragging) setDragging(true);
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files ?? []));
  }

  async function onSubmit(values: Values) {
    setServerError("");
    if (photos.length < min) {
      setPhotoError(`Please add at least ${min} photos of your work (up to ${max}).`);
      return;
    }
    setStatus("submitting");
    try {
      // 1) Upload photos straight to Blob (bypasses the serverless body limit).
      const photoUrls: string[] = [];
      for (const file of photos) {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: uploadEndpoint,
        });
        photoUrls.push(blob.url);
      }
      // 2) Submit the application with the photo URLs.
      const { instagram, facebook, tiktok, ...rest } = values;
      const payload: ApplicationFormPayload = {
        ...rest,
        shareBooth: values.shareBooth === "yes",
        socials: { instagram, facebook, tiktok },
        photoUrls,
      };
      if (onSubmitProp) {
        const r = await onSubmitProp(payload);
        if (r?.error) {
          setServerError(r.error);
          setStatus("error");
          return;
        }
        if (r?.published) setPublishedLive(true);
      } else {
        const res = await fetch("/api/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setServerError(data.error ?? "Something went wrong. Please try again.");
          setStatus("error");
          return;
        }
      }
      setStatus("done");
    } catch {
      setServerError("Upload failed. Please check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div role="status" className="rounded-xl bg-fern-soft p-8 text-center shadow-[var(--shadow-card)]">
        <Flower size={56} color="var(--color-fuchsia)" spin className="mx-auto" />
        <h2 className="mt-5 flex items-center justify-center gap-2.5 text-3xl font-extrabold">
          <CelebrateIcon size={30} className="text-fuchsia-deep" aria-hidden />
          {mode === "finish"
            ? publishedLive
              ? "Your page is live!"
              : "Profile submitted!"
            : "Application received!"}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-lg text-ink-soft">
          {mode === "finish" ? (
            publishedLive ? (
              <>
                Your artist page for the {site.event.year} {site.name} is now published. You can edit
                it anytime — changes you make will go live right away.
              </>
            ) : (
              <>
                Thanks! We have everything we need to build your artist page for the {site.event.year}{" "}
                {site.name}. An organizer will review it and get it live shortly — you&apos;ll get an
                email when it&apos;s published.
              </>
            )
          ) : (
            <>
              Thank you for applying to the {site.event.year} {site.name}. We&apos;ve emailed you a
              confirmation, and the jury will be in touch on {site.applications.decisionLabel}.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-7" noValidate>
      <div>
        <label className={label} htmlFor="name">
          Your name <span className="text-poppy-deep">*</span>
        </label>
        <input id="name" autoComplete="name" aria-required="true" aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} className={`mt-1.5 ${field}`} {...register("name")} />
        {errors.name && <p id="name-error" role="alert" className={errCls}>{errors.name.message}</p>}
      </div>

      <div>
        <label className={label} htmlFor="businessName">
          Business or booth name
        </label>
        <p className="mt-0.5 text-sm text-ink-soft">
          The name you sell under, if different from your own. (Optional)
        </p>
        <input
          id="businessName"
          autoComplete="organization"
          className={`mt-1.5 ${field}`}
          {...register("businessName")}
        />
      </div>

      <div className="grid gap-7 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="email">
            Email address <span className="text-poppy-deep">*</span>
          </label>
          <input id="email" type="email" autoComplete="email" inputMode="email" aria-required="true" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} className={`mt-1.5 ${field}`} {...register("email")} />
          {errors.email && <p id="email-error" role="alert" className={errCls}>{errors.email.message}</p>}
        </div>
        <div>
          <label className={label} htmlFor="phone">
            Mobile number <span className="text-poppy-deep">*</span>
          </label>
          <input id="phone" type="tel" autoComplete="tel" inputMode="tel" aria-required="true" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-error" : undefined} className={`mt-1.5 ${field}`} {...register("phone")} />
          {errors.phone && <p id="phone-error" role="alert" className={errCls}>{errors.phone.message}</p>}
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-lg bg-cream-soft p-4">
        <input
          type="checkbox"
          {...register("smsConsent")}
          className="mt-0.5 h-4 w-4 shrink-0 accent-fern-deep"
        />
        <span className="text-sm text-ink-soft">
          <span className="font-semibold text-ink">Text me event-day updates</span> about the market —
          load-in times, schedule, and weather. Msg &amp; data rates may apply; reply STOP to opt out.{" "}
          <span className="text-ink-soft/70">(Optional)</span>
        </span>
      </label>

      <div>
        <label className={label} htmlFor="website">
          Website showing your work
        </label>
        <input
          id="website"
          placeholder="https://"
          className={`mt-1.5 ${field}`}
          {...register("website")}
        />
      </div>

      <fieldset>
        <legend className={label}>Social channels</legend>
        <p className="mt-0.5 text-sm text-ink-soft">
          Optional, but they help the jury get to know your work.
        </p>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          <input aria-label="Instagram" placeholder="Instagram" className={field} {...register("instagram")} />
          <input aria-label="Facebook" placeholder="Facebook" className={field} {...register("facebook")} />
          <input aria-label="TikTok" placeholder="TikTok" className={field} {...register("tiktok")} />
        </div>
      </fieldset>

      <div className="grid gap-7 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="mediumCategory">
            Category <span className="text-poppy-deep">*</span>
          </label>
          <select
            id="mediumCategory"
            defaultValue=""
            aria-required="true"
            aria-invalid={!!errors.mediumCategory}
            aria-describedby={errors.mediumCategory ? "mediumCategory-error" : undefined}
            className={`mt-1.5 ${field}`}
            {...register("mediumCategory")}
          >
            <option value="" disabled>
              Choose a category…
            </option>
            {MEDIUM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.mediumCategory && <p id="mediumCategory-error" role="alert" className={errCls}>{errors.mediumCategory.message}</p>}
        </div>
        <div>
          <label className={label} htmlFor="medium">
            Medium of your work <span className="text-poppy-deep">*</span>
          </label>
          <input
            id="medium"
            placeholder="e.g. hand-thrown stoneware"
            aria-required="true"
            aria-invalid={!!errors.medium}
            aria-describedby={errors.medium ? "medium-error" : undefined}
            className={`mt-1.5 ${field}`}
            {...register("medium")}
          />
          {errors.medium && <p id="medium-error" role="alert" className={errCls}>{errors.medium.message}</p>}
        </div>
      </div>

      <div>
        <label className={label} htmlFor="description">
          Artist statement <span className="text-poppy-deep">*</span>
        </label>
        <p className="mt-0.5 text-sm text-ink-soft">
          Describe your work and what makes it special. This becomes the main text on your artist
          page if you&apos;re accepted, so it&apos;s worth a few thoughtful sentences.
        </p>
        <Controller
          name="description"
          control={control}
          render={({ field: f }) => (
            <ProofreadField
              id="description"
              value={f.value ?? ""}
              onChange={f.onChange}
              rows={5}
              placeholder="I make…"
              required
              invalid={!!errors.description}
              describedBy={errors.description ? "description-error" : undefined}
              textareaClassName={`mt-1.5 ${field} resize-y`}
            />
          )}
        />
        {errors.description && <p id="description-error" role="alert" className={errCls}>{errors.description.message}</p>}
      </div>

      <div>
        <label className={label} htmlFor="bio">
          Artist bio
        </label>
        <p className="mt-0.5 text-sm text-ink-soft">
          A short introduction to you — where you&apos;re based, how you got started, what you love
          about making. Also shown on your artist page. (Optional, but a nice touch.)
        </p>
        <Controller
          name="bio"
          control={control}
          render={({ field: f }) => (
            <ProofreadField
              id="bio"
              value={f.value ?? ""}
              onChange={f.onChange}
              rows={4}
              placeholder="I'm a maker based in Athens…"
              textareaClassName={`mt-1.5 ${field} resize-y`}
            />
          )}
        />
      </div>

      <div>
        <span className={label}>
          {min}–{max} photos of your work <span className="text-poppy-deep">*</span>
        </span>
        <p id="photos-help" className="mt-0.5 text-sm text-ink-soft">
          {min} to {max} images, each under {site.applications.maxPhotoMb}MB (JPG, PNG, or WEBP).
        </p>
        {/* The <input> is visually hidden but stays keyboard-focusable (sr-only,
            not display:none), and the dropzone shows a focus ring via focus-within. */}
        <label
          onDragEnter={onDragOver}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors hover:border-fern-deep focus-within:border-fern-deep focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-berry ${
            dragging ? "border-fern-deep bg-fern-soft" : "border-ink/25 bg-white"
          }`}
        >
          <Flower size={28} color="var(--color-fern-deep)" />
          <span className="mt-2 font-display font-semibold">
            {photos.length
              ? `${photos.length} photo${photos.length > 1 ? "s" : ""} selected — add more`
              : "Choose photos"}
          </span>
          <span className="text-sm text-ink-soft">or drag &amp; drop</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple
            className="sr-only"
            aria-label={`Upload ${min} to ${max} photos of your work`}
            aria-describedby={`photos-help${photoError ? " photos-error" : ""}`}
            onChange={onPickPhotos}
          />
        </label>
        {photos.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {photos.map((f, i) => (
              <li
                key={`${f.name}|${f.size}|${f.lastModified}`}
                className="flex items-center gap-1.5 rounded-full bg-cream py-1 pl-3 pr-1.5 text-sm"
              >
                <span className="max-w-[14rem] truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label={`Remove ${f.name}`}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-ink/10 hover:text-ink"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        {photoError && <p id="photos-error" role="alert" className={errCls}>{photoError}</p>}
      </div>

      <fieldset>
        <legend className={label}>
          Do you want to share a booth with another artist? <span className="text-poppy-deep">*</span>
        </legend>
        <div className="mt-2 flex gap-6">
          {(["no", "yes"] as const).map((v) => (
            <label key={v} className="flex cursor-pointer items-center gap-2">
              <input type="radio" value={v} className="h-4 w-4 accent-fern-deep" {...register("shareBooth")} />
              <span className="capitalize">{v}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {shareBooth === "yes" && (
        <div>
          <label className={label} htmlFor="shareBoothWith">
            If yes, with whom?
          </label>
          <input id="shareBoothWith" className={`mt-1.5 ${field}`} {...register("shareBoothWith")} />
        </div>
      )}

      {serverError && (
        <p role="alert" className="rounded-lg bg-poppy/10 px-4 py-3 text-sm font-medium text-poppy-deep">{serverError}</p>
      )}

      <Button type="submit" size="lg" disabled={status === "submitting"} className="w-full sm:w-auto">
        {status === "submitting"
          ? "Submitting…"
          : mode === "finish"
            ? "Submit my profile"
            : "Submit application"}
      </Button>
    </form>
  );
}
