"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteDraft } from "@/lib/broadcast-actions";

/** Delete an email draft. */
export function DeleteDraftButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deleteDraft(id);
          router.refresh();
        })
      }
      className="text-xs font-semibold text-ink-soft underline-offset-2 transition-colors hover:text-poppy-deep hover:underline disabled:opacity-50"
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
