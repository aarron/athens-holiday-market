"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { upload } from "@vercel/blob/client";
import { Button } from "@/components/ui/button";
import { Flower } from "@/components/brand";
import { CelebrateIcon } from "@/components/icons";
import { site } from "@/lib/site";
import { MEDIUM_CATEGORIES } from "@/lib/mediums";

const schema = z.object({
  name: z.string().min(1, "Your name is required."),
  email: z.string().min(1, "Email is required.").email("Enter a valid email."),
  phone: z.string().min(3, "A cell number is required."),
  website: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  tiktok: z.string().optional(),
  medium: z.string().min(1, "Tell us the medium of your work."),
  mediumCategory: z.string().min(1, "Please choose a category."),
  description: z.string().min(1, "Please describe your work."),
  shareBooth: z.enum(["yes", "no"]),
  shareBoothWith: z.string().optional(),
});
type Values = z.infer<typeof schema>;

const field =
  "w-full rounded-md border-2 border-ink/15 bg-white px-4 py-3 text-base text-ink outline-none transition-colors focus:border-fern-deep placeholder:text-ink-soft/50";
const label = "block font-display text-sm font-bold text-ink";
const errCls = "mt-1 text-sm font-medium text-poppy";

export function ApplicationForm() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { shareBooth: "no" } });

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [serverError, setServerError] = useState("");

  const shareBooth = watch("shareBooth");
  const max = site.applications.maxPhotos;
  const maxBytes = site.applications.maxPhotoMb * 1024 * 1024;

  function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError("");
    const files = Array.from(e.target.files ?? []);
    if (files.length > max) {
      setPhotoError(`Please choose up to ${max} photos.`);
      return;
    }
    const tooBig = files.find((f) => f.size > maxBytes);
    if (tooBig) {
      setPhotoError(`Each photo must be under ${site.applications.maxPhotoMb}MB.`);
      return;
    }
    setPhotos(files);
  }

  async function onSubmit(values: Values) {
    setServerError("");
    if (photos.length < 1) {
      setPhotoError(`Please add ${max} photos of your work.`);
      return;
    }
    setStatus("submitting");
    try {
      // 1) Upload photos straight to Blob (bypasses the serverless body limit).
      const photoUrls: string[] = [];
      for (const file of photos) {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/apply/upload",
        });
        photoUrls.push(blob.url);
      }
      // 2) Submit the application with the photo URLs.
      const { instagram, facebook, tiktok, ...rest } = values;
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rest,
          shareBooth: values.shareBooth === "yes",
          socials: { instagram, facebook, tiktok },
          photoUrls,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setServerError(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setServerError("Upload failed. Please check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-xl bg-fern-soft p-8 text-center shadow-[var(--shadow-card)]">
        <Flower size={56} color="var(--color-fuchsia)" spin className="mx-auto" />
        <h2 className="mt-5 flex items-center justify-center gap-2.5 text-3xl font-extrabold">
          <CelebrateIcon size={30} className="text-fuchsia" aria-hidden />
          Application received!
        </h2>
        <p className="mx-auto mt-3 max-w-md text-lg text-ink-soft">
          Thank you for applying to the {site.event.year} {site.name}. We&apos;ve emailed you a
          confirmation, and the jury will be in touch on {site.applications.decisionLabel}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-7" noValidate>
      <div>
        <label className={label} htmlFor="name">
          Your name <span className="text-poppy">*</span>
        </label>
        <input id="name" className={`mt-1.5 ${field}`} {...register("name")} />
        {errors.name && <p className={errCls}>{errors.name.message}</p>}
      </div>

      <div className="grid gap-7 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="email">
            Email address <span className="text-poppy">*</span>
          </label>
          <input id="email" type="email" className={`mt-1.5 ${field}`} {...register("email")} />
          {errors.email && <p className={errCls}>{errors.email.message}</p>}
        </div>
        <div>
          <label className={label} htmlFor="phone">
            Cell number <span className="text-poppy">*</span>
          </label>
          <input id="phone" type="tel" className={`mt-1.5 ${field}`} {...register("phone")} />
          {errors.phone && <p className={errCls}>{errors.phone.message}</p>}
        </div>
      </div>

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
          <input placeholder="Instagram" className={field} {...register("instagram")} />
          <input placeholder="Facebook" className={field} {...register("facebook")} />
          <input placeholder="TikTok" className={field} {...register("tiktok")} />
        </div>
      </fieldset>

      <div className="grid gap-7 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="mediumCategory">
            Category <span className="text-poppy">*</span>
          </label>
          <select
            id="mediumCategory"
            defaultValue=""
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
          {errors.mediumCategory && <p className={errCls}>{errors.mediumCategory.message}</p>}
        </div>
        <div>
          <label className={label} htmlFor="medium">
            Medium of your work <span className="text-poppy">*</span>
          </label>
          <input
            id="medium"
            placeholder="e.g. hand-thrown stoneware"
            className={`mt-1.5 ${field}`}
            {...register("medium")}
          />
          {errors.medium && <p className={errCls}>{errors.medium.message}</p>}
        </div>
      </div>

      <div>
        <label className={label} htmlFor="description">
          Describe your work <span className="text-poppy">*</span>
        </label>
        <textarea
          id="description"
          rows={5}
          className={`mt-1.5 ${field} resize-y`}
          {...register("description")}
        />
        {errors.description && <p className={errCls}>{errors.description.message}</p>}
      </div>

      <div>
        <span className={label}>
          {max} photos of your work <span className="text-poppy">*</span>
        </span>
        <p className="mt-0.5 text-sm text-ink-soft">
          Up to {max} images, each under {site.applications.maxPhotoMb}MB (JPG, PNG, or WEBP).
        </p>
        <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-ink/25 bg-white px-4 py-8 text-center transition-colors hover:border-fern-deep">
          <Flower size={28} color="var(--color-fern-deep)" />
          <span className="mt-2 font-display font-semibold">
            {photos.length ? `${photos.length} photo${photos.length > 1 ? "s" : ""} selected` : "Choose photos"}
          </span>
          <span className="text-sm text-ink-soft">or drag & drop</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple
            className="hidden"
            onChange={onPickPhotos}
          />
        </label>
        {photos.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {photos.map((f) => (
              <li key={f.name} className="rounded-full bg-cream px-3 py-1 text-sm">
                {f.name}
              </li>
            ))}
          </ul>
        )}
        {photoError && <p className={errCls}>{photoError}</p>}
      </div>

      <fieldset>
        <legend className={label}>
          Do you want to share a booth with another artist? <span className="text-poppy">*</span>
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
        <p className="rounded-md bg-poppy/10 px-4 py-3 text-sm font-medium text-poppy">{serverError}</p>
      )}

      <Button type="submit" size="lg" disabled={status === "submitting"} className="w-full sm:w-auto">
        {status === "submitting" ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
