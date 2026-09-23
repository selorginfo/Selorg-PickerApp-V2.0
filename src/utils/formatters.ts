/** HH:MM:SS elapsed timer — mirrors Component.fmt(). */
export function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s)}`;
}

/** Training clip time "0:CC / 0:06" — mirrors Component.fmtVid(). */
export function formatVideoTime(progressPct: number, totalSec = 6): string {
  const cur = Math.round((totalSec * Math.min(100, progressPct)) / 100);
  const f = (n: number) => `0:${String(n).padStart(2, '0')}`;
  return `${f(cur)} / ${f(totalSec)}`;
}

export function nowClock(): string {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const pct = (done: number, total: number) => `${Math.round((done / total) * 100)}%`;

/** "5 Sep 2026" — used for payout method submission dates. */
export function formatSubmittedDate(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Bank and UPI details are approved by an admin, so a pending submission tells the
 * picker when it was sent and how long review takes.
 */
export function pendingReviewMessage(submittedAt?: string | null): string {
  const on = formatSubmittedDate(submittedAt);
  return on
    ? `Submitted on ${on} · usually reviewed within 24 hours`
    : 'Pending verification · usually reviewed within 24 hours';
}
