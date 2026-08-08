"use client";

import { useActionState } from "react";
import { requestMagicLink, type MagicState } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { MailboxIcon } from "@/components/icons";

export function MagicLinkForm() {
  const [state, action, pending] = useActionState<MagicState, FormData>(requestMagicLink, {});

  if (state.ok) {
    return (
      <div className="rounded-lg border-2 border-fern/40 bg-fern-soft p-6 text-center" role="status">
        <p className="flex items-center justify-center gap-2 font-display text-lg font-bold text-ink">
          <MailboxIcon size={22} className="text-fern-deep" aria-hidden />
          Check your email
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          If that address has access, we just sent a login link. It expires in 30 minutes.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <label className="sr-only" htmlFor="magic-email">
        Email address
      </label>
      <input
        id="magic-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@email.com"
        className="h-14 w-full rounded-lg border-2 border-ink/20 bg-white px-4 text-base outline-none focus:border-fern-deep"
      />
      <Button type="submit" size="lg" variant="ink" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Email me a login link"}
      </Button>
      {state.error && <p role="alert" className="text-sm font-medium text-poppy-deep">{state.error}</p>}
    </form>
  );
}
