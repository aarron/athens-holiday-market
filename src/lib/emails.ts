import { resend, EMAIL_FROM } from "@/lib/resend";
import { site } from "@/lib/site";

const wrap = (inner: string) => `
  <div style="background:#faf5ea;padding:32px 0;font-family:Helvetica,Arial,sans-serif;color:#17161b">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden">
      <div style="background:#3f7d22;padding:22px 28px">
        <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.02em">
          Athens <span style="color:#c6d42f">Holiday</span> Market
        </div>
      </div>
      <div style="padding:28px">${inner}</div>
      <div style="padding:18px 28px;border-top:1px solid #eee;color:#7a7580;font-size:12px">
        ${site.name} · ${site.location.name}, ${site.location.city}, ${site.location.state}<br/>
        Questions? <a href="mailto:${site.contactEmail}" style="color:#3f7d22">${site.contactEmail}</a>
      </div>
    </div>
  </div>`;

/** Confirmation that an artist's application was received. Best-effort. */
export async function sendApplicationReceived(to: string, name: string) {
  if (!resend) {
    console.warn("[emails] RESEND not configured; skipping application-received email");
    return { skipped: true };
  }
  const inner = `
    <h1 style="margin:0 0 12px;font-size:24px">Thanks, ${escapeHtml(name)}! 🎉</h1>
    <p style="margin:0 0 14px;line-height:1.6">
      We've received your application for the ${site.event.year} ${site.name}. Every application is
      reviewed by our jury, and we'll email you with a decision on ${site.applications.decisionLabel}.
    </p>
    <p style="margin:0 0 14px;line-height:1.6">
      In the meantime, keep an eye on your inbox — and thank you for making beautiful things.
    </p>
    <p style="margin:0;line-height:1.6">Warmly,<br/>The ${site.name} team</p>`;
  try {
    const res = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `We received your ${site.name} application`,
      html: wrap(inner),
    });
    return res;
  } catch (e) {
    console.error("[emails] failed to send application-received:", e);
    return { error: true };
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
