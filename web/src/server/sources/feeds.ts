import { makeSalary } from "../lib/salary";
import { domainOf } from "../lib/normalize";
import { getJson, sleep } from "./http";
import type { Batch, FetchContext, RawPosting, SourceAdapter } from "./types";

const date = (v: unknown): Date | null => {
  if (v == null || v === "") return null;
  const d = typeof v === "number" ? new Date(v < 1e12 ? v * 1000 : v) : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
};
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

// ---------------------------------------------------------------------------
// Himalayas — terms: Apply must use applicationLink unchanged; visible credit
// linking to the job on Himalayas; no onward syndication or JobPosting markup;
// remove expired jobs. Data refreshes daily.
// ---------------------------------------------------------------------------
type HimJob = {
  title: string; companyName: string; companySlug?: string; employmentType?: string;
  minSalary?: number | null; maxSalary?: number | null; salaryPeriod?: string | null; currency?: string | null;
  seniority?: string[]; locationRestrictions?: string[]; timezoneRestrictions?: number[];
  categories?: string[]; parentCategories?: string[]; description: string; excerpt?: string;
  pubDate?: number; expiryDate?: number; applicationLink: string; guid: string;
};

export function himPosting(j: HimJob): RawPosting {
  const restr = j.locationRestrictions ?? [];
  return {
    sourceId: "himalayas",
    board: null,
    sourceJobId: j.guid,
    url: j.guid,
    applyUrl: j.applicationLink,
    title: j.title,
    company: j.companyName,
    descriptionHtml: j.description ?? "",
    fieldCountries: restr,
    fieldWorldwide: restr.length === 0,
    fieldTzOffsetsHours: j.timezoneRestrictions ?? [],
    fieldEvidence: restr.length
      ? `Himalayas location restrictions: ${restr.length > 8 ? `${restr.slice(0, 8).join(", ")} and ${restr.length - 8} more` : restr.join(", ")}`
      : "Himalayas lists no location restriction",
    categoryHints: [...(j.parentCategories ?? []), ...(j.categories ?? [])],
    seniorityHints: j.seniority ?? [],
    employmentType: j.employmentType ?? null,
    salary: makeSalary(j.minSalary, j.maxSalary, j.currency, j.salaryPeriod),
    postedAt: date(j.pubDate),
    expiresAt: date(j.expiryDate),
    raw: j,
  };
}

export const himalayas: SourceAdapter = {
  id: "himalayas",
  name: "Himalayas",
  homepage: "https://himalayas.app",
  attribution: { text: "via Himalayas", url: "https://himalayas.app" },
  isEmployerAts: false,
  everyHours: 6,
  async *fetch(ctx: FetchContext) {
    const key = process.env.HIMALAYAS_API_KEY;
    const headers: Record<string, string> = key ? { Authorization: `Bearer ${key}` } : {};
    const pause = key ? 1100 : 2500; // stay well inside the shared public allowance
    // 1) Every job open to the viewer's country (search has no cursor; 20 per page).
    for (let page = 1; page <= 150; page++) {
      const r = await getJson<{ jobs: HimJob[] }>(ctx, `https://himalayas.app/jobs/api/search?country=${ctx.country}&sort=recent&page=${page}`, { headers });
      if (!r.jobs?.length) break;
      yield { board: null, postings: r.jobs.map(himPosting), complete: false };
      if (r.jobs.length < 20) break;
      await sleep(pause);
    }
    // 2) The most recently updated part of the full feed (cursor paging).
    let cursor: string | undefined;
    const pages = Number(process.env.HIMALAYAS_BROWSE_PAGES || 100);
    for (let i = 0; i < pages; i++) {
      const url = `https://himalayas.app/jobs/api?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
      const r = await getJson<{ jobs: HimJob[]; nextCursor?: string }>(ctx, url, { headers });
      if (!r.jobs?.length) break;
      yield { board: null, postings: r.jobs.map(himPosting), complete: false };
      if (!r.nextCursor) break;
      cursor = r.nextCursor;
      await sleep(pause);
    }
  },
  // Single-job status: 200 open, 410 closed, 404 not found. Capped per run to stay polite.
  async closeCheck(ctx, list) {
    const closed: string[] = [];
    for (const p of list.slice(0, 100)) {
      const m = p.url.match(/\/companies\/([^/]+)\/jobs\/([^/?#]+)/);
      if (!m) continue;
      ctx.stats.requests++;
      try {
        const res = await fetch(`https://himalayas.app/jobs/api/companies/${m[1]}/jobs/${m[2]}`, {
          headers: { "User-Agent": process.env.USER_AGENT || "JobHunter/2.0", Accept: "application/json" },
          signal: AbortSignal.timeout(15_000),
        });
        if (res.status === 410 || res.status === 404) closed.push(p.sourceJobId);
        if (res.status === 429) break;
      } catch {
        // unknown, not closed
      }
      await sleep(1100);
    }
    return closed;
  },
};

// ---------------------------------------------------------------------------
// Remote OK — terms: followed link back to the Remote OK job URL, name
// "Remote OK" as the source, no logo. Returns the latest ~100 jobs.
// ---------------------------------------------------------------------------
type RokJob = {
  id: string; slug: string; epoch?: number; date?: string; company: string; position: string;
  tags?: string[]; description?: string; location?: string; apply_url?: string; url: string;
  salary_min?: number; salary_max?: number; legal?: string;
};

export const remoteok: SourceAdapter = {
  id: "remoteok",
  name: "Remote OK",
  homepage: "https://remoteok.com",
  attribution: { text: "via Remote OK", url: "https://remoteok.com" },
  isEmployerAts: false,
  everyHours: 3,
  async *fetch(ctx) {
    const r = await getJson<RokJob[]>(ctx, "https://remoteok.com/api");
    const jobs = r.filter((j) => j && j.id && j.position);
    yield {
      board: null,
      complete: false,
      postings: jobs.map((j) => ({
        sourceId: "remoteok",
        board: null,
        sourceJobId: String(j.id),
        url: j.url,
        applyUrl: j.apply_url || j.url,
        title: j.position,
        company: j.company,
        descriptionHtml: j.description ?? "",
        locationText: j.location || null,
        categoryHints: j.tags ?? [],
        salary: makeSalary(j.salary_min, j.salary_max, "USD", "year"),
        postedAt: date(j.epoch ?? j.date),
        raw: j,
      })),
    };
  },
};

// ---------------------------------------------------------------------------
// Jobicy — terms: credit Jobicy with a direct link; Apply goes to the original
// job URL; poll at most hourly.
// ---------------------------------------------------------------------------
type JobicyJob = {
  id: number; url: string; jobTitle: string; companyName: string; jobIndustry?: string[]; jobType?: string[];
  jobGeo?: string; jobLevel?: string; jobDescription?: string; jobExcerpt?: string; pubDate?: string;
  annualSalaryMin?: number | string; annualSalaryMax?: number | string; salaryCurrency?: string;
};

export const jobicy: SourceAdapter = {
  id: "jobicy",
  name: "Jobicy",
  homepage: "https://jobicy.com",
  attribution: { text: "via Jobicy", url: "https://jobicy.com" },
  isEmployerAts: false,
  everyHours: 4,
  async *fetch(ctx) {
    let cursor: string | undefined;
    for (let i = 0; i < 5; i++) {
      const r = await getJson<{ jobs: JobicyJob[]; nextCursor?: string; hasMore?: boolean }>(
        ctx,
        `https://jobicy.com/api/v2/remote-jobs?count=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      );
      if (!r.jobs?.length) break;
      yield {
        board: null,
        complete: false,
        postings: r.jobs.map((j) => ({
          sourceId: "jobicy",
          board: null,
          sourceJobId: String(j.id),
          url: j.url,
          applyUrl: j.url,
          title: j.jobTitle,
          company: j.companyName,
          descriptionHtml: j.jobDescription ?? j.jobExcerpt ?? "",
          locationText: j.jobGeo || null,
          categoryHints: j.jobIndustry ?? [],
          seniorityHints: j.jobLevel && j.jobLevel !== "Any" ? [j.jobLevel] : [],
          employmentType: j.jobType ?? null,
          salary: makeSalary(j.annualSalaryMin, j.annualSalaryMax, j.salaryCurrency, "year"),
          postedAt: date(j.pubDate),
          raw: j,
        })),
      };
      if (!r.hasMore || !r.nextCursor) break;
      cursor = r.nextCursor;
      await sleep(1500);
    }
  },
  // Documented status endpoint: up to 100 IDs per call → active | closed | unknown.
  async closeCheck(ctx, list) {
    const closed: string[] = [];
    for (let i = 0; i < Math.min(list.length, 500); i += 100) {
      const ids = list.slice(i, i + 100).map((p) => p.sourceJobId).join(",");
      try {
        const r = await getJson<{ jobs?: { id: number; status: string }[] }>(ctx, `https://jobicy.com/api/jobs/status?ids=${ids}`);
        for (const j of r.jobs ?? []) if (j.status === "closed") closed.push(String(j.id));
      } catch {
        // unknown, not closed
      }
      await sleep(1500);
    }
    return closed;
  },
};

// ---------------------------------------------------------------------------
// RemoteJobs.org — terms: visible "Powered by RemoteJobs.org" link back, keep
// the application link intact, stay under 200 requests/hour per IP.
// ---------------------------------------------------------------------------
type RjJob = {
  id: string; title: string; url: string; apply_url: string;
  company: { name: string; website?: string | null };
  category?: { name: string; slug: string } | null;
  location?: string | null;
  location_normalization?: {
    scope?: string; status?: string; allowed_countries?: string[]; excluded_countries?: string[];
    regions?: string[]; timezones?: unknown[];
  } | null;
  salary_min?: number | null; salary_max?: number | null; salary_currency?: string | null; salary_period?: string | null;
  type?: string | null; employment_types?: string[]; description?: string; posted_at?: string;
  search_facts?: { seniority?: string | null } | null;
};

export function rjPosting(j: RjJob): RawPosting {
  const ln = j.location_normalization ?? {};
  const allowed = ln.allowed_countries ?? [];
  return {
    sourceId: "remotejobs",
    board: null,
    sourceJobId: j.id,
    url: j.url,
    applyUrl: j.apply_url,
    title: j.title,
    company: j.company?.name ?? "Unknown",
    companyDomain: domainOf(j.company?.website),
    descriptionHtml: j.description ?? "",
    locationText: j.location ?? null,
    fieldCountries: allowed,
    fieldWorldwide: ln.scope === "worldwide" && ln.status === "known",
    fieldEvidence: allowed.length ? `RemoteJobs.org location: ${j.location ?? allowed.join(", ")}` : j.location ? `RemoteJobs.org location: ${j.location}` : undefined,
    categoryHints: j.category ? [j.category.name] : [],
    seniorityHints: j.search_facts?.seniority ? [j.search_facts.seniority] : [],
    employmentType: j.type ?? j.employment_types ?? null,
    salary: makeSalary(j.salary_min, j.salary_max, j.salary_currency, j.salary_period),
    postedAt: date(j.posted_at),
    raw: j,
  };
}

export const remotejobs: SourceAdapter = {
  id: "remotejobs",
  name: "RemoteJobs.org",
  homepage: "https://remotejobs.org",
  attribution: { text: "Powered by RemoteJobs.org", url: "https://remotejobs.org" },
  isEmployerAts: false,
  everyHours: 3,
  async *fetch(ctx) {
    const base = "https://remotejobs.org/api/v1/jobs?limit=50&sort=newest";
    const queries = [
      { q: `&country=${ctx.country}&eligibility=known`, pages: 20 },
      { q: `&country=${ctx.country}&eligibility=possible`, pages: 20 },
      { q: "", pages: Number(process.env.REMOTEJOBS_PAGES || 40) },
    ];
    for (const { q, pages } of queries) {
      for (let p = 0; p < pages; p++) {
        const r = await getJson<{ data: RjJob[]; pagination?: { has_more?: boolean } }>(ctx, `${base}${q}&offset=${p * 50}`);
        if (!r.data?.length) break;
        yield { board: null, complete: false, postings: r.data.map(rjPosting) };
        if (!r.pagination?.has_more) break;
        await sleep(19_000); // ~190 requests/hour ceiling
      }
    }
  },
};

export type { Batch };
