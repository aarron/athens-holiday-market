"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelSend, restoreSend } from "@/lib/scheduled-actions";
import type { SendStatus } from "@/lib/scheduled-sends";

/** Cancel (skip) or restore a scheduled automated send. Hidden once sent. */
export function CancelSendButton({ id, status }: { id: string; status: SendStatus }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  if (status === "sent") return null;

  const canceled = status === "canceled";
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await (canceled ? restoreSend(id) : cancelSend(id));
          router.refresh();
        })
      }
      className={`rounded-full border-2 px-3 py-1 text-xs font-bold transition-colors disabled:opacity-50 ${
        canceled
          ? "border-fern-deep/40 text-fern-deep hover:bg-fern-soft"
          : "border-ink/15 text-ink-soft hover:border-poppy hover:text-poppy-deep"
      }`}
    >
      {pending ? "…" : canceled ? "Restore" : "Cancel"}
    </button>
  );
}
