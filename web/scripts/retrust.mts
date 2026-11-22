/** Recompute trust labels for every job from its stored text (after a rule change). `npm run retrust` */
import "dotenv/config";

const { db, client } = await import("../src/server/db");
const { jobs } = await import("../src/server/db/schema");
const { trustLabels } = await import("../src/server/lib/trust");
const { isEmployerSource, sourceById } = await import("../src/server/sources");
const { eq } = await import("drizzle-orm");

const rows = await db.select({ id: jobs.id, text: jobs.descriptionText, src: jobs.canonicalSource, min: jobs.salaryMin, max: jobs.salaryMax }).from(jobs);
let flagged = 0;
for (const r of rows) {
  const trust = trustLabels({ text: r.text, isEmployerAts: isEmployerSource(r.src), atsName: sourceById(r.src)?.atsName ?? null, hasSalary: r.min != null || r.max != null });
  if (trust.some((t) => t.kind === "possible_scam")) flagged++;
  await db.update(jobs).set({ trust }).where(eq(jobs.id, r.id));
}
console.log(`re-labelled ${rows.length} jobs; ${flagged} flagged as possible scams`);
await client.end();
