import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSessionUser } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "artist" || !user.artistId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Please upload an image." }, { status: 415 });
  }
  if (file.size > MAX) {
    return NextResponse.json({ error: "Image must be under 10MB." }, { status: 413 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Uploads aren't configured yet." }, { status: 503 });
  }

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blob = await put(`artists/${user.artistId}/${safe}`, file, {
    access: "public",
    addRandomSuffix: true,
  });
  return NextResponse.json({ url: blob.url });
}
