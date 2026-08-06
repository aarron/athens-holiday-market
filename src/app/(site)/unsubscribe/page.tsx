import type { Metadata } from "next";
import { unsubscribeByToken } from "@/lib/unsubscribe";
import { Flower } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const found = await unsubscribeByToken(token ?? "");

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-5 py-24 text-center">
      <Flower size={56} color="var(--color-fuchsia)" />
      <h1 className="mt-8 text-4xl font-extrabold">
        {found ? "You're unsubscribed." : "You're all set."}
      </h1>
      <p className="mt-4 text-lg text-ink-soft">
        {found
          ? "You won't receive any more emails from the Athens Holiday Market. We're sorry to see you go — happy holidays!"
          : "This link is no longer active, or you were already unsubscribed. No further emails will be sent."}
      </p>
      <div className="mt-8">
        <ButtonLink href="/" variant="ink" size="lg">
          Back to the market
        </ButtonLink>
      </div>
    </div>
  );
}
