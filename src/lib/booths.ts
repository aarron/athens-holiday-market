/**
 * Booth math for accepted artists. Two artists who share a booth each apply
 * (and are accepted) separately, so counting accepted applications overstates
 * the booths taken. Pair each accepted sharer with the accepted artist named in
 * their "share a booth with" answer and count the pair once.
 */

export type BoothApp = {
  id: number;
  name: string;
  businessName: string | null;
  email: string;
  shareBooth: boolean;
  shareBoothWith: string | null;
};

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Does a free-text "share with" answer name this artist? */
function names(answer: string, app: BoothApp) {
  const a = norm(answer);
  if (a.length < 3) return false;
  const candidates = [norm(app.name), norm(app.businessName), norm(app.email.split("@")[0])].filter(
    (c) => c.length >= 3,
  );
  // Either side may carry extras ("Jane Doe of Doe Pottery", "jane"), so match
  // on containment in either direction.
  return candidates.some((c) => a.includes(c) || c.includes(a));
}

/**
 * Pair up accepted sharers. Returns a map of application id → partner id for
 * every matched pair. A sharer whose partner wasn't accepted (or can't be
 * matched from their answer) keeps a booth of their own.
 */
export function pairSharedBooths(accepted: BoothApp[]): Map<number, number> {
  const sharers = accepted.filter((a) => a.shareBooth);
  const partner = new Map<number, number>();
  for (const a of sharers) {
    if (partner.has(a.id)) continue;
    // The partner may have forgotten to tick "share a booth" themselves, so
    // anyone accepted that this sharer names counts.
    const b = accepted.find(
      (o) =>
        o.id !== a.id &&
        !partner.has(o.id) &&
        ((a.shareBoothWith && names(a.shareBoothWith, o)) ||
          (o.shareBooth && o.shareBoothWith && names(o.shareBoothWith, a))),
    );
    if (b) {
      partner.set(a.id, b.id);
      partner.set(b.id, a.id);
    }
  }
  return partner;
}

/** Booths taken by a set of accepted artists, with shared pairs counted once. */
export function countBooths(accepted: BoothApp[], partner = pairSharedBooths(accepted)) {
  const ids = new Set(accepted.map((a) => a.id));
  // Only pairs where both halves are in this set collapse into one booth.
  const sharedPairs = [...partner.entries()].filter(([a, b]) => a < b && ids.has(a) && ids.has(b)).length;
  return { artists: accepted.length, booths: accepted.length - sharedPairs, sharedPairs };
}
