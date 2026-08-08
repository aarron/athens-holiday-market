import type { Metadata } from "next";
import { findSubscriberByToken } from "@/lib/unsubscribe";
import { confirmUnsubscribe } from "@/lib/unsubscribe-actions";
import { Flower } from "@/components/brand";
import { Button, ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; done?: string }>;
}) {
  const { token, done } = await searchParams;
  const sub = await findSubscriberByToken(token ?? "");
  // GET never mutates — only the confirm action (POST) does.
  const alreadyDone = done === "1" || sub?.status === "unsubscribed";
  const canUnsub = !!sub && !alreadyDone;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-5 py-24 text-center">
      <Flower size={56} color="var(--color-fuchsia)" />
      <h1 className="mt-8 text-4xl font-extrabold">
        {alreadyDone ? "You're unsubscribed." : canUnsub ? "Unsubscribe?" : "You're all set."}
      </h1>
      <p className="mt-4 text-lg text-ink-soft">
        {alreadyDone
          ? "You won't receive any more emails from the Athens Holiday Market. We're sorry to see you go — happy holidays!"
          : canUnsub
            ? `Stop sending market emails to ${sub!.email}? You can resubscribe any time from the site.`
            : "This link is no longer active, or you were already unsubscribed. No further emails will be sent."}
      </p>
      <div className="mt-8">
        {canUnsub ? (
          <form action={confirmUnsubscribe}>
            <input type="hidden" name="token" value={token} />
            <Button type="submit" variant="danger" size="lg">
              Yes, unsubscribe me
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
