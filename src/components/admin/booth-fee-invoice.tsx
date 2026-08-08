"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendBoothFeeInvoice, sendBoothFeeReminderNow } from "@/lib/paypal-actions";

/**
 * PayPal booth-fee invoice controls on the application detail page. Invoices are
 * normally auto-sent when the accepted decision goes out; this covers the manual
 * cases — invoicing a single artist and re-nudging a flaky one.
 */
export function BoothFeeInvoice({
  applicationId,
  status,
  paid,
  invoiceId,
  invoiceUrl,
  invoicedAt,
  configured,
}: {
  applicationId: number;
  status: string;
  paid: boolean;
  invoiceId: string | null;
  invoiceUrl: string | null;
  invoicedAt: string | null;
  configured: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");

  if (status !== "accepted") return null;

  function run(fn: () => Promise<{ ok?: boolean; already?: boolean; error?: string }>) {
    setMsg("");
    start(async () => {
      const r = await fn();
      if (r?.error) setMsg(r.error);
      else if (r?.already) setMsg("Already invoiced.");
      else {
        setMsg("Done ✓");
        router.refresh();
      }
    });
  }

  return (
    <div>
      <p className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">PayPal invoice</p>

      {!configured ? (
        <p className="mt-2 text-sm text-ink-soft/70">PayPal isn&apos;t configured yet — invoices are disabled.</p>
      ) : !invoiceId ? (
        <button
          disabled={pending}
          onClick={() => run(() => sendBoothFeeInvoice(applicationId))}
          className="mt-2 h-11 w-full rounded-lg border-2 border-fuchsia bg-fuchsia/5 font-display text-sm font-bold text-fuchsia-deep transition-colors hover:bg-fuchsia/10 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send PayPal invoice"}
        </button>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-ink-soft">
            {paid ? "Paid" : "Invoiced"}
            {invoicedAt && !paid && ` ${new Date(invoicedAt).toLocaleDateString()}`}
            {invoiceUrl && (
              <>
                {" · "}
                <a href={invoiceUrl} target="_blank" rel="noreferrer" className="font-semibold link">
                  View invoice
                </a>
              </>
            )}
          </p>
          {!paid && (
            <button
              disabled={pending}
              onClick={() => run(() => sendBoothFeeReminderNow(applicationId))}
              className="h-10 w-full rounded-lg border-2 border-ink/15 font-display text-sm font-bold text-ink transition-colors hover:bg-cream disabled:opacity-50"
            >
              {pending ? "Sending…" : "Send reminder now"}
            </button>
          )}
        </div>
      )}

      {msg && <p role="status" className="mt-2 text-sm font-medium text-ink-soft">{msg}</p>}
    </div>
  );
}
