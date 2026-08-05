import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getApplication, getJurors, tally } from "@/lib/admin-data";
import { getSessionUser } from "@/lib/admin-auth";
import { StatusBadge, BoothFeeBadge, VoteTally } from "@/components/admin/badges";
import { VoteButtons, CommentBox, DecisionControls } from "@/components/admin/controls";
import { SafeImg } from "@/components/admin/safe-img";

export const metadata: Metadata = { title: "Application", robots: { index: false } };
export const dynamic = "force-dynamic";

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

  const myVote = app.votes.find((v) => v.user.email === me?.email)?.value;
  const voteByUser = new Map(app.votes.map((v) => [v.user.id, v.value]));
  const isAdmin = me?.role === "admin";

  return (
    <div>
      <Link href="/admin" className="text-sm font-semibold text-ink-soft hover:text-fern-deep">
        ← All applications
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold">{app.name}</h1>
            <StatusBadge status={app.status} />
          </div>
          <p className="mt-1 text-lg text-ink-soft">{app.medium}</p>
        </div>
        <VoteTally tally={tally(app.votes)} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Main column */}
        <div className="space-y-8">
          {/* Photos */}
          {app.photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {app.photos.map((p) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-lg bg-cream shadow-[var(--shadow-card)]"
                >
                  <SafeImg src={p.url} alt="Applicant work" flowerSize={32} className="aspect-square w-full object-cover" />
                </a>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="rounded-xl bg-white p-6 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
              About the work
            </h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed">{app.description}</p>
          </div>

          {/* Contact */}
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard label="Email" value={<a href={`mailto:${app.email}`} className="text-fern-deep underline underline-offset-4">{app.email}</a>} />
            <InfoCard label="Cell" value={app.phone ?? "—"} />
            <InfoCard
              label="Website"
              value={
                app.website ? (
                  <a href={app.website.startsWith("http") ? app.website : `https://${app.website}`} target="_blank" rel="noreferrer" className="break-all text-fern-deep underline underline-offset-4">
                    {app.website}
                  </a>
                ) : "—"
              }
            />
            <InfoCard label="Share a booth?" value={app.shareBooth ? `Yes${app.shareBoothWith ? ` — ${app.shareBoothWith}` : ""}` : "No"} />
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
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">Jury votes</h2>
            <ul className="mt-3 space-y-2">
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
        </aside>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
