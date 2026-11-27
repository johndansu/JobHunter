import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { dismissals, jobs, matches, profiles } from "./db/schema";
import { verdictFor } from "./lib/eligibility";
import { bandScore, halfLifeDays, scoreMatch } from "./lib/match";
import { EMPTY_PROFILE, type Profile } from "./lib/profile";

/**
 * Score every live job against the owner's profile (no-AI mode).
 * Stores matches that are at least a Stretch, open or not, so "Why not me?" can
 * show good-fit jobs that are closed to you. Ranking with freshness happens at query time.
 */

export async function getProfile() {
  const [row] = await db.select().from(profiles).where(eq(profiles.id, 1));
  return row ? { ...row, data: { ...EMPTY_PROFILE, ...row.data } } : null;
}

export async function saveProfile(data: Profile, cv?: (typeof profiles.$inferInsert)["cv"]) {
  const current = await getProfile();
  const version = (current?.version ?? 0) + 1;
  await db
    .insert(profiles)
    .values({ id: 1, version, data, cv: cv ?? current?.cv ?? null })
    .onConflictDoUpdate({ target: profiles.id, set: { version, data, ...(cv !== undefined ? { cv } : {}), updatedAt: new Date() } });
  return version;
}

/** Store (or clear) the candidate's profile export for the consistency check. Needs a profile row. */
export async function setOtherProfile(other: (typeof profiles.$inferInsert)["otherProfile"]) {
  const current = await getProfile();
  if (!current) await saveProfile(EMPTY_PROFILE);
  await db.update(profiles).set({ otherProfile: other ?? null, updatedAt: new Date() }).where(eq(profiles.id, 1));
}

/** Eligibility viewer from the profile: country, time zone, shift, plus citizenships and unexpired permits. */
export function viewerOf(p: Profile, extraShift = 0) {
  const today = new Date().toISOString().slice(0, 10);
  const permits = p.permits.filter((x) => !x.expires || x.expires >= today).map((x) => x.country);
  return { country: p.country, timezone: p.timezone, shiftHours: p.shiftHours + extraShift, authorizedIn: [...new Set([...p.citizenships, ...permits])] };
}

let running: Promise<number> | null = null;

export function recomputeMatches(): Promise<number> {
  // One recompute at a time; callers share the in-flight run.
  running ??= doRecompute().finally(() => (running = null));
  return running;
}

async function doRecompute(): Promise<number> {
  const profile = await getProfile();
  if (!profile || (!profile.data.targetTitles.length && !profile.data.skills.length)) return 0;
  const p = profile.data;
  const viewer = viewerOf(p);
  const dismissed = new Set((await db.select({ id: dismissals.jobId }).from(dismissals)).map((r) => r.id));

  const rows = await db
    .select({ id: jobs.id, title: jobs.title, category: jobs.category, seniority: jobs.seniority, requirements: jobs.requirements, eligibility: jobs.eligibility, engagement: jobs.engagement })
    .from(jobs)
    .where(sql`${jobs.status} = 'live' and ${jobs.lastSeen} > now() - interval '30 days' and not (${jobs.trust} @> '[{"kind":"possible_scam"}]'::jsonb)`);

  const out: (typeof matches.$inferInsert)[] = [];
  for (const j of rows) {
    if (dismissed.has(j.id)) continue;
    if (p.engagements.length && j.engagement !== "unknown" && !p.engagements.includes(j.engagement as never)) continue;
    const m = scoreMatch(p, j);
    if (m.band === "unlikely") continue;
    const v = verdictFor(j.eligibility, viewer);
    out.push({ jobId: j.id, profileVersion: profile.version, fit: m.fit, band: m.band, bandScore: bandScore(m.band), halfLife: halfLifeDays(j.seniority), verdict: v.verdict, verdictReason: v.reason, checklist: m.checklist });
  }

  await db.transaction(async (tx) => {
    await tx.delete(matches);
    for (let i = 0; i < out.length; i += 500) await tx.insert(matches).values(out.slice(i, i + 500));
  });
  return out.length;
}
