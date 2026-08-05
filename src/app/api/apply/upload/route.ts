import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { applicationWindow } from "@/lib/applications";
import { site } from "@/lib/site";

export const runtime = "nodejs";

/**
 * Authorizes client-side photo uploads to Vercel Blob (avoids the 4.5MB
 * serverless body limit). Requires BLOB_READ_WRITE_TOKEN in the environment.
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (applicationWindow() !== "open") {
    return NextResponse.json({ error: "Applications are not open." }, { status: 403 });
  }

  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
        maximumSizeInBytes: site.applications.maxPhotoMb * 1024 * 1024,
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ scope: "application-photo" }),
      }),
      onUploadCompleted: async () => {
        /* no-op; the client sends the returned URLs with the application */
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
