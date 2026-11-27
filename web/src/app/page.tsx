import Link from "next/link";
import { Suspense } from "react";
import { OverlapText, TrustChips, VerdictBadge, daysOpen, timeAgo } from "@/components/bits";
import { COUNTRY_CODES, countryName } from "@/server/lib/geo";
import { CATEGORIES } from "@/server/lib/normalize";
import { formatSalary } from "@/server/lib/salary";
import { categoryCounts, searchJobs, type SearchParams } from "@/server/queries";

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function Home({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<p className="text-muted">Loading jobs…</p>}>
      <Results searchParams={searchParams} />
    </Suspense>
  );
}

async function Results({ searchParams }: { searchParams: SP }) {
  const raw = await searchParams;
  const p: SearchParams = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, one(v)]));
  const [res, cats] = await Promise.all([searchJobs(p), categoryCounts()]);
  const now = Date.now();
  const href = (patch: Partial<SearchParams>) => {
    const u = new URLSearchParams(Object.entries({ ...p, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/?${u.toString()}`;
  };

  const active = [p.q, p.category, p.posted, p.engagement, p.salary, p.direct, p.flagged, p.elig && p.elig !== "open" ? p.elig : null].filter(Boolean).length;
  const filters = (
        <form className="space-y-4 rounded-lg border border-line bg-surface p-4 text-sm" action="/">
          <label className="block">
            <span className="mb-1 block font-medium">Search</span>
            <input name="q" defaultValue={p.q} placeholder="Title, skill or company" className="w-full rounded border border-line bg-bg px-2 py-1.5" />
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">I live in</span>
            <select name="country" defaultValue={res.viewer.country} className="w-full rounded border border-line bg-bg px-2 py-1.5">
              {COUNTRY_CODES.map((c) => ({ c, n: countryName(c) })).sort((a, b) => a.n.localeCompare(b.n)).map(({ c, n }) => (
                <option key={c} value={c}>{n}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Show</span>
            <select name="elig" defaultValue={p.elig ?? "open"} className="w-full rounded border border-line bg-bg px-2 py-1.5">
              <option value="open">Jobs open to me</option>
              <option value="unclear">…plus unclear location</option>
              <option value="all">Everything</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Category</span>
            <select name="category" defaultValue={p.category ?? ""} className="w-full rounded border border-line bg-bg px-2 py-1.5">
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}{cats.find((x) => x.category === c) ? ` (${cats.find((x) => x.category === c)!.n})` : ""}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Posted within</span>
            <select name="posted" defaultValue={p.posted ?? ""} className="w-full rounded border border-line bg-bg px-2 py-1.5">
              <option value="">Any time</option>
              <option value="1">24 hours</option>
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Engagement</span>
            <select name="engagement" defaultValue={p.engagement ?? ""} className="w-full rounded border border-line bg-bg px-2 py-1.5">
              <option value="">Any</option>
              <option value="employee">Employee</option>
              <option value="contractor">Contractor</option>
              <option value="eor">Through an employer of record</option>
            </select>
          </label>
          <label className="flex items-center gap-2"><input type="checkbox" name="salary" value="1" defaultChecked={p.salary === "1"} /> Salary listed</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="direct" value="1" defaultChecked={p.direct === "1"} /> From the employer&apos;s own board</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="flagged" value="show" defaultChecked={p.flagged === "show"} /> Show jobs flagged as possible scams</label>
          {p.q ? (
            <label className="block">
              <span className="mb-1 block font-medium">Sort</span>
              <select name="sort" defaultValue={p.sort ?? "relevant"} className="w-full rounded border border-line bg-bg px-2 py-1.5">
                <option value="relevant">Most relevant</option>
                <option value="newest">Newest</option>
              </select>
            </label>
          ) : null}
          <button className="w-full rounded bg-accent px-3 py-2 font-medium text-white">Apply filters</button>
        </form>
  );

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr] lg:gap-6">
      <aside className="min-w-0">
        {/* Phones: filters fold away so the jobs come first. */}
        <details className="group lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium">
            <span>Filters{active ? ` (${active} on)` : ""} · {countryName(res.viewer.country)}</span>
            <span className="text-muted group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-2">{filters}</div>
        </details>
        <div className="hidden lg:block">{filters}</div>
      </aside>

      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-lg font-semibold sm:text-xl">
            {res.total.toLocaleString()} {p.elig === "all" ? "remote jobs" : `remote jobs open to ${countryName(res.viewer.country)}`}
            {!res.exactCount ? <span className="ml-2 text-sm font-normal text-muted">(approximate count)</span> : null}
          </h1>
          <span className="text-sm text-muted">{p.q && p.sort !== "newest" ? "Most relevant first" : "Newest first"}</span>
        </div>

        {res.items.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface p-6 text-muted">
            No jobs match. Try &ldquo;plus unclear location&rdquo; or a wider date range.
          </p>
        ) : (
          <ul className="space-y-3">
            {res.items.map((j) => {
              const pay = formatSalary({ min: j.salaryMin, max: j.salaryMax, currency: j.salaryCurrency, period: j.salaryPeriod as never });
              const open = daysOpen(j.firstSeen, now);
              return (
                <li key={j.id} className="rounded-lg border border-line bg-surface p-4 hover:border-accent">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/jobs/${j.id}?country=${res.viewer.country}`} className="text-base font-semibold hover:text-accent">
                        {j.title}
                      </Link>
                      <div className="text-sm text-muted">
                        {j.company} · {j.category}
                        {j.seniority ? ` · ${j.seniority}` : ""}
                        {j.employmentType ? ` · ${j.employmentType}` : ""}
                      </div>
                    </div>
                    <VerdictBadge verdict={j.v.verdict} />
                  </div>
                  <p className="mt-2 text-sm">{j.v.reason}{j.v.note ? <span className="text-muted"> · {j.v.note}</span> : null}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>Posted {timeAgo(j.posted, now)}</span>
                    {open >= 30 ? <span>· Open {open} days</span> : null}
                    {j.repostCount > 0 ? <span>· Reposted {j.repostCount}×</span> : null}
                    {j.reopenedAt ? <span>· Reopened {timeAgo(j.reopenedAt, now)}</span> : null}
                    {pay ? <span>· {pay}</span> : null}
                    {j.engagement !== "unknown" ? <span>· {j.engagement === "eor" ? "via employer of record" : j.engagement}</span> : null}
                    {j.v.overlap ? <span>· <OverlapText overlap={j.v.overlap} /></span> : null}
                    {j.sourceCount > 1 ? <span>· on {j.sourceCount} sources</span> : null}
                    <TrustChips labels={j.trust} max={3} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {res.pages > 1 ? (
          <nav className="mt-6 flex items-center justify-between text-sm">
            {res.page > 1 ? <Link className="rounded border border-line bg-surface px-3 py-1.5" href={href({ page: String(res.page - 1) })}>← Previous</Link> : <span />}
            <span className="text-muted">Page {res.page} of {res.pages.toLocaleString()}</span>
            {res.page < res.pages ? <Link className="rounded border border-line bg-surface px-3 py-1.5" href={href({ page: String(res.page + 1) })}>Next →</Link> : <span />}
          </nav>
        ) : null}
      </section>
    </div>
  );
}
