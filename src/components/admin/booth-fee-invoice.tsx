"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendBoothFeeInvoice, sendBoothFeeReminderNow } from "@/lib/paypal-actions";

/** The PayPal wordmark rendered as brand-blue text (no trademarked logo art). */
function PayPalMark() {
  return (
    <span className="font-extrabold italic tracking-tight" aria-label="PayPal">
      <span style={{ color: "#003087" }}>Pay</span>
      <span style={{ color: "#009cde" }}>Pal</span>
    </span>
  );
}

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
      <p className="flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
        <PayPalMark /> <span>invoice</span>
      </p>

      {!configured ? (
        <p className="mt-2 text-sm text-ink-soft/70"><PayPalMark /> isn&apos;t configured yet — invoices are disabled.</p>
      ) : !invoiceId ? (
        <button
          disabled={pending}
          onClick={() => run(() => sendBoothFeeInvoice(applicationId))}
          className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border-2 border-[#0070ba]/40 bg-white font-display text-sm font-bold text-ink transition-colors hover:bg-[#0070ba]/5 disabled:opacity-50"
        >
          {pending ? "Sending…" : <>Send <PayPalMark /> invoice</>}
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
