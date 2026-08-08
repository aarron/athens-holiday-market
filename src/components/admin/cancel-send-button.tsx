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
      className={`text-xs font-semibold underline-offset-2 transition-colors hover:underline disabled:opacity-50 ${
        canceled ? "text-fern-deep" : "text-ink-soft hover:text-poppy-deep"
      }`}
    >
      {pending ? "…" : canceled ? "Restore" : "Cancel"}
    </button>
  );
}
