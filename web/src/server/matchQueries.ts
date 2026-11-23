import { and, desc, eq, gte, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { jobs, matches } from "./db/schema";
import { verdictFor } from "./lib/eligibility";
import { FRESHNESS_FLOOR } from "./lib/match";
import { getProfile, viewerOf } from "./matching";
import { postedExpr } from "./queries";

export const MATCH_PAGE = 25;
const BAND_ORDER = ["strong", "good", "stretch"];

/** Rank = band × freshness multiplier (with a floor), tie-broken by fit (RANK-06). */
const rankExpr = sql<number>`${matches.bandScore} * (${FRESHNESS_FLOOR} + ${1 - FRESHNESS_FLOOR} * power(0.5, extract(epoch from now() - ${postedExpr}) / 86400.0 / ${matches.halfLife})) + ${matches.fit} * 0.05`;

export async function listMatches(p: { view?: string; band?: string; category?: string; page?: string }) {
  const profile = await getProfile();
  if (!profile) return null;
  const open = profile.data.includeUnclear ? ["eligible", "region_match", "unclear"] : ["eligible", "region_match"];
  const minBand = BAND_ORDER.includes(p.band ?? "") ? BAND_ORDER.indexOf(p.band!) : 2;
  const where: SQL[] = [
    eq(jobs.status, "live"),
    inArray(matches.verdict, open),
    inArray(matches.band, BAND_ORDER.slice(0, minBand + 1)),
  ];
  if (p.view === "new") where.push(gte(jobs.firstSeen, sql`now() - interval '1 day'`));
  if (p.category) where.push(eq(jobs.category, p.category));
  const page = Math.max(1, Number(p.page) || 1);
  const cond = and(...where);

  const [counts, [{ total }], newCount, rows] = await Promise.all([
    db.select({ band: matches.band, n: sql<number>`count(*)::int` }).from(matches).innerJoin(jobs, eq(jobs.id, matches.jobId))
      .where(and(eq(jobs.status, "live"), inArray(matches.verdict, open))).groupBy(matches.band),
    db.select({ total: sql<number>`count(*)::int` }).from(matches).innerJoin(jobs, eq(jobs.id, matches.jobId)).where(cond),
    db.select({ n: sql<number>`count(*)::int` }).from(matches).innerJoin(jobs, eq(jobs.id, matches.jobId))
      .where(and(eq(jobs.status, "live"), inArray(matches.verdict, open), inArray(matches.band, ["strong", "good"]), gte(jobs.firstSeen, sql`now() - interval '1 day'`))),
    db.select({
      id: jobs.id, title: jobs.title, company: jobs.company, category: jobs.category, employmentType: jobs.employmentType,
      engagement: jobs.engagement, salaryMin: jobs.salaryMin, salaryMax: jobs.salaryMax, salaryCurrency: jobs.salaryCurrency, salaryPeriod: jobs.salaryPeriod,
      posted: postedExpr, firstSeen: jobs.firstSeen, band: matches.band, fit: matches.fit, verdict: matches.verdict, verdictReason: matches.verdictReason, checklist: matches.checklist,
    }).from(matches).innerJoin(jobs, eq(jobs.id, matches.jobId)).where(cond).orderBy(desc(rankExpr)).limit(MATCH_PAGE).offset((page - 1) * MATCH_PAGE),
  ]);
  return { profile, rows, total, page, pages: Math.max(1, Math.ceil(total / MATCH_PAGE)), counts: Object.fromEntries(counts.map((c) => [c.band, c.n])) as Record<string, number>, newStrongGood: newCount[0].n };
}

export async function matchFor(jobId: number) {
  const [m] = await db.select().from(matches).where(eq(matches.jobId, jobId));
  return m ?? null;
}

/** "Why not me?" (ELIG-12): good-fit jobs that are closed to you, grouped by the rule that shuts you out. */
export async function whyNot() {
  const profile = await getProfile();
  if (!profile) return null;
  const rows = await db
    .select({ id: jobs.id, title: jobs.title, company: jobs.company, reason: matches.verdictReason, band: matches.band, eligibility: jobs.eligibility })
    .from(matches).innerJoin(jobs, eq(jobs.id, matches.jobId))
    .where(and(eq(jobs.status, "live"), eq(matches.verdict, "not_eligible"), inArray(matches.band, ["strong", "good"])));
  const groupOf = (r: string) =>
    /sanction/i.test(r) ? "Sanctions" :
    /overlap|time zones?|±/i.test(r) ? "Time zone" :
    /citizenship|clearance|export/i.test(r) ? "Citizenship or security clearance" :
    /right to work/i.test(r) ? "Work authorization in another country" :
    /^Excludes/.test(r) ? "Your country is excluded" :
    /^Open only to/.test(r) ? "Limited to other countries" : "Other";
  type Group = { count: number; reasons: Map<string, number>; examples: { id: number; title: string; company: string }[] };
  const groups = new Map<string, Group>();
  for (const r of rows) {
    const g = groupOf(r.reason ?? "");
    const entry: Group = groups.get(g) ?? { count: 0, reasons: new Map(), examples: [] };
    entry.count++;
    entry.reasons.set(r.reason ?? "", (entry.reasons.get(r.reason ?? "") ?? 0) + 1);
    if (entry.examples.length < 4) entry.examples.push({ id: r.id, title: r.title, company: r.company });
    groups.set(g, entry);
  }
  // Levers: how many time-zone-blocked jobs open up if you shift your day by 2 or 4 more hours.
  const tzRows = rows.filter((r) => groupOf(r.reason ?? "") === "Time zone");
  const shiftOpens = [2, 4].map((h) => ({
    hours: h,
    opens: tzRows.filter((r) => verdictFor(r.eligibility, viewerOf(profile.data, h)).verdict !== "not_eligible").length,
  }));
  return {
    total: rows.length,
    groups: [...groups.entries()].sort((a, b) => b[1].count - a[1].count).map(([name, g]) => ({
      name, count: g.count, examples: g.examples,
      topReasons: [...g.reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4),
    })),
    shiftOpens,
    profile,
  };
}
