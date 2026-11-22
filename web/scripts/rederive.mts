/**
 * Recompute job fields (eligibility, verdicts, categories, labels) from stored raw postings
 * after a parser change, without re-fetching anything. `npm run rederive -- himalayas remotejobs`
 */
import "dotenv/config";

const ids = process.argv.slice(2).length ? process.argv.slice(2) : ["himalayas", "remotejobs"];
const { db, client } = await import("../src/server/db");
const { jobs, postings } = await import("../src/server/db/schema");
const { himPosting, rjPosting } = await import("../src/server/sources/feeds");
const { derive, jobColumns } = await import("../src/server/ingest/derive");
const { and, eq, inArray } = await import("drizzle-orm");

const mappers: Record<string, (raw: never) => import("../src/server/sources/types").RawPosting> = {
  himalayas: himPosting as never,
  remotejobs: rjPosting as never,
};

let n = 0;
for (const source of ids.filter((s) => mappers[s])) {
  const rows = await db
    .select({ jobId: jobs.id, raw: postings.raw })
    .from(jobs)
    .innerJoin(postings, eq(postings.id, jobs.canonicalPostingId))
    .where(and(eq(jobs.canonicalSource, source), inArray(jobs.status, ["live"])));
  for (const r of rows) {
    const d = derive(mappers[source](r.raw as never));
    await db.update(jobs).set(jobColumns(d)).where(eq(jobs.id, r.jobId));
    n++;
  }
  console.log(`${source}: re-derived ${rows.length} jobs`);
}
console.log(`done: ${n} jobs`);
await client.end();
