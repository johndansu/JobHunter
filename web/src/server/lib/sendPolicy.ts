/**
 * Caps, gaps and follow-up timing (MAIL-10, MAIL-14, MAIL-19). Pure functions so
 * the rules are tested exactly; the outbox applies them when queueing and again
 * just before sending.
 */

export const DAILY_CAP = 25; // new emails per rolling 24 hours (applications, speculative, follow-ups)
export const SPECULATIVE_DAILY_CAP = 3;
export const SPECULATIVE_COMPANY_DAYS = 90;
export const GAP_MIN_S = 120;
export const GAP_MAX_S = 300;
export const MAX_FOLLOW_UPS = 2;
export const MAX_SPECULATIVE_FOLLOW_UPS = 1;

export type SendKind = "application" | "speculative" | "follow_up" | "test";
/** A send that happened or is queued: `at` is sentAt, or sendAt for queued ones. */
export type PastSend = { at: Date; kind: SendKind; companyKey: string | null };

export type Plan = { ok: true; sendAt: Date; gapSeconds: number } | { ok: false; reason: string; retryAt: Date | null };

const DAY = 86400_000;

/**
 * When a new email may go out. Tests to yourself skip the caps. Everything else
 * is limited to 25 per rolling day (3 speculative, and one speculative per
 * company per 90 days), and waits a random 2–5 minutes after the previous send.
 */
export function planSend(o: { kind: SendKind; companyKey: string | null; now: Date; history: PastSend[]; random?: () => number }): Plan {
  if (o.kind === "test") return { ok: true, sendAt: o.now, gapSeconds: 0 };
  const real = o.history.filter((h) => h.kind !== "test");
  const since = o.now.getTime() - DAY;
  const window = real.filter((h) => h.at.getTime() > since).sort((a, b) => a.at.getTime() - b.at.getTime());
  if (window.length >= DAILY_CAP) {
    return { ok: false, reason: `You've reached ${DAILY_CAP} emails in 24 hours. That's the ceiling, to keep your account in good standing and your applications tailored.`, retryAt: new Date(window[window.length - DAILY_CAP].at.getTime() + DAY) };
  }
  if (o.kind === "speculative") {
    const spec = window.filter((h) => h.kind === "speculative");
    if (spec.length >= SPECULATIVE_DAILY_CAP) {
      return { ok: false, reason: `Speculative applications are limited to ${SPECULATIVE_DAILY_CAP} a day.`, retryAt: new Date(spec[spec.length - SPECULATIVE_DAILY_CAP].at.getTime() + DAY) };
    }
    const sameCo = o.companyKey ? real.filter((h) => h.kind === "speculative" && h.companyKey === o.companyKey).sort((a, b) => b.at.getTime() - a.at.getTime())[0] : null;
    if (sameCo && o.now.getTime() - sameCo.at.getTime() < SPECULATIVE_COMPANY_DAYS * DAY) {
      return { ok: false, reason: `You sent this company a speculative application less than ${SPECULATIVE_COMPANY_DAYS} days ago.`, retryAt: new Date(sameCo.at.getTime() + SPECULATIVE_COMPANY_DAYS * DAY) };
    }
  }
  const rnd = o.random ?? Math.random;
  const gapSeconds = Math.round(GAP_MIN_S + rnd() * (GAP_MAX_S - GAP_MIN_S));
  const latest = real.reduce((m, h) => Math.max(m, h.at.getTime()), 0);
  const sendAt = new Date(Math.max(o.now.getTime(), latest ? latest + gapSeconds * 1000 : 0));
  return { ok: true, sendAt, gapSeconds };
}

/** Add business days (Mon–Fri). Public holidays aren't known yet, so they count as working days. */
export function addBusinessDays(from: Date, n: number): Date {
  const d = new Date(from.getTime());
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6) left--;
  }
  return d;
}

/**
 * When the next follow-up is due (MAIL-14, MAIL-19): the first 7 business days
 * after the application, the last 7 business days after the first. Speculative
 * applications get one, after 10 business days. null = no more follow-ups.
 */
export function nextFollowUpDue(o: { kind: "application" | "speculative"; sentAt: Date; followUps: Date[]; replied: boolean }): Date | null {
  if (o.replied) return null;
  const max = o.kind === "speculative" ? MAX_SPECULATIVE_FOLLOW_UPS : MAX_FOLLOW_UPS;
  if (o.followUps.length >= max) return null;
  if (!o.followUps.length) return addBusinessDays(o.sentAt, o.kind === "speculative" ? 10 : 7);
  return addBusinessDays(o.followUps[o.followUps.length - 1], 7);
}
