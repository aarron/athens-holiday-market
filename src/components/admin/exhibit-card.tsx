"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startExhibiting } from "@/lib/exhibit-actions";
import { Button } from "@/components/ui/button";
import { SparkleIcon, ArrowRightIcon } from "@/components/icons";

/**
 * Self-serve entry for staff (usually a judge) who also exhibits: creates their
 * artist record and drops them into the completion form. Once they have a page,
 * it links straight to the portal instead.
 */
export function ExhibitCard({ hasPage }: { hasPage: boolean }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  function setup() {
    setErr("");
    start(async () => {
      const r = await startExhibiting();
      if (r && "ok" in r && r.ok) router.push("/artist/finish");
      else setErr(r?.error ?? "Couldn't start. Try again.");
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-fuchsia/20 bg-fuchsia-soft/50 px-5 py-4">
      <div className="flex items-center gap-3">
        <SparkleIcon size={22} className="text-fuchsia-deep" aria-hidden />
        <div>
          <p className="font-display font-bold">
            {hasPage ? "You're exhibiting this year" : "Are you exhibiting this year too?"}
          </p>
          <p className="text-sm text-ink-soft">
            {hasPage
              ? "Manage your own public artist page."
              : "Set up your own artist page — separate from judging."}
          </p>
          {err && <p className="mt-1 text-sm font-medium text-poppy-deep">{err}</p>}
        </div>
      </div>
      {hasPage ? (
        <Link
          href="/artist"
          className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-fuchsia-deep hover:text-fuchsia"
        >
          Manage my page
          <ArrowRightIcon size={16} aria-hidden />
        </Link>
      ) : (
        <Button variant="create" size="sm" loading={pending} loadingLabel="Setting up…" onClick={setup}>
          Set up my artist page
        </Button>
      )}
    </div>
  );
}
