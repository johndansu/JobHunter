import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "../db";
import { atsBoards, boardProbes } from "../db/schema";
import { normCompany, normTitle } from "../lib/normalize";
import { sleep } from "../sources/http";

/**
 * Find employers' own ATS boards for companies we already see in aggregated feeds (§6.2).
 * Only documented public read endpoints are used, and a board is accepted only with
 * evidence it belongs to that company: the board's company name matches, or one of the
 * company's known job titles is on it. Each company is tried at most once a month.
 */

const UA = process.env.USER_AGENT || "JobHunter/2.0";

async function get(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function slugsFor(name: string): string[] {
  const words = normCompany(name).split(" ").filter(Boolean);
  if (!words.length) return [];
  const out = [words.join(""), words.join("-"), words[0]].filter((s) => /^[a-z0-9-]{2,40}$/.test(s));
  return [...new Set(out)].slice(0, 3);
}

type Found = { ats: "greenhouse" | "lever" | "ashby"; token: string; jobs: number; evidence: string };

async function probe(slug: string, company: string, titles: Set<string>): Promise<Found | null> {
  const titleHit = (list: string[]) => list.find((t) => titles.has(normTitle(t)));

  const gh = (await get(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`)) as { jobs?: { title: string; company_name?: string }[] } | null;
  if (gh?.jobs?.length) {
    const nameOk = gh.jobs.some((j) => j.company_name && normCompany(j.company_name) === normCompany(company));
    const hit = titleHit(gh.jobs.map((j) => j.title));
    if (nameOk || hit) return { ats: "greenhouse", token: slug, jobs: gh.jobs.length, evidence: nameOk ? "board's company name matches" : `job "${hit}" is on the board` };
  }
  await sleep(250);
  const lv = (await get(`https://api.lever.co/v0/postings/${slug}?mode=json&limit=200`)) as { text: string }[] | null;
  if (Array.isArray(lv) && lv.length) {
    const hit = titleHit(lv.map((j) => j.text));
    if (hit) return { ats: "lever", token: slug, jobs: lv.length, evidence: `job "${hit}" is on the board` };
  }
  await sleep(250);
  const ab = (await get(`https://api.ashbyhq.com/posting-api/job-board/${slug}`)) as { jobs?: { title: string }[] } | null;
  if (ab?.jobs?.length) {
    const hit = titleHit(ab.jobs.map((j) => j.title));
    if (hit) return { ats: "ashby", token: slug, jobs: ab.jobs.length, evidence: `job "${hit}" is on the board` };
  }
  return null;
}

export async function discoverBoards(opts: { limit?: number; log?: (m: string) => void } = {}) {
  const limit = opts.limit ?? 100;
  const log = opts.log ?? console.log;
  // Companies seen only through aggregators, most jobs first.
  const companies = (await db.execute(sql`
    select company, count(*)::int n, array_agg(distinct title) titles
    from jobs
    where status = 'live' and canonical_source not in ('greenhouse', 'lever', 'ashby')
    group by company
    order by count(*) desc
    limit 3000`)) as unknown as { company: string; n: number; titles: string[] }[];

  const known = new Set((await db.select({ name: atsBoards.name }).from(atsBoards)).map((r) => normCompany(r.name)));
  const recent = new Set(
    (await db.select({ k: boardProbes.nameKey }).from(boardProbes).where(gt(boardProbes.triedAt, sql`now() - interval '30 days'`))).map((r) => r.k),
  );

  const found: (Found & { company: string })[] = [];
  let tried = 0;
  for (const c of companies) {
    if (tried >= limit) break;
    const key = normCompany(c.company);
    if (!key || known.has(key) || recent.has(key)) continue;
    tried++;
    const titles = new Set(c.titles.map(normTitle));
    let hit: Found | null = null;
    for (const slug of slugsFor(c.company)) {
      hit = await probe(slug, c.company, titles);
      if (hit) break;
      await sleep(250);
    }
    await db.insert(boardProbes).values({ nameKey: key, found: !!hit }).onConflictDoUpdate({ target: boardProbes.nameKey, set: { triedAt: new Date(), found: !!hit } });
    if (hit) {
      const exists = await db.select({ id: atsBoards.id }).from(atsBoards).where(and(eq(atsBoards.ats, hit.ats), eq(atsBoards.token, hit.token)));
      if (!exists.length) {
        await db.insert(atsBoards).values({ ats: hit.ats, token: hit.token, name: c.company, origin: "discovered", evidence: hit.evidence, jobs: hit.jobs });
        found.push({ ...hit, company: c.company });
        log(`found ${hit.ats}/${hit.token} for ${c.company} (${hit.jobs} jobs; ${hit.evidence})`);
      }
    }
  }
  return { tried, found };
}
