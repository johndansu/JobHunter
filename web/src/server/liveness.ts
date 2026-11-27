import { eq } from "drizzle-orm";
import { db } from "./db";
import { jobs, postings } from "./db/schema";

const UA = process.env.USER_AGENT || "JobHunter/2.0";
const STALE_MS = 6 * 3600_000;

/** Documented single-job endpoints only (no page scraping). Returns null when we can't tell. */
function statusUrl(p: { sourceId: string; board: string; sourceJobId: string; url: string }): string | null {
  if (p.sourceId === "himalayas") {
    const m = p.url.match(/\/companies\/([^/]+)\/jobs\/([^/?#]+)/);
    return m ? `https://himalayas.app/jobs/api/companies/${m[1]}/jobs/${m[2]}` : null;
  }
  if (p.sourceId === "greenhouse") return `https://boards-api.greenhouse.io/v1/boards/${p.board}/jobs/${p.sourceJobId}`;
  if (p.sourceId === "lever") return `https://api.lever.co/v0/postings/${p.board}/${p.sourceJobId}`;
  return null;
}

/**
 * Re-check a job when it's opened (REC-03). 404/410 closes the posting; timeouts,
 * 429 and 5xx never do. Returns the time of the last successful check.
 */
export async function checkLiveness(jobId: number, lastChecked: Date | null): Promise<Date | null> {
  if (lastChecked && Date.now() - lastChecked.getTime() < STALE_MS) return lastChecked;
  const posts = await db.select().from(postings).where(eq(postings.jobId, jobId));
  let checked = false;
  for (const p of posts) {
    if (p.closedAt) continue;
    const url = statusUrl(p);
    if (!url) continue;
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(5000) });
      if (res.status === 404 || res.status === 410) {
        await db.update(postings).set({ closedAt: new Date() }).where(eq(postings.id, p.id));
        checked = true;
      } else if (res.ok) checked = true;
    } catch {
      // network trouble: unknown, not closed
    }
  }
  if (!checked) return lastChecked;
  const now = new Date();
  const open = (await db.select({ closedAt: postings.closedAt }).from(postings).where(eq(postings.jobId, jobId))).some((p) => !p.closedAt);
  await db.update(jobs).set({ lastChecked: now, ...(open ? {} : { status: "closed", closedAt: now }) }).where(eq(jobs.id, jobId));
  return now;
}
