/**
 * Phase 1 compliance check against a running app (default http://localhost:3000).
 * For a sample of jobs from every source it verifies, on the rendered job page:
 *  - the Apply button's href is exactly the apply link the source gave us (unchanged, no affiliate wrapping);
 *  - the "via" credit links to the source's own posting with a followed link (no nofollow);
 *  - RemoteJobs.org's "Powered by RemoteJobs.org" link is present site-wide.
 * Also checks every live job traces to a stored source posting.
 * `npm run check:compliance -- http://localhost:3100`
 */
import "dotenv/config";

const base = process.argv[2] || "http://localhost:3000";
const { db, client } = await import("../src/server/db");
const { jobs, postings } = await import("../src/server/db/schema");
const { SOURCES } = await import("../src/server/sources");
const { and, eq, isNull, sql } = await import("drizzle-orm");

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
const failures: string[] = [];
let checked = 0;

const [orphans] = await db.select({ n: sql<number>`count(*)::int` }).from(jobs)
  .where(and(eq(jobs.status, "live"), sql`not exists (select 1 from postings p where p.job_id = ${jobs.id})`));
if (orphans.n) failures.push(`${orphans.n} live jobs have no source posting`);

for (const s of SOURCES) {
  const sample = await db
    .select({ id: jobs.id, applyUrl: jobs.applyUrl, url: postings.url, postingApply: postings.applyUrl })
    .from(jobs)
    .innerJoin(postings, eq(postings.id, jobs.canonicalPostingId))
    .where(and(eq(jobs.canonicalSource, s.id), eq(jobs.status, "live"), isNull(postings.closedAt)))
    .orderBy(sql`random()`)
    .limit(5);
  for (const j of sample) {
    const html = await (await fetch(`${base}/jobs/${j.id}`)).text();
    checked++;
    if (j.applyUrl !== j.postingApply) failures.push(`${s.id} job ${j.id}: stored apply URL differs from the source's`);
    const anchors = [...html.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>/g)].map((m) => ({ href: decode(m[1]), tag: m[0] }));
    const apply = anchors.find((a) => a.href === j.applyUrl);
    if (!apply) failures.push(`${s.id} job ${j.id}: no link with the source's exact apply URL`);
    const credit = anchors.find((a) => a.href === j.url);
    if (!credit) failures.push(`${s.id} job ${j.id}: no "via" link to the source posting`);
    else if (/nofollow/.test(credit.tag)) failures.push(`${s.id} job ${j.id}: source link is nofollow`);
    if (s.id === "remotejobs" && !/href="https:\/\/remotejobs\.org"[^>]*>Powered by RemoteJobs\.org/.test(html))
      failures.push(`remotejobs job ${j.id}: missing "Powered by RemoteJobs.org" link`);
  }
  console.log(`${s.id}: checked ${sample.length} job pages`);
}

console.log(failures.length ? `\nFAIL (${failures.length}):\n- ${failures.join("\n- ")}` : `\nPASS: ${checked} pages, every source compliant; 0 orphan listings`);
await client.end();
process.exit(failures.length ? 1 : 0);
