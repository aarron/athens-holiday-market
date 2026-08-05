import { put } from "@vercel/blob";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB, matches the old form
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export type UploadResult = { url: string; pathname: string };

/**
 * Upload an artist photo to Vercel Blob under a namespaced path.
 * Validates type and size before writing.
 */
export async function uploadArtistPhoto(
  file: File,
  opts: { prefix: string },
): Promise<UploadResult> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File exceeds the 10MB limit.");
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blob = await put(`${opts.prefix}/${Date.now()}-${safeName}`, file, {
    access: "public",
    addRandomSuffix: true,
  });
  return { url: blob.url, pathname: blob.pathname };
}
