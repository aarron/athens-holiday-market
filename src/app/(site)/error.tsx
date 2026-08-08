"use client";

import { useEffect } from "react";
import { Flower } from "@/components/brand";
import { Button, ButtonLink } from "@/components/ui/button";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[site] render error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-5 py-24 text-center">
      <Flower size={56} color="var(--color-fuchsia)" />
      <h1 className="mt-8 text-4xl font-extrabold">Something went sideways.</h1>
      <p className="mt-4 text-lg text-ink-soft">
        A hiccup on our end — not you. Give it another try, or head back to the market.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="outline" size="lg">Back to the market</ButtonLink>
      </div>
    </div>
  );
}
