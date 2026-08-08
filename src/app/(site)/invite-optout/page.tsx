import type { Metadata } from "next";
import { findProspectByInviteToken } from "@/lib/prospect-optout";
import { confirmInviteOptOut } from "@/lib/prospect-optout-actions";
import { Flower } from "@/components/brand";
import { Button, ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "No thanks", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function InviteOptOutPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string }>;
}) {
  const { token, done } = await searchParams;
  const prospect = await findProspectByInviteToken(token ?? "");
  // GET never mutates — only the confirm action (POST) does.
  const alreadyDone = done === "1";
  const canOptOut = !!prospect && !alreadyDone;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-5 py-24 text-center">
      <Flower size={56} color="var(--color-fuchsia)" />
      <h1 className="mt-8 text-4xl font-extrabold">
        {alreadyDone ? "You're all set." : canOptOut ? "No thanks?" : "You're all set."}
      </h1>
      <p className="mt-4 text-lg text-ink-soft">
        {alreadyDone
          ? "We won't reach out about the Athens Holiday Market again. Thanks for letting us know — and happy holidays!"
          : canOptOut
            ? "No problem at all — we won't invite you to the Athens Holiday Market again. Confirm below."
            : "This link is no longer active. No further emails will be sent to you."}
      </p>
      <div className="mt-8">
        {canOptOut ? (
          <form action={confirmInviteOptOut}>
            <input type="hidden" name="token" value={token} />
            <Button type="submit" variant="danger" size="lg">
              Please don&rsquo;t contact me
            </Button>
          </form>
        ) : (
          <ButtonLink href="/" variant="ink" size="lg">
            Back to the market
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
