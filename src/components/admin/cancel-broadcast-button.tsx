"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelScheduledBroadcast } from "@/lib/broadcast-actions";

/** Cancel a scheduled (not-yet-sent) broadcast. */
export function CancelBroadcastButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await cancelScheduledBroadcast(id);
          router.refresh();
        })
      }
      className="shrink-0 rounded-full border-2 border-ink/15 px-3 py-1 text-xs font-bold text-ink-soft transition-colors hover:border-poppy hover:text-poppy-deep disabled:opacity-50"
    >
      {pending ? "…" : "Cancel"}
    </button>
  );
}
