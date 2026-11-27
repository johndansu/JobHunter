import { makeSalary } from "../lib/salary";
import { decodeEntities } from "../lib/text";
import { getJson, HttpError, sleep } from "./http";
import type { Batch, FetchContext, RawPosting, SourceAdapter } from "./types";

/**
 * Employers' own ATS job boards (§6.2): documented, unauthenticated read APIs.
 * Each board fetch is the employer's complete published list, so a job missing
 * from two consecutive successful fetches is treated as closed (REC-02).
 * Only remote jobs are kept; hybrid/onsite are skipped (counted as skipped).
 */

type Board = { token: string; name: string };

// Validated live on 2026-11-22. Grow this list via discovery from apply links (Phase 1 follow-up).
export const GREENHOUSE_BOARDS: Board[] = [
  ["gitlab", "GitLab"], ["cloudflare", "Cloudflare"], ["stripe", "Stripe"], ["airbnb", "Airbnb"],
  ["coinbase", "Coinbase"], ["dropbox", "Dropbox"], ["figma", "Figma"], ["reddit", "Reddit"],
  ["discord", "Discord"], ["twilio", "Twilio"], ["datadog", "Datadog"], ["elastic", "Elastic"],
  ["mongodb", "MongoDB"], ["okta", "Okta"], ["gusto", "Gusto"], ["instacart", "Instacart"],
  ["canonical", "Canonical"], ["wikimedia", "Wikimedia Foundation"], ["mozilla", "Mozilla"],
  ["grafanalabs", "Grafana Labs"], ["vercel", "Vercel"], ["intercom", "Intercom"],
  ["planetscale", "PlanetScale"], ["fleetio", "Fleetio"],
].map(([token, name]) => ({ token, name }));

export const LEVER_BOARDS: Board[] = [
  ["spotify", "Spotify"], ["palantir", "Palantir"], ["binance", "Binance"], ["outreach", "Outreach"], ["zoox", "Zoox"],
].map(([token, name]) => ({ token, name }));

export const ASHBY_BOARDS: Board[] = [
  ["ashby", "Ashby"], ["linear", "Linear"], ["notion", "Notion"], ["ramp", "Ramp"], ["zapier", "Zapier"],
  ["posthog", "PostHog"], ["supabase", "Supabase"], ["clerk", "Clerk"], ["openai", "OpenAI"], ["replit", "Replit"],
  ["vanta", "Vanta"], ["1password", "1Password"], ["cursor", "Cursor"], ["oyster", "Oyster"], ["hopper", "Hopper"],
  ["sanity", "Sanity"], ["n8n", "n8n"], ["lemfi", "LemFi"], ["andela", "Andela"],
].map(([token, name]) => ({ token, name }));

const REMOTE_RE = /\b(remote|anywhere|worldwide|distributed|work from home|wfh)\b/i;

/** Seeds plus boards found by discovery (npm run discover). Deactivated boards are skipped. */
async function loadBoards(ats: string, seeds: Board[]): Promise<Board[]> {
  const { db } = await import("../db");
  const { atsBoards } = await import("../db/schema");
  const { eq } = await import("drizzle-orm");
  const rows = await db.select().from(atsBoards).where(eq(atsBoards.ats, ats));
  const byToken = new Map(rows.map((r) => [r.token, r]));
  for (const s of seeds)
    if (!byToken.has(s.token)) await db.insert(atsBoards).values({ ats, token: s.token, name: s.name, origin: "seed", evidence: "hand-checked 2026-11-22" }).onConflictDoNothing();
  return [
    ...seeds.filter((s) => byToken.get(s.token)?.active !== false),
    ...rows.filter((r) => r.origin === "discovered" && r.active).map((r) => ({ token: r.token, name: r.name })),
  ];
}

export async function* eachBoard(
  ctx: FetchContext,
  boards: Board[],
  load: (b: Board) => Promise<{ postings: RawPosting[]; skipped: number }>,
): AsyncGenerator<Batch> {
  for (const b of boards) {
    try {
      const { postings, skipped } = await load(b);
      yield { board: b.token, postings, complete: true, skipped };
    } catch (e) {
      // A board that 404s is reported, not treated as "all jobs closed".
      ctx.log(`board ${b.token}: ${e instanceof HttpError ? e.message : String(e)}`);
    }
    await sleep(400 + Math.random() * 600); // jitter between boards
  }
}

// --- Greenhouse -------------------------------------------------------------
type GhJob = {
  id: number; title: string; absolute_url: string; location?: { name?: string }; content?: string;
  updated_at?: string; first_published?: string; company_name?: string;
  offices?: { name?: string }[]; departments?: { name?: string }[];
};

export const greenhouse: SourceAdapter = {
  id: "greenhouse",
  name: "Greenhouse boards",
  homepage: "https://www.greenhouse.com",
  attribution: { text: "from the employer's Greenhouse board", url: "https://www.greenhouse.com" },
  isEmployerAts: true,
  atsName: "Greenhouse",
  everyHours: 12,
  async *fetch(ctx) {
    yield* eachBoard(ctx, await loadBoards("greenhouse", GREENHOUSE_BOARDS), async (b) => {
      const r = await getJson<{ jobs: GhJob[] }>(ctx, `https://boards-api.greenhouse.io/v1/boards/${b.token}/jobs?content=true`);
      let skipped = 0;
      const postings: RawPosting[] = [];
      for (const j of r.jobs ?? []) {
        const loc = j.location?.name ?? "";
        if (!REMOTE_RE.test(loc)) { skipped++; continue; }
        postings.push({
          sourceId: "greenhouse",
          board: b.token,
          sourceJobId: String(j.id),
          url: j.absolute_url,
          applyUrl: j.absolute_url,
          title: j.title,
          company: j.company_name || b.name,
          descriptionHtml: decodeEntities(j.content ?? ""),
          locationText: loc,
          categoryHints: (j.departments ?? []).map((d) => d.name ?? ""),
          postedAt: j.first_published ? new Date(j.first_published) : null,
          raw: { ...j, content: undefined },
        });
      }
      return { postings, skipped };
    });
  },
};

// --- Lever ------------------------------------------------------------------
type LeverJob = {
  id: string; text: string; hostedUrl: string; applyUrl: string; createdAt?: number;
  categories?: { location?: string; commitment?: string; team?: string; department?: string; allLocations?: string[] };
  country?: string | null; workplaceType?: string; description?: string; descriptionPlain?: string;
  lists?: { text: string; content: string }[]; additional?: string;
  salaryRange?: { min?: number; max?: number; currency?: string; interval?: string } | null;
};

export const lever: SourceAdapter = {
  id: "lever",
  name: "Lever boards",
  homepage: "https://www.lever.co",
  attribution: { text: "from the employer's Lever board", url: "https://www.lever.co" },
  isEmployerAts: true,
  atsName: "Lever",
  everyHours: 12,
  async *fetch(ctx) {
    yield* eachBoard(ctx, await loadBoards("lever", LEVER_BOARDS), async (b) => {
      const r = await getJson<LeverJob[]>(ctx, `https://api.lever.co/v0/postings/${b.token}?mode=json`);
      let skipped = 0;
      const postings: RawPosting[] = [];
      for (const j of r ?? []) {
        const loc = j.categories?.location ?? "";
        const remote = j.workplaceType ? j.workplaceType === "remote" : REMOTE_RE.test(loc);
        if (!remote) { skipped++; continue; }
        const html = [j.description ?? "", ...(j.lists ?? []).map((l) => `<h3>${l.text}</h3><ul>${l.content}</ul>`), j.additional ?? ""].join("\n");
        postings.push({
          sourceId: "lever",
          board: b.token,
          sourceJobId: j.id,
          url: j.hostedUrl,
          applyUrl: j.applyUrl || j.hostedUrl,
          title: j.text,
          company: b.name,
          descriptionHtml: html,
          locationText: [loc, ...(j.categories?.allLocations ?? [])].filter(Boolean).join("; "),
          fieldCountries: j.country ? [j.country] : [],
          fieldEvidence: j.country ? `Lever lists the job country as ${j.country}` : undefined,
          categoryHints: [j.categories?.team ?? "", j.categories?.department ?? ""],
          employmentType: j.categories?.commitment ?? null,
          salary: j.salaryRange ? makeSalary(j.salaryRange.min, j.salaryRange.max, j.salaryRange.currency, j.salaryRange.interval) : null,
          postedAt: j.createdAt ? new Date(j.createdAt) : null,
          raw: { ...j, description: undefined, descriptionPlain: undefined, lists: undefined, additional: undefined },
        });
      }
      return { postings, skipped };
    });
  },
};

// --- Ashby ------------------------------------------------------------------
type AshbyJob = {
  id: string; title: string; department?: string; team?: string; employmentType?: string; location?: string;
  secondaryLocations?: { location?: string; address?: { postalAddress?: { addressCountry?: string } } }[];
  publishedAt?: string; isListed?: boolean; isRemote?: boolean; workplaceType?: string;
  address?: { postalAddress?: { addressCountry?: string } };
  jobUrl: string; applyUrl: string; descriptionHtml?: string;
  compensation?: { summaryComponents?: { compensationType?: string; interval?: string; currencyCode?: string | null; minValue?: number | null; maxValue?: number | null }[] };
};

export const ashby: SourceAdapter = {
  id: "ashby",
  name: "Ashby boards",
  homepage: "https://www.ashbyhq.com",
  attribution: { text: "from the employer's Ashby board", url: "https://www.ashbyhq.com" },
  isEmployerAts: true,
  atsName: "Ashby",
  everyHours: 12,
  async *fetch(ctx) {
    yield* eachBoard(ctx, await loadBoards("ashby", ASHBY_BOARDS), async (b) => {
      const r = await getJson<{ jobs: AshbyJob[] }>(ctx, `https://api.ashbyhq.com/posting-api/job-board/${b.token}?includeCompensation=true`);
      let skipped = 0;
      const postings: RawPosting[] = [];
      for (const j of r.jobs ?? []) {
        // isRemote is true for remote OR hybrid; workplaceType is the real signal. Respect isListed:false.
        if (j.isListed === false || j.workplaceType !== "Remote") { skipped++; continue; }
        const countries = [j.address?.postalAddress?.addressCountry, ...(j.secondaryLocations ?? []).map((s) => s.address?.postalAddress?.addressCountry)];
        const pay = j.compensation?.summaryComponents?.find((c) => c.compensationType === "Salary");
        postings.push({
          sourceId: "ashby",
          board: b.token,
          sourceJobId: j.id,
          url: j.jobUrl,
          applyUrl: j.applyUrl || j.jobUrl,
          title: j.title,
          company: b.name,
          descriptionHtml: j.descriptionHtml ?? "",
          locationText: [j.location, ...(j.secondaryLocations ?? []).map((s) => s.location)].filter(Boolean).join("; "),
          fieldCountries: countries,
          fieldEvidence: `Ashby locations: ${[j.location, ...(j.secondaryLocations ?? []).map((s) => s.location)].filter(Boolean).slice(0, 8).join(", ")}`,
          categoryHints: [j.department ?? "", j.team ?? ""],
          employmentType: j.employmentType ?? null,
          salary: pay ? makeSalary(pay.minValue, pay.maxValue, pay.currencyCode, pay.interval) : null,
          postedAt: j.publishedAt ? new Date(j.publishedAt) : null,
          raw: { ...j, descriptionHtml: undefined },
        });
      }
      return { postings, skipped };
    });
  },
};
