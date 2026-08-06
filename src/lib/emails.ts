import { resend, EMAIL_FROM } from "@/lib/resend";
import { site } from "@/lib/site";

const wrap = (inner: string) => `
  <div style="background:#faf5ea;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#17161b">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ece5d6">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        <tr>
          <td height="6" style="height:6px;background:#6cae43"></td>
          <td height="6" style="height:6px;background:#f07f22"></td>
          <td height="6" style="height:6px;background:#17a898"></td>
          <td height="6" style="height:6px;background:#b7c72c"></td>
          <td height="6" style="height:6px;background:#45bced"></td>
          <td height="6" style="height:6px;background:#9c1c50"></td>
          <td height="6" style="height:6px;background:#d21c96"></td>
        </tr>
      </table>
      <div style="text-align:center;padding:30px 28px 10px">
        <img src="${site.url}/brand/logo.png" alt="Athens Holiday Market" width="180"
             style="width:180px;max-width:62%;height:auto;display:inline-block" />
      </div>
      <div style="padding:8px 34px 6px">${inner}</div>
      <div style="padding:22px 34px 28px;border-top:1px solid #f1ebdc;color:#8a857f;font-size:12px;line-height:1.7">
        <strong style="color:#57524d">${site.name}</strong> · ${site.location.name}<br/>
        ${site.location.street} · ${site.location.city}, ${site.location.state}<br/>
        Questions? <a href="mailto:${site.contactEmail}" style="color:#17a898;text-decoration:none">${site.contactEmail}</a>
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

export const CONTACT_TO = "redacted@example.com";

/** Forward a contact-form message to the organizer inbox. */
export async function sendContactEmail(name: string, email: string, message: string) {
  if (!resend) {
    console.warn("[emails] RESEND not configured; contact message not forwarded");
    return { skipped: true as const };
  }
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px">New message from the website</h1>
    <p style="margin:0 0 6px"><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p style="margin:0 0 14px"><strong>Email:</strong> ${escapeHtml(email)}</p>
    <div style="border-top:1px solid #e6e0d2;padding-top:14px;white-space:pre-wrap;line-height:1.6">${escapeHtml(message)}</div>`;
  try {
    return await resend.emails.send({
      from: EMAIL_FROM,
      to: CONTACT_TO,
      replyTo: email,
      subject: `Contact form: ${name}`,
      html: wrap(inner),
    });
  } catch (e) {
    console.error("[emails] failed to forward contact message:", e);
    return { error: true as const };
  }
}

/** Send a one-time magic sign-in link. */
export async function sendMagicLink(to: string, url: string) {
  // Always log in dev so links are testable without a verified sending domain.
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n🔗 Magic link for ${to}:\n${url}\n`);
  }
  if (!resend) return { skipped: true as const };
  const inner = `
    <h1 style="margin:0 0 12px;font-size:24px">Sign in to ${site.name}</h1>
    <p style="margin:0 0 16px;line-height:1.6">Click the button below to sign in. This link works once and expires in 30 minutes.</p>
    <p style="margin:0 0 20px"><a href="${url}" style="display:inline-block;background:#17161b;color:#faf5ea;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700">Sign in</a></p>
    <p style="margin:0;font-size:13px;color:#6b6b6b;line-height:1.6;word-break:break-all">Or paste this link into your browser:<br/>${url}</p>`;
  try {
    return await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Your sign-in link for ${site.name}`,
      html: wrap(inner),
    });
  } catch (e) {
    console.error("[emails] failed to send magic link:", e);
    return { error: true as const };
  }
}

type Decision = "accepted" | "waitlisted" | "rejected";

const DECISION_COPY: Record<Decision, { subject: string; heading: string; body: string }> = {
  accepted: {
    subject: `You're in! ${site.name} ${site.event.year}`,
    heading: "Congratulations — you're in! 🎉",
    body: `We're delighted to welcome you to the ${site.event.year} ${site.name}. We'll follow up soon with booth details, your booth fee, and setup and logistics for the market on ${site.event.days[0].label} and ${site.event.days[1].label}. Please keep an eye on your inbox.`,
  },
  waitlisted: {
    subject: `${site.name} ${site.event.year} — waitlist`,
    heading: "You're on the waitlist",
    body: `Thank you for applying to the ${site.event.year} ${site.name}. Your work impressed the jury, and we've placed you on our waitlist. Spots do open up — if one becomes available, we'll reach out right away.`,
  },
  rejected: {
    subject: `${site.name} ${site.event.year} — application update`,
    heading: "Thank you for applying",
    body: `Thank you for applying to the ${site.event.year} ${site.name}. We received many wonderful applications this year and, after careful review, we weren't able to offer you a booth this time. We'd genuinely love for you to apply again next year.`,
  },
};

/** Send an applicant their decision. Best-effort. */
export async function sendDecisionEmail(to: string, name: string, decision: Decision) {
  if (!resend) {
    console.warn("[emails] RESEND not configured; skipping decision email");
    return { skipped: true as const };
  }
  const c = DECISION_COPY[decision];
  const inner = `
    <h1 style="margin:0 0 12px;font-size:24px">${c.heading}</h1>
    <p style="margin:0 0 14px;line-height:1.6">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 14px;line-height:1.6">${c.body}</p>
    <p style="margin:0;line-height:1.6">Warmly,<br/>The ${site.name} team</p>`;
  try {
    const res = await resend.emails.send({ from: EMAIL_FROM, to, subject: c.subject, html: wrap(inner) });
    return res;
  } catch (e) {
    console.error("[emails] failed to send decision email:", e);
    return { error: true as const };
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
