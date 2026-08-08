import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { applicationWindow } from "@/lib/applications";
import { getSessionUser } from "@/lib/admin-auth";
import { acceptedApplicationIdForEmail } from "@/lib/magic";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { site } from "@/lib/site";

export const runtime = "nodejs";

/**
 * Authorizes client-side photo uploads to Vercel Blob (avoids the 4.5MB
 * serverless body limit). Requires BLOB_READ_WRITE_TOKEN in the environment.
 *
 * Allowed when the public window is open, OR for a signed-in invited artist
 * completing their profile after being added directly (window is closed then).
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (applicationWindow() !== "open") {
    const user = await getSessionUser();
    const invited = user ? await acceptedApplicationIdForEmail(user.email) : null;
    if (!invited) {
      return NextResponse.json({ error: "Applications are not open." }, { status: 403 });
    }
  }

  // Cap Blob upload-token issuance per IP so it can't be looped for storage abuse.
  const ip = clientIp(req.headers);
  if (!(await rateLimit("apply-upload", ip, 40, 10 * 60_000))) {
    return NextResponse.json({ error: "Too many uploads — please slow down." }, { status: 429 });
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
