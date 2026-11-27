import Link from "next/link";
import { Suspense } from "react";
import { dismissAction } from "@/app/actions";
import { ChecklistView } from "@/components/ChecklistView";
import { AiModeNote, BandBadge, VerdictBadge, timeAgo } from "@/components/bits";
import type { VerdictKind } from "@/server/lib/eligibility";
import { CATEGORIES } from "@/server/lib/normalize";
import { formatSalary } from "@/server/lib/salary";
import { listMatches } from "@/server/matchQueries";

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function MatchesPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<p className="text-muted">Scoring your matches…</p>}>
      <Matches searchParams={searchParams} />
    </Suspense>
  );
}

async function Matches({ searchParams }: { searchParams: SP }) {
  const raw = await searchParams;
  const p = { view: one(raw.view), band: one(raw.band), category: one(raw.category), page: one(raw.page) };
  const res = await listMatches(p);
  if (!res || (!res.profile.data.targetTitles.length && !res.profile.data.skills.length)) {
    return (
      <div className="rounded-lg border border-line bg-surface p-6">
        <h1 className="text-xl font-semibold">My matches</h1>
        <p className="mt-2 text-muted">Add your CV and target roles first, and jobs will be scored for you.</p>
        <Link href="/profile" className="mt-4 inline-block rounded bg-accent px-4 py-2 font-medium text-white">Set up your profile</Link>
      </div>
    );
  }
  const now = Date.now();
  const href = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams(Object.entries({ ...p, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/matches?${u}`;
  };
  const back = href({});
  const tab = (active: boolean) => `rounded px-3 py-1.5 ${active ? "bg-accent text-white" : "border border-line bg-surface"}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">My matches</h1>
          <p className="text-sm text-muted">
            Jobs open to you, scored against your profile. Strong {res.counts.strong ?? 0} · Good {res.counts.good ?? 0} · Stretch {res.counts.stretch ?? 0}. Fresher jobs rank higher.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className={tab(p.view !== "new")} href={href({ view: undefined, page: undefined })}>All matches</Link>
          <Link className={tab(p.view === "new")} href={href({ view: "new", page: undefined })}>New since yesterday{res.newStrongGood ? ` (${res.newStrongGood})` : ""}</Link>
        </div>
      </div>
      <AiModeNote />
      <form className="flex flex-wrap items-center gap-2 text-sm" action="/matches">
        {p.view ? <input type="hidden" name="view" value={p.view} /> : null}
        <select name="band" defaultValue={p.band ?? "stretch"} className="rounded border border-line bg-surface px-2 py-1.5">
          <option value="strong">Strong only</option>
          <option value="good">Strong + Good</option>
          <option value="stretch">Include stretches</option>
        </select>
        <select name="category" defaultValue={p.category ?? ""} className="min-w-0 max-w-full rounded border border-line bg-surface px-2 py-1.5">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button className="rounded border border-line bg-surface px-3 py-1.5">Filter</button>
        <span className="text-muted">{res.total.toLocaleString()} jobs</span>
      </form>

      {res.rows.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface p-6 text-muted">No matches here yet. Try including stretches, or add more target roles and skills to your profile.</p>
      ) : (
        <ul className="space-y-3">
          {res.rows.map((j) => {
            const pay = formatSalary({ min: j.salaryMin, max: j.salaryMax, currency: j.salaryCurrency, period: j.salaryPeriod as never });
            return (
              <li key={j.id} className="rounded-lg border border-line bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/jobs/${j.id}`} className="text-base font-semibold hover:text-accent">{j.title}</Link>
                    <div className="text-sm text-muted">{j.company} · {j.category}{j.employmentType ? ` · ${j.employmentType}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BandBadge band={j.band} />
                    <VerdictBadge verdict={j.verdict as VerdictKind} />
                  </div>
                </div>
                <ChecklistView c={j.checklist} compact />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span>Posted {timeAgo(j.posted, now)}{pay ? ` · ${pay}` : ""}{j.engagement !== "unknown" ? ` · ${j.engagement === "eor" ? "via employer of record" : j.engagement}` : ""} · {j.verdictReason}</span>
                  <form action={dismissAction}>
                    <input type="hidden" name="jobId" value={j.id} />
                    <input type="hidden" name="back" value={back} />
                    <button className="underline">Not interested</button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {res.pages > 1 ? (
        <nav className="flex items-center justify-between text-sm">
          {res.page > 1 ? <Link className="rounded border border-line bg-surface px-3 py-1.5" href={href({ page: String(res.page - 1) })}>← Previous</Link> : <span />}
          <span className="text-muted">Page {res.page} of {res.pages}</span>
          {res.page < res.pages ? <Link className="rounded border border-line bg-surface px-3 py-1.5" href={href({ page: String(res.page + 1) })}>Next →</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
