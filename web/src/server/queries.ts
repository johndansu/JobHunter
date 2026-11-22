import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { ingestRuns, jobs, postings, sources } from "./db/schema";
import { verdictFor, type VerdictKind } from "./lib/eligibility";
import { regionsOf } from "./lib/geo";
import { DEFAULT_VIEWER } from "./ingest/derive";
import { isEmployerSource } from "./sources";

export const PAGE_SIZE = 25;
const ATS = ["greenhouse", "lever", "ashby"];

export type SearchParams = {
  q?: string;
  category?: string;
  elig?: "open" | "unclear" | "all";
  posted?: string; // days
  salary?: string;
  engagement?: string;
  direct?: string;
  flagged?: string; // "show" to include possible scams
  sort?: "newest" | "relevant";
  country?: string;
  tz?: string;
  page?: string;
};

export const postedExpr = sql<Date>`least(${jobs.sourcePostedAt}, ${jobs.firstSeen})`;

export async function searchJobs(p: SearchParams) {
  const country = (p.country || DEFAULT_VIEWER.country).toUpperCase();
  const viewer = { country, timezone: p.tz || (country === DEFAULT_VIEWER.country ? DEFAULT_VIEWER.timezone : "UTC"), shiftHours: DEFAULT_VIEWER.shiftHours };
  const isDefault = country === DEFAULT_VIEWER.country;
  const elig = p.elig ?? "open";
  const page = Math.max(1, Number(p.page) || 1);
  const q = p.q?.trim();

  const where: SQL[] = [eq(jobs.status, "live"), sql`${jobs.lastSeen} > now() - interval '30 days'`];
  if (q) where.push(sql`${jobs.search} @@ websearch_to_tsquery('english', ${q})`);
  if (p.category) where.push(eq(jobs.category, p.category));
  const days = Number(p.posted);
  if (days > 0) where.push(sql`${postedExpr} > now() - make_interval(days => ${days})`);
  if (p.salary === "1") where.push(sql`(${jobs.salaryMin} is not null or ${jobs.salaryMax} is not null)`);
  if (p.engagement) where.push(eq(jobs.engagement, p.engagement));
  if (p.direct === "1") where.push(inArray(jobs.canonicalSource, ATS));
  if (p.flagged !== "show") where.push(sql`not (${jobs.trust} @> '[{"kind":"possible_scam"}]'::jsonb)`);

  const allowed: VerdictKind[] = elig === "all" ? [] : elig === "unclear" ? ["eligible", "region_match", "unclear"] : ["eligible", "region_match"];
  if (allowed.length) {
    if (isDefault) where.push(inArray(jobs.verdict, allowed));
    else {
      // Other countries: coarse SQL prefilter, exact verdict computed per row below.
      const regions = regionsOf(country);
      const parts = [
        sql`(${jobs.eligibility}->>'scope' = 'worldwide')`,
        sql`(${jobs.eligibility}->'countries' ? ${country})`,
        ...(regions.length ? [sql`(${jobs.eligibility}->'regions' ?| ${sql.raw(`array[${regions.map((r) => `'${r}'`).join(",")}]`)})`] : []),
        ...(allowed.includes("unclear") ? [sql`(${jobs.eligibility}->>'scope' = 'unknown')`] : []),
      ];
      where.push(sql`(${sql.join(parts, sql` or `)})`);
    }
  }

  const rankExpr = q ? sql<number>`ts_rank(${jobs.search}, websearch_to_tsquery('english', ${q}))` : sql<number>`0`;
  const order = q && p.sort !== "newest" ? [desc(rankExpr), desc(postedExpr)] : [desc(postedExpr), asc(jobs.id)];

  const cond = and(...where);
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(jobs).where(cond);
  const rows = await db
    .select({
      id: jobs.id, title: jobs.title, company: jobs.company, category: jobs.category, seniority: jobs.seniority,
      employmentType: jobs.employmentType, engagement: jobs.engagement, locationText: jobs.locationText,
      salaryMin: jobs.salaryMin, salaryMax: jobs.salaryMax, salaryCurrency: jobs.salaryCurrency, salaryPeriod: jobs.salaryPeriod,
      eligibility: jobs.eligibility, trust: jobs.trust, verdict: jobs.verdict, verdictReason: jobs.verdictReason,
      verdictNote: jobs.verdictNote, overlap: jobs.overlap, canonicalSource: jobs.canonicalSource,
      posted: postedExpr, firstSeen: jobs.firstSeen, lastSeen: jobs.lastSeen,
      repostCount: jobs.repostCount, reopenedAt: jobs.reopenedAt,
      sourceCount: sql<number>`(select count(*)::int from postings p where p.job_id = ${jobs.id} and p.closed_at is null)`,
    })
    .from(jobs)
    .where(cond)
    .orderBy(...order)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const items = rows
    .map((r) => {
      if (isDefault) return { ...r, v: { verdict: r.verdict as VerdictKind, reason: r.verdictReason ?? "", note: r.verdictNote, overlap: r.overlap } };
      const v = verdictFor(r.eligibility, viewer);
      return { ...r, v: { verdict: v.verdict, reason: v.reason, note: v.note, overlap: v.overlap } };
    })
    .filter((r) => !allowed.length || allowed.includes(r.v.verdict));

  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), viewer, exactCount: isDefault || !allowed.length };
}

export async function getJob(id: number) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) return null;
  const posts = await db
    .select({ id: postings.id, sourceId: postings.sourceId, board: postings.board, sourceJobId: postings.sourceJobId, url: postings.url, applyUrl: postings.applyUrl, closedAt: postings.closedAt, lastSeen: postings.lastSeen })
    .from(postings)
    .where(eq(postings.jobId, id))
    .orderBy(asc(postings.id));
  return { job, posts };
}

export async function categoryCounts() {
  return db
    .select({ category: jobs.category, n: sql<number>`count(*)::int` })
    .from(jobs)
    .where(and(eq(jobs.status, "live"), inArray(jobs.verdict, ["eligible", "region_match"])))
    .groupBy(jobs.category)
    .orderBy(desc(sql`count(*)`));
}

export async function sourceHealth() {
  const list = await db.select().from(sources).orderBy(asc(sources.id));
  const counts = await db
    .select({ sourceId: postings.sourceId, open: sql<number>`count(*) filter (where ${postings.closedAt} is null)::int`, closed: sql<number>`count(*) filter (where ${postings.closedAt} is not null)::int` })
    .from(postings)
    .groupBy(postings.sourceId);
  const recent = await db.select().from(ingestRuns).orderBy(desc(ingestRuns.id)).limit(30);
  const totals = await db
    .select({ verdict: jobs.verdict, n: sql<number>`count(*)::int` })
    .from(jobs)
    .where(eq(jobs.status, "live"))
    .groupBy(jobs.verdict);
  return { list, counts, recent, totals };
}

export { isEmployerSource };
