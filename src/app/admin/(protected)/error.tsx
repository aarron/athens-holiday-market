"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[admin] render error:", error);
  }, [error]);

  return (
    <div className="rounded-xl bg-white p-10 text-center shadow-[var(--shadow-card)]">
      <h1 className="text-2xl font-extrabold">This screen hit an error.</h1>
      <p className="mt-2 text-ink-soft">
        Something failed while loading. Retry, or reload the page.
        {error.digest && <span className="mt-1 block font-mono text-xs text-ink-soft/60">ref: {error.digest}</span>}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button variant="ink" onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
