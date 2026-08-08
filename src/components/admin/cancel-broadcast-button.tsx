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
      className="text-xs font-semibold text-ink-soft underline-offset-2 transition-colors hover:text-poppy-deep hover:underline disabled:opacity-50"
    >
      {pending ? "…" : "Cancel"}
    </button>
  );
}
