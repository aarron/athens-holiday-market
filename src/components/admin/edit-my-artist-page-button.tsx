"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { startExhibiting } from "@/lib/exhibit-actions";
import { Button } from "@/components/ui/button";

/**
 * Lets a staff member who is also exhibiting jump to their own artist page.
 * Ensures they have an exhibiting record (idempotent) before opening it. Lives
 * in the Artist pages section header, next to everyone else's pages.
 */
export function EditMyArtistPageButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  function editMyArtistPage() {
    start(async () => {
      const r = await startExhibiting();
      if (r && "ok" in r && r.ok) router.push("/artist");
    });
  }

  return (
    <Button variant="secondary" size="sm" loading={pending} onClick={editMyArtistPage}>
      {pending ? "Opening…" : "Edit my artist page"}
    </Button>
  );
}
