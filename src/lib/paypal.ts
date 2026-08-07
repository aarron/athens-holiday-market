import "server-only";
import { site } from "@/lib/site";

/**
 * Minimal PayPal Invoicing (v2) client for booth-fee billing. Credentials come
 * from the environment; when they're absent the module reports "not configured"
 * and callers no-op gracefully so the rest of the admin keeps working.
 *
 * Env: PAYPAL_ENV (sandbox|live), PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET,
 *      PAYPAL_WEBHOOK_ID.
 */
const ENV = process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
const BASE = ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET ?? "";
const WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID ?? "";

export function paypalConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET);
}

// Cache the OAuth token in-process until shortly before it expires.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

function splitName(full: string): { given_name: string; surname?: string } {
  const parts = (full || "").trim().split(/\s+/);
  const given_name = parts.shift() || "Artist";
  const surname = parts.join(" ") || undefined;
  return { given_name, surname };
}

export type InvoiceResult = { ok: true; id: string; url: string | null } | { ok: false; error: string };

/**
 * Create a booth-fee invoice and send it (PayPal emails the artist a Pay Now
 * link). Returns the invoice id and payer-view URL for reminders.
 */
export async function createBoothFeeInvoice(input: {
  name: string;
  email: string;
  amount: number;
  memo: string;
  itemLabel: string;
}): Promise<InvoiceResult> {
  if (!paypalConfigured()) return { ok: false, error: "PayPal is not configured." };
  try {
    const token = await getAccessToken();
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const value = input.amount.toFixed(2);

    // 1) Create the draft invoice (return=representation gives us the id back).
    const createRes = await fetch(`${BASE}/v2/invoicing/invoices`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({
        detail: {
          currency_code: "USD",
          note: input.memo,
          payment_term: { term_type: "DUE_ON_RECEIPT" },
        },
        // Brand the invoice explicitly so it reads as the market (name + logo),
        // not just the underlying PayPal account. Email is left to the account.
        // logo_url must be the www canonical: PayPal fetches it server-side and
        // does NOT follow the apex→www 308 redirect (that would break the logo).
        invoicer: {
          business_name: site.name,
          website: site.url,
          logo_url: `https://www.${site.url.replace(/^https?:\/\/(www\.)?/, "")}/brand/logo-pp.png`,
        },
        primary_recipients: [
          { billing_info: { name: splitName(input.name), email_address: input.email } },
        ],
        items: [
          {
            name: input.itemLabel,
            quantity: "1",
            unit_amount: { currency_code: "USD", value },
            unit_of_measure: "AMOUNT",
          },
        ],
      }),
    });
    if (!createRes.ok) {
      return { ok: false, error: `Couldn't create invoice (${createRes.status}).` };
    }
    const created = (await createRes.json()) as { id: string };
    const id = created.id;

    // 2) Send it — PayPal emails the recipient the invoice + Pay Now link.
    const sendRes = await fetch(`${BASE}/v2/invoicing/invoices/${id}/send`, {
      method: "POST",
      headers,
      body: JSON.stringify({ send_to_recipient: true }),
    });
    if (!sendRes.ok) {
      return { ok: false, error: `Invoice created but couldn't send (${sendRes.status}).` };
    }

    // 3) Fetch the payer-view URL for our own reminders / "view invoice" links.
    let url: string | null = null;
    try {
      const getRes = await fetch(`${BASE}/v2/invoicing/invoices/${id}`, { headers });
      if (getRes.ok) {
        const inv = (await getRes.json()) as { detail?: { metadata?: { recipient_view_url?: string } } };
        url = inv.detail?.metadata?.recipient_view_url ?? null;
      }
    } catch {
      /* non-fatal — reminders can still re-send by invoice id */
    }

    return { ok: true, id, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "PayPal request failed." };
  }
}

/** Verify an inbound webhook against the configured webhook id. */
export async function verifyWebhookSignature(
  headers: {
    transmissionId: string | null;
    transmissionTime: string | null;
    transmissionSig: string | null;
    certUrl: string | null;
    authAlgo: string | null;
  },
  eventBody: string,
): Promise<boolean> {
  if (!paypalConfigured() || !WEBHOOK_ID) return false;
  if (!headers.transmissionId || !headers.transmissionSig || !headers.certUrl) return false;
  try {
    const token = await getAccessToken();
    const res = await fetch(`${BASE}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        transmission_id: headers.transmissionId,
        transmission_time: headers.transmissionTime,
        transmission_sig: headers.transmissionSig,
        cert_url: headers.certUrl,
        auth_algo: headers.authAlgo,
        webhook_id: WEBHOOK_ID,
        webhook_event: JSON.parse(eventBody),
      }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { verification_status: string };
    return data.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}
