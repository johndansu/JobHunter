/** Extract requirement records for every job from its stored text. `npm run backfill:requirements` */
import "dotenv/config";

const { db, client } = await import("../src/server/db");
const { jobs } = await import("../src/server/db/schema");
const { extractRequirements } = await import("../src/server/lib/requirements");
const { eq } = await import("drizzle-orm");

const rows = await db.select({ id: jobs.id, title: jobs.title, text: jobs.descriptionText }).from(jobs);
const t0 = performance.now();
let withSkills = 0;
for (const r of rows) {
  const req = extractRequirements(r.title, r.text);
  if (req.skills.length) withSkills++;
  await db.update(jobs).set({ requirements: req }).where(eq(jobs.id, r.id));
}
console.log(`${rows.length} jobs in ${Math.round((performance.now() - t0) / 1000)}s; ${withSkills} have recognised skills`);
const { recomputeMatches } = await import("../src/server/matching");
console.log(`matches: ${await recomputeMatches()}`);
await client.end();
