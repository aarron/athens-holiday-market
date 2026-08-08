import { resend, EMAIL_FROM } from "@/lib/resend-client";
import { site } from "@/lib/site";
import { emailShell as wrap } from "@/lib/email-shell";

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

/** Alert admins that an artist submitted page changes to review. Best-effort. */
export async function sendArtistReviewAlert(to: string[], artistName: string) {
  if (!resend || to.length === 0) return { skipped: true };
  const url = `${site.url}/admin/artists`;
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px">A page is ready to review</h1>
    <p style="margin:0 0 14px;line-height:1.6">
      <strong>${escapeHtml(artistName)}</strong> just submitted changes to their public artist page.
      Review and approve before it goes live.
    </p>
    <p style="margin:0;line-height:1.6">
      <a href="${url}" style="color:#17a898;text-decoration:none;font-weight:700">Review in the admin →</a>
    </p>`;
  try {
    return await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Review needed: ${artistName} updated their artist page`,
      html: wrap(inner),
    });
  } catch (e) {
    console.error("[emails] failed to send artist-review alert:", e);
    return { error: true };
  }
}

/** Celebrate an artist whose page just went live; point them to share tools. */
export async function sendArtistPageLive(to: string, name: string, slug: string) {
  if (!resend) return { skipped: true as const };
  const liveUrl = `${site.url}/artists/${slug}`;
  const inner = `
    <h1 style="margin:0 0 12px;font-size:24px">Your page is live! 🎉</h1>
    <p style="margin:0 0 14px;line-height:1.6">Hi ${escapeHtml(name)}, your artist page is now published on the
      ${site.event.year} ${site.name} site. Take a look:</p>
    <p style="margin:0 0 18px"><a href="${liveUrl}" style="color:#17a898;text-decoration:none;font-weight:700">${liveUrl}</a></p>
    <p style="margin:0 0 14px;line-height:1.6">Next, help shoppers find you: your <strong>artist hub</strong> has
      ready-made graphics and captions to post on Instagram and Facebook, plus everything you'll need for
      event day — booth layout, setup times, and the Big City Bread menu.</p>
    <p style="margin:0 0 18px"><a href="${site.url}/artist" style="display:inline-block;background:#3f7d22;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700">Open your artist hub →</a></p>
    <p style="margin:0;font-size:13px;color:#6b6b6b;line-height:1.6">Log in with this email address — the link is one-time, no password needed. Tag ${site.social.instagram} in your posts and we'll reshare you.</p>`;
  try {
    return await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `🎉 Your ${site.name} page is live`,
      html: wrap(inner),
    });
  } catch (e) {
    console.error("[emails] failed to send page-live email:", e);
    return { error: true as const };
  }
}

/** Nudge an accepted artist who hasn't built their page yet. Best-effort. */
export async function sendArtistPageReminder(to: string, name: string) {
  if (!resend) return { skipped: true as const };
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px">Your booth's page is waiting on you 🎨</h1>
    <p style="margin:0 0 14px;line-height:1.6">Hi ${escapeHtml(name)}, congratulations again on being accepted to the
      ${site.event.year} ${site.name}! We noticed your artist page isn't live yet.</p>
    <p style="margin:0 0 14px;line-height:1.6">It only takes a few minutes — we've pre-filled it with your
      application photos and words. Just log in, review, add any photos you like, and submit.
      A great page helps shoppers find you and plan their visit.</p>
    <p style="margin:0 0 18px"><a href="${site.url}/artist/login" style="display:inline-block;background:#3f7d22;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700">Finish your artist page →</a></p>
    <p style="margin:0;font-size:13px;color:#6b6b6b;line-height:1.6">Log in with the email you applied with — the button sends a one-time link, no password needed.</p>`;
  try {
    return await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Don't forget to set up your ${site.name} artist page`,
      html: wrap(inner),
    });
  } catch (e) {
    console.error("[emails] failed to send artist-page reminder:", e);
    return { error: true as const };
  }
}

/** Nudge an accepted artist whose booth fee is still unpaid, linking the invoice. */
export async function sendBoothFeeReminder(to: string, name: string, amount: number, invoiceUrl: string | null) {
  if (!resend) return { skipped: true as const };
  const payButton = invoiceUrl
    ? `<p style="margin:0 0 18px"><a href="${invoiceUrl}" style="display:inline-block;background:#d21c96;color:#fff;text-decoration:none;padding:12px 26px;border-radius:8px;font-weight:700">Pay your $${amount} booth fee →</a></p>`
    : `<p style="margin:0 0 14px;line-height:1.6">Look for the PayPal invoice in your inbox (check spam too) and follow the Pay Now button.</p>`;
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px">A quick reminder about your booth fee</h1>
    <p style="margin:0 0 14px;line-height:1.6">Hi ${escapeHtml(name)}, we're so glad you'll be at the ${site.event.year} ${site.name}!
      Your <strong>$${amount} booth fee</strong> is still showing as unpaid, and your space is held until it's in.</p>
    ${payButton}
    <p style="margin:0;font-size:13px;color:#6b6b6b;line-height:1.6">Already paid? Thank you — you can ignore this, it may have crossed in the mail.
      Questions? Just reply to this email.</p>`;
  try {
    return await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Reminder: your ${site.name} booth fee`,
      html: wrap(inner),
    });
  } catch (e) {
    console.error("[emails] failed to send booth-fee reminder:", e);
    return { error: true as const };
  }
}

export const CONTACT_TO = process.env.CONTACT_FORM_TO || "";

/** Event-day logistics for an accepted artist (setup, booth, what to bring). */
export async function sendArtistLogistics(to: string, name: string) {
  if (!resend) return { skipped: true as const };
  const setup = site.artistInfo.setup
    .map((s) => `<li style="margin:0 0 6px;line-height:1.6">${escapeHtml(s)}</li>`)
    .join("");
  const inner = `
    <h1 style="margin:0 0 12px;font-size:23px">Getting ready for the market 🎪</h1>
    <p style="margin:0 0 14px;line-height:1.6">Hi ${escapeHtml(name)}, we can't wait to see you at the ${site.event.year}
      ${site.name}! Here's what you need for event day.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px">
      <tr><td style="padding:2px 0;line-height:1.6"><strong>When:</strong> ${site.event.days[0].label} &amp; ${site.event.days[1].label}, ${site.event.timeLabel}</td></tr>
      <tr><td style="padding:2px 0;line-height:1.6"><strong>Where:</strong> ${site.location.name}, ${site.location.street}, ${site.location.city}</td></tr>
    </table>
    <p style="margin:0 0 6px;font-weight:700">Setup &amp; load-in</p>
    <ul style="margin:0 0 14px;padding-left:20px">${setup}</ul>
    <p style="margin:0 0 14px;line-height:1.6">${escapeHtml(site.artistInfo.menuNote)}</p>
    <p style="margin:0 0 18px"><a href="${site.url}/artist" style="display:inline-block;background:#3f7d22;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700">Open your artist hub →</a></p>
    <p style="margin:0;font-size:13px;color:#6b6b6b;line-height:1.6">Your hub always has the latest — booth layout, setup times, and the Big City Bread menu. Log in with this email address.</p>`;
  try {
    return await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Event-day details for the ${site.name}`,
      html: wrap(inner),
    });
  } catch (e) {
    console.error("[emails] failed to send artist logistics:", e);
    return { error: true as const };
  }
}

/** Annual nudge to submit paid-ad info to NPR + The Flagpole. Best-effort. */
export async function sendNprFlagpoleReminder(to: string) {
  if (!resend) return { skipped: true as const };
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px">Time to book NPR + Flagpole ads 📻</h1>
    <p style="margin:0 0 14px;line-height:1.6">Hi Jamie — a heads-up that it's the window to submit our advertising info to
      <strong>WUGA / NPR</strong> and <strong>The Flagpole</strong> for the December ${site.event.year} ${site.name}.</p>
    <p style="margin:0 0 14px;line-height:1.6">This one has slipped past us in years before, and the deadlines fill up — please
      get our ad details over to both outlets this week. It has to be done by a person, so it's on your list. 🙌</p>
    <p style="margin:0;font-size:13px;color:#6b6b6b;line-height:1.6">You're getting this because the site sends an automatic
      reminder in the second week of November each year.</p>`;
  try {
    return await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Reminder: submit NPR + Flagpole ads for the ${site.name}`,
      html: wrap(inner),
    });
  } catch (e) {
    console.error("[emails] failed to send NPR/Flagpole reminder:", e);
    return { error: true as const };
  }
}

// The judges/organizer who post to social in the run-up to the event.
// (Brent & Ryan focus on event-day logistics and are intentionally excluded.)
// Emails kept in env, not source (comma-separated in SOCIAL_POSTING_TEAM).
export const SOCIAL_POSTING_TEAM = (process.env.SOCIAL_POSTING_TEAM || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Prompt the posting team to download + post artist spotlights weekly. */
export async function sendJudgeSocialKit(to: string[]) {
  if (!resend || to.length === 0) return { skipped: true as const };
  const url = `${site.url}/admin/social-kit`;
  const inner = `
    <h1 style="margin:0 0 12px;font-size:22px">Time to spotlight our artists ✨</h1>
    <p style="margin:0 0 14px;line-height:1.6">Our ${site.event.year} lineup is set — let's build buzz for the
      ${site.name}! We've made ready-to-post spotlight images for every artist, so there's nothing to chase down.</p>
    <p style="margin:0 0 14px;line-height:1.6">The plan: post <strong>one artist spotlight each week</strong> leading up to
      the market (${site.event.days[0].label} &amp; ${site.event.days[1].label}) on Instagram and Facebook. Each image is
      sized for both feed and stories.</p>
    <p style="margin:0 0 18px"><a href="${url}" style="display:inline-block;background:#3f7d22;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700">Open the social kit →</a></p>
    <p style="margin:0;font-size:13px;color:#6b6b6b;line-height:1.6">Log in with this email address (one-time link, no
      password). Tag ${site.social.instagram} so posts are easy to reshare.</p>`;
  try {
    return await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Post an artist spotlight each week — your ${site.name} social kit`,
      html: wrap(inner),
    });
  } catch (e) {
    console.error("[emails] failed to send judge social kit:", e);
    return { error: true as const };
  }
}

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

/** Send a one-time magic login link. */
export async function sendMagicLink(to: string, url: string) {
  // Always log in dev so links are testable without a verified sending domain.
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n🔗 Magic link for ${to}:\n${url}\n`);
  }
  if (!resend) return { skipped: true as const };
  const inner = `
    <h1 style="margin:0 0 12px;font-size:24px">Log in to ${site.name}</h1>
    <p style="margin:0 0 16px;line-height:1.6">Click the button below to log in. This link works once and expires in 30 minutes.</p>
    <p style="margin:0 0 20px"><a href="${url}" style="display:inline-block;background:#17161b;color:#faf5ea;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700">Log in</a></p>
    <p style="margin:0;font-size:13px;color:#6b6b6b;line-height:1.6;word-break:break-all">Or paste this link into your browser:<br/>${url}</p>`;
  try {
    return await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Your login link for ${site.name}`,
      html: wrap(inner),
    });
  } catch (e) {
    console.error("[emails] failed to send magic link:", e);
    return { error: true as const };
  }
}

/** Invite a directly-added artist to complete their profile via a magic link. */
export async function sendArtistInvite(to: string, name: string, url: string) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n🔗 Artist invite for ${to}:\n${url}\n`);
  }
  if (!resend) return { skipped: true as const };
  const first = (name || "").trim().split(/\s+/)[0] || "there";
  const inner = `
    <h1 style="margin:0 0 12px;font-size:24px">You're in the ${site.event.year} ${site.name}!</h1>
    <p style="margin:0 0 16px;line-height:1.6">Hi ${escapeHtml(first)} — we've added you to this year's market. The last step is to complete your artist profile so we can build your public page. It takes a few minutes and this link works once, expiring in 30 minutes.</p>
    <p style="margin:0 0 20px"><a href="${url}" style="display:inline-block;background:#3f7d22;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700">Complete my profile</a></p>
    <p style="margin:0;font-size:13px;color:#6b6b6b;line-height:1.6;word-break:break-all">Or paste this link into your browser:<br/>${url}</p>`;
  try {
    return await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Complete your ${site.name} artist profile`,
      html: wrap(inner),
    });
  } catch (e) {
    console.error("[emails] failed to send artist invite:", e);
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

function ctaButton(href: string, label: string) {
  return `<p style="margin:0 0 18px"><a href="${href}" style="display:inline-block;background:#3f7d22;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700">${label}</a></p>`;
}

/** Send an applicant their decision. Best-effort. */
export async function sendDecisionEmail(to: string, name: string, decision: Decision) {
  if (!resend) {
    console.warn("[emails] RESEND not configured; skipping decision email");
    return { skipped: true as const };
  }
  const c = DECISION_COPY[decision];
  // Accepted artists get a clear next step: build their public page.
  const buildPage =
    decision === "accepted"
      ? `<div style="margin:0 0 18px;padding:16px 18px;background:#f1f7ec;border-radius:10px">
           <p style="margin:0 0 10px;line-height:1.6"><strong>Next step — build your artist page.</strong>
           We've started it for you with your application photos and words. Log in with this email address
           (<strong>${escapeHtml(to)}</strong>), review it, add or swap photos, and submit it for us to publish.</p>
           ${ctaButton(`${site.url}/artist/login`, "Build your artist page →")}
           <p style="margin:0;font-size:13px;color:#6b6b6b;line-height:1.6">The button emails you a one-time login link — no password needed.</p>
         </div>`
      : "";
  const inner = `
    <h1 style="margin:0 0 12px;font-size:24px">${c.heading}</h1>
    <p style="margin:0 0 14px;line-height:1.6">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 14px;line-height:1.6">${c.body}</p>
    ${buildPage}
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
