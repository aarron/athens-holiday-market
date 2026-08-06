import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getApplication,
  getJurors,
  getArtistForApplication,
  getParticipationHistory,
  getEmailComms,
  tally,
} from "@/lib/admin-data";
import { getSessionUser } from "@/lib/admin-auth";
import { StatusBadge, BoothFeeBadge, VoteTally } from "@/components/admin/badges";
import {
  VoteButtons,
  CommentBox,
  DecisionControls,
  PublishControls,
  SendArtistLinkButton,
} from "@/components/admin/controls";
import { PhotoGallery } from "@/components/admin/photo-gallery";
import { BackIcon, ExternalIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Application", robots: { index: false } };
export const dynamic = "force-dynamic";

const RECEIPT_COLOR: Record<string, string> = {
  sent: "var(--color-ink-soft)",
  delivered: "var(--color-sky)",
  opened: "var(--color-fern-deep)",
  clicked: "var(--color-teal)",
  bounced: "var(--color-poppy)",
  complained: "var(--color-poppy)",
  failed: "var(--color-poppy)",
};

const HISTORY_LABEL: Record<string, string> = {
  accepted: "Accepted",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
  submitted: "Applied",
  under_review: "Applied",
};
const HISTORY_COLOR: Record<string, string> = {
  accepted: "var(--color-fern-deep)",
  waitlisted: "var(--color-tangerine)",
  rejected: "var(--color-poppy)",
  submitted: "var(--color-ink)",
  under_review: "var(--color-sky)",
};

const VOTE_LABEL: Record<string, { label: string; color: string }> = {
  yes: { label: "Yes", color: "var(--color-fern-deep)" },
  maybe: { label: "Maybe", color: "var(--color-tangerine)" },
  no: { label: "No", color: "var(--color-poppy)" },
};

export default async function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appId = Number(id);
  if (!Number.isFinite(appId)) notFound();

  const [app, jurors, me] = await Promise.all([getApplication(appId), getJurors(), getSessionUser()]);
  if (!app) notFound();

  const [artistProfile, history, comms] = await Promise.all([
    getArtistForApplication(appId),
    getParticipationHistory(app.email, app.name, appId),
    getEmailComms(app.email, app),
  ]);

  const myVote = app.votes.find((v) => v.user.email === me?.email)?.value;
  const voteByUser = new Map(app.votes.map((v) => [v.user.id, v.value]));
  const isAdmin = me?.role === "admin";

  const socials = (app.socials ?? {}) as Record<string, string>;
  const socialLinks = Object.entries(socials)
    .filter(([, v]) => v && v.trim())
    .map(([key, v]) => ({ key, url: socialUrl(key, v) }));

  return (
    <div>
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-fern-deep">
        <BackIcon size={16} aria-hidden />
        All applications
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold">{app.name}</h1>
            <StatusBadge status={app.status} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {app.mediumCategory && (
              <span className="rounded-full bg-sky-soft px-2.5 py-0.5 text-xs font-bold text-sky">
                {app.mediumCategory}
              </span>
            )}
            <span className="text-lg text-ink-soft">{app.medium}</span>
          </div>
          {history.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                History:
              </span>
              {history.map((h) => (
                <span
                  key={h.year}
                  className="rounded-full bg-cream px-2.5 py-0.5 text-xs font-semibold text-ink-soft"
                >
                  {h.year} ·{" "}
                  <span style={{ color: HISTORY_COLOR[h.status] ?? "var(--color-ink-soft)" }}>
                    {HISTORY_LABEL[h.status] ?? h.status}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Main column */}
        <div className="space-y-8">
          {/* Photos — click to enlarge */}
          <PhotoGallery photos={app.photos} />

          {/* Description */}
          <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
              About the work
            </h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed">{app.description}</p>
          </div>

          {/* Artist details — everything about who they are, in one place */}
          <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
              Artist details
            </h2>
            <dl className="mt-4 divide-y divide-ink/5">
              <DetailRow label="Email">
                <a href={`mailto:${app.email}`} className="break-all text-fern-deep underline underline-offset-4">
                  {app.email}
                </a>
              </DetailRow>
              <DetailRow label="Cell">{app.phone ?? "—"}</DetailRow>
              <DetailRow label="Website">
                {app.website ? (
                  <a
                    href={app.website.startsWith("http") ? app.website : `https://${app.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-fern-deep underline underline-offset-4"
                  >
                    {app.website}
                  </a>
                ) : (
                  "—"
                )}
              </DetailRow>
              <DetailRow label="Share a booth?">
                {app.shareBooth ? `Yes${app.shareBoothWith ? ` — ${app.shareBoothWith}` : ""}` : "No"}
              </DetailRow>
              {socialLinks.length > 0 && (
                <DetailRow label="Socials">
                  <div className="flex flex-wrap gap-2">
                    {socialLinks.map(({ key, url }) => (
                      <a
                        key={key}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border-2 border-ink/15 px-3 py-1 text-sm font-semibold capitalize hover:bg-cream"
                      >
                        {key}
                        <ExternalIcon size={13} aria-hidden />
                      </a>
                    ))}
                  </div>
                </DetailRow>
              )}
            </dl>
          </div>

          {/* Comments */}
          <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-lg font-extrabold">
              Jury notes {app.comments.length > 0 && <span className="text-ink-soft">({app.comments.length})</span>}
            </h2>
            <ul className="mt-4 space-y-4">
              {app.comments.map((c) => (
                <li key={c.id} className="rounded-lg bg-cream-soft p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold">{c.user.name ?? c.user.email}</span>
                    <span className="text-xs text-ink-soft">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{c.body}</p>
                </li>
              ))}
              {app.comments.length === 0 && (
                <li className="text-sm text-ink-soft">No notes yet. Start the conversation.</li>
              )}
            </ul>
            <CommentBox applicationId={app.id} />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">Your vote</h2>
            <div className="mt-3">
              <VoteButtons applicationId={app.id} myVote={myVote} />
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">Jury votes</h2>
              <VoteTally tally={tally(app.votes)} />
            </div>
            <ul className="mt-4 space-y-2 border-t border-ink/5 pt-4">
              {jurors.map((j) => {
                const v = voteByUser.get(j.id);
                const style = v ? VOTE_LABEL[v] : null;
                return (
                  <li key={j.id} className="flex items-center justify-between text-sm">
                    <span>{j.name ?? j.email}</span>
                    {style ? (
                      <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ backgroundColor: `${style.color}1a`, color: style.color }}>
                        {style.label}
                      </span>
                    ) : (
                      <span className="text-ink-soft/40">—</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {isAdmin && (
            <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">Manage</h2>
                <BoothFeeBadge paid={app.boothFeePaid} status={app.status} />
              </div>
              <DecisionControls applicationId={app.id} status={app.status} boothFeePaid={app.boothFeePaid} />
            </div>
          )}

          {isAdmin && (
            <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
                Email history
              </h2>
              {comms.length === 0 ? (
                <p className="mt-2 text-sm text-ink-soft">
                  No emails sent yet. Decisions and broadcasts go out from{" "}
                  <Link href="/admin/broadcasts" className="font-semibold text-fern-deep underline underline-offset-4">
                    Email
                  </Link>
                  .
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {comms.map((c, i) => (
                    <li key={i} className="border-l-2 border-ink/10 pl-3 text-sm">
                      <div className="font-semibold leading-snug">{c.label}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
                        <span>Sent {c.sentAt ? new Date(c.sentAt).toLocaleDateString() : "—"}</span>
                        <span aria-hidden>·</span>
                        <span
                          className="font-bold capitalize"
                          style={{ color: RECEIPT_COLOR[c.status] ?? "var(--color-ink)" }}
                        >
                          {c.status}
                        </span>
                        {c.statusAt && c.status !== "sent" && (
                          <span>{new Date(c.statusAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 border-t border-ink/5 pt-2 text-[0.7rem] text-ink-soft/70">
                Delivery status from Resend — confirm important emails were received &amp; opened.
              </p>
            </div>
          )}

          {isAdmin && app.status === "accepted" && (
            <>
              <div className="rounded-xl bg-white p-5 shadow-[var(--shadow-card)]">
                <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
                  Artist page
                </h2>
                <SendArtistLinkButton email={app.email} />
                <p className="mt-2 text-xs text-ink-soft/70">
                  Sends a magic link so the artist builds their own page — you review before it goes
                  live. Or publish directly from their application:
                </p>
              </div>
              <PublishControls
                applicationId={app.id}
                published={artistProfile?.published ?? false}
                slug={artistProfile?.slug}
              />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function socialUrl(platform: string, value: string) {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, "");
  const bases: Record<string, string> = {
    instagram: "https://instagram.com/",
    facebook: "https://facebook.com/",
    tiktok: "https://tiktok.com/@",
    etsy: "https://etsy.com/shop/",
  };
  if (bases[platform]) return bases[platform] + handle;
  return `https://${v}`;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{children}</dd>
    </div>
  );
}
