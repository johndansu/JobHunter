import { and, asc, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "../db";
import { ingestRuns, jobs, postings, sources } from "../db/schema";
import { verdictFor } from "../lib/eligibility";
import { matchKeyOf } from "../lib/normalize";
import { isEmployerSource, PRECEDENCE, SOURCES, sourceById } from "../sources";
import type { RawPosting, SourceAdapter } from "../sources/types";
import { DEFAULT_VIEWER, derive, jobColumns, moreRestrictive } from "./derive";

export type RunSummary = {
  source: string; ok: boolean; requests: number; fetched: number; created: number;
  updated: number; closed: number; skipped: number; error?: string; seconds: number;
};

const rank = (s: string) => {
  const i = PRECEDENCE.indexOf(s);
  return i < 0 ? 99 : i;
};

const running = new Set<string>();

/** Insert or refresh one posting and attach it to a duplicate cluster (REC-08). */
async function upsertPosting(p: RawPosting): Promise<"created" | "updated"> {
  const board = p.board ?? "";
  const d = derive(p);
  const now = new Date();
  const [existing] = await db
    .select({ id: postings.id, jobId: postings.jobId })
    .from(postings)
    .where(and(eq(postings.sourceId, p.sourceId), eq(postings.board, board), eq(postings.sourceJobId, p.sourceJobId)))
    .limit(1);

  if (existing) {
    await db
      .update(postings)
      .set({ url: p.url, applyUrl: p.applyUrl, title: p.title, company: p.company, raw: p.raw as object, sourcePostedAt: p.postedAt ?? null, expiresAt: p.expiresAt ?? null, lastSeen: now, missedFetches: 0, closedAt: null })
      .where(eq(postings.id, existing.id));
    const [job] = await db.select({ canonicalPostingId: jobs.canonicalPostingId }).from(jobs).where(eq(jobs.id, existing.jobId));
    const refresh = job?.canonicalPostingId === existing.id ? { ...jobColumns(d), applyUrl: p.applyUrl, expiresAt: p.expiresAt ?? null } : {};
    await db.update(jobs).set({ ...refresh, lastSeen: now, status: "live", closedAt: null }).where(eq(jobs.id, existing.jobId));
    return "updated";
  }

  const matchKey = matchKeyOf(d.company, d.title);
  const employer = isEmployerSource(p.sourceId);
  const candidates = await db
    .select({ id: jobs.id, clusterKey: jobs.clusterKey, canonicalSource: jobs.canonicalSource, eligibility: jobs.eligibility, sourcePostedAt: jobs.sourcePostedAt })
    .from(jobs)
    .where(and(eq(jobs.matchKey, matchKey), eq(jobs.status, "live")))
    .limit(5);

  let target: (typeof candidates)[number] | undefined;
  if (employer) {
    // Different requisition IDs are never merged; an ATS posting only joins an aggregator-only cluster.
    const aggOnly = candidates.filter((c) => !isEmployerSource(c.canonicalSource));
    if (aggOnly.length === 1) target = aggOnly[0];
  } else if (candidates.length === 1) {
    target = candidates[0];
  } else if (candidates.length > 1) {
    target = candidates.find((c) => c.clusterKey === `agg:${matchKey}`) ?? candidates.find((c) => isEmployerSource(c.canonicalSource));
  }

  let jobId: number;
  if (target) {
    jobId = target.id;
    // Same source, new id, same role: the employer re-posted it (REC-06).
    const [same] = await db.select({ n: sql<number>`count(*)::int` }).from(postings).where(and(eq(postings.jobId, target.id), eq(postings.sourceId, p.sourceId)));
    if (same.n > 0) await db.update(jobs).set({ repostCount: sql`${jobs.repostCount} + 1` }).where(eq(jobs.id, target.id));
  } else {
    // A role returning after a confirmed closure: "Reopened" if >14 days later, otherwise a repost.
    const [prev] = await db
      .select({ closedAt: jobs.closedAt, repostCount: jobs.repostCount })
      .from(jobs)
      .where(and(eq(jobs.matchKey, matchKey), eq(jobs.status, "closed")))
      .orderBy(desc(jobs.closedAt))
      .limit(1);
    const history = prev?.closedAt
      ? now.getTime() - prev.closedAt.getTime() > 14 * 86_400_000
        ? { reopenedAt: now }
        : { repostCount: prev.repostCount + 1 }
      : {};
    const clusterKey = employer ? `${p.sourceId}:${board}:${p.sourceJobId}` : `agg:${matchKey}`;
    const inserted = await db
      .insert(jobs)
      .values({ clusterKey, matchKey, ...jobColumns(d), canonicalSource: p.sourceId, applyUrl: p.applyUrl, sourcePostedAt: p.postedAt ?? null, expiresAt: p.expiresAt ?? null, ...history })
      .onConflictDoUpdate({ target: jobs.clusterKey, set: { lastSeen: now, status: "live", closedAt: null, ...history } })
      .returning({ id: jobs.id });
    jobId = inserted[0].id;
  }

  const [posting] = await db
    .insert(postings)
    .values({ sourceId: p.sourceId, board, sourceJobId: p.sourceJobId, jobId, url: p.url, applyUrl: p.applyUrl, title: p.title, company: p.company, raw: p.raw as object, sourcePostedAt: p.postedAt ?? null, expiresAt: p.expiresAt ?? null })
    .returning({ id: postings.id });

  if (!target) {
    await db.update(jobs).set({ canonicalPostingId: posting.id }).where(eq(jobs.id, jobId));
  } else {
    const earliest = [target.sourcePostedAt, p.postedAt ?? null].filter(Boolean).sort((a, b) => a!.getTime() - b!.getTime())[0] ?? null;
    if (rank(p.sourceId) < rank(target.canonicalSource)) {
      // Higher-precedence source (employer ATS first) becomes the card, but keep the most restrictive eligibility.
      const cols = jobColumns(d);
      if (moreRestrictive(target.eligibility, d.eligibility)) {
        const v = verdictFor(target.eligibility, DEFAULT_VIEWER);
        Object.assign(cols, { eligibility: target.eligibility, verdict: v.verdict, verdictReason: v.reason, verdictQuote: v.quote, verdictNote: v.note, overlap: v.overlap });
      }
      await db.update(jobs).set({ ...cols, canonicalPostingId: posting.id, canonicalSource: p.sourceId, applyUrl: p.applyUrl, sourcePostedAt: earliest, lastSeen: now }).where(eq(jobs.id, jobId));
    } else {
      const set: Partial<typeof jobs.$inferInsert> = { sourcePostedAt: earliest, lastSeen: now };
      if (moreRestrictive(d.eligibility, target.eligibility)) Object.assign(set, { eligibility: d.eligibility, verdict: d.verdict.verdict, verdictReason: d.verdict.reason, verdictQuote: d.verdict.quote, verdictNote: d.verdict.note, overlap: d.verdict.overlap });
      await db.update(jobs).set(set).where(eq(jobs.id, jobId));
    }
  }
  return "created";
}

/** A job is closed when every posting of its cluster is closed (REC-02). */
async function refreshJobStatuses(): Promise<number> {
  const closed = await db.execute(sql`
    update jobs set status = 'closed', closed_at = now()
    where status = 'live' and not exists (select 1 from postings p where p.job_id = jobs.id and p.closed_at is null)
    returning id`);
  await db.execute(sql`
    update jobs set status = 'live', closed_at = null
    where status = 'closed' and exists (select 1 from postings p where p.job_id = jobs.id and p.closed_at is null)`);
  return closed.length;
}

export async function runSource(adapter: SourceAdapter, log: (m: string) => void = console.log): Promise<RunSummary> {
  if (running.has(adapter.id)) throw new Error(`${adapter.id} is already running`);
  running.add(adapter.id);
  const started = new Date();
  const ctx = { log: (m: string) => log(`[${adapter.id}] ${m}`), country: DEFAULT_VIEWER.country, stats: { requests: 0 } };
  const s: RunSummary = { source: adapter.id, ok: false, requests: 0, fetched: 0, created: 0, updated: 0, closed: 0, skipped: 0, seconds: 0 };
  await db.insert(sources).values({ id: adapter.id, name: adapter.name, homepage: adapter.homepage }).onConflictDoUpdate({ target: sources.id, set: { name: adapter.name, homepage: adapter.homepage } });
  const [run] = await db.insert(ingestRuns).values({ sourceId: adapter.id }).returning({ id: ingestRuns.id });
  try {
    for await (const batch of adapter.fetch(ctx)) {
      s.skipped += batch.skipped ?? 0;
      for (const p of batch.postings) {
        s.fetched++;
        try {
          s[await upsertPosting(p)]++;
        } catch (e) {
          ctx.log(`posting ${p.sourceJobId} failed: ${(e as Error).message}`);
        }
      }
      if (batch.complete && batch.board != null) {
        // Closure by absence: only for complete, successful board fetches; never on errors.
        await db.update(postings).set({ missedFetches: sql`${postings.missedFetches} + 1` })
          .where(and(eq(postings.sourceId, adapter.id), eq(postings.board, batch.board), lt(postings.lastSeen, started), isNull(postings.closedAt)));
        await db.update(postings).set({ closedAt: new Date() })
          .where(and(eq(postings.sourceId, adapter.id), eq(postings.board, batch.board), sql`${postings.missedFetches} >= 2`, isNull(postings.closedAt)));
      }
      if (s.fetched % 500 < batch.postings.length) ctx.log(`${s.fetched} fetched (${s.created} new)`);
    }
    // Feeds that aren't complete lists: ask the source about postings we didn't see this run.
    if (adapter.closeCheck) {
      const stale = await db
        .select({ sourceJobId: postings.sourceJobId, url: postings.url })
        .from(postings)
        .where(and(eq(postings.sourceId, adapter.id), isNull(postings.closedAt), lt(postings.lastSeen, started)))
        .orderBy(asc(postings.lastSeen))
        .limit(500);
      if (stale.length) {
        const ids = await adapter.closeCheck(ctx, stale);
        if (ids.length) await db.update(postings).set({ closedAt: new Date() }).where(and(eq(postings.sourceId, adapter.id), inArray(postings.sourceJobId, ids)));
        ctx.log(`status check: ${stale.length} unseen postings checked, ${ids.length} closed`);
      }
    }
    // Expired jobs come down (Himalayas terms; past validThrough-style dates).
    await db.update(postings).set({ closedAt: new Date() }).where(and(lt(postings.expiresAt, new Date()), isNull(postings.closedAt)));
    s.closed = await refreshJobStatuses();
    s.ok = true;
    // Keep the owner's matches current with the new jobs (no-op without a profile).
    const { recomputeMatches } = await import("../matching");
    await recomputeMatches().then((n) => n && ctx.log(`matches recomputed: ${n}`)).catch((e) => ctx.log(`match recompute failed: ${(e as Error).message}`));
  } catch (e) {
    s.error = (e as Error).message;
    ctx.log(`failed: ${s.error}`);
  } finally {
    running.delete(adapter.id);
    s.requests = ctx.stats.requests;
    s.seconds = Math.round((Date.now() - started.getTime()) / 1000);
    await db.update(ingestRuns).set({ finishedAt: new Date(), ok: s.ok, requests: s.requests, fetched: s.fetched, created: s.created, updated: s.updated, closed: s.closed, skipped: s.skipped, error: s.error ?? null }).where(eq(ingestRuns.id, run.id));
    await db.update(sources).set({ lastRunAt: new Date(), lastOk: s.ok, lastFetched: s.fetched, lastError: s.error ?? null }).where(eq(sources.id, adapter.id));
  }
  return s;
}

export async function runAll(ids?: string[], log: (m: string) => void = console.log): Promise<RunSummary[]> {
  const list = ids?.length ? ids.map((id) => sourceById(id)).filter((x): x is SourceAdapter => !!x) : SOURCES;
  const out: RunSummary[] = [];
  for (const a of list) out.push(await runSource(a, log));
  return out;
}

export const isRunning = (id: string) => running.has(id);
