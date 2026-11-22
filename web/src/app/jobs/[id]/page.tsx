import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OverlapText, TrustChips, VerdictBadge, daysOpen, timeAgo } from "@/components/bits";
import { DEFAULT_VIEWER } from "@/server/ingest/derive";
import { verdictFor } from "@/server/lib/eligibility";
import { countryName, REGIONS } from "@/server/lib/geo";
import { formatSalary } from "@/server/lib/salary";
import { checkLiveness } from "@/server/liveness";
import { getJob, isEmployerSource } from "@/server/queries";
import { sourceById } from "@/server/sources";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function JobPage(props: Props) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <JobDetail {...props} />
    </Suspense>
  );
}

async function JobDetail({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const data = await getJob(Number(id));
  if (!data) notFound();
  const { job, posts } = data;
  const lastChecked = await checkLiveness(job.id, job.lastChecked);
  const country = (typeof sp.country === "string" ? sp.country : DEFAULT_VIEWER.country).toUpperCase();
  const viewer = { country, timezone: country === DEFAULT_VIEWER.country ? DEFAULT_VIEWER.timezone : "UTC", shiftHours: DEFAULT_VIEWER.shiftHours };
  const v = verdictFor(job.eligibility, viewer);
  const now = Date.now();
  const pay = formatSalary({ min: job.salaryMin, max: job.salaryMax, currency: job.salaryCurrency, period: job.salaryPeriod as never });
  const open = posts.filter((p) => !p.closedAt);
  const canonical = posts.find((p) => p.id === job.canonicalPostingId) ?? posts[0];
  const e = job.eligibility;
  const liveAsOf = lastChecked ?? job.lastSeen;

  return (
    <article className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        <Link href={`/?country=${country}`} className="text-sm text-muted hover:text-ink">← Back to jobs</Link>
        <h1 className="mt-2 text-2xl font-semibold">{job.title}</h1>
        <p className="text-muted">
          {job.company} · {job.category}
          {job.seniority ? ` · ${job.seniority}` : ""}
          {job.employmentType ? ` · ${job.employmentType}` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2"><TrustChips labels={job.trust} max={8} /></div>

        {job.trust.filter((l) => "quote" in l).map((l, i) => (
          <blockquote key={i} className="mt-3 border-l-2 border-warn pl-3 text-sm text-muted">
            <span className="font-medium text-ink">{l.text}.</span> &ldquo;{"quote" in l ? l.quote : ""}&rdquo;
          </blockquote>
        ))}

        <div className="prose-job mt-6 text-[15px] leading-relaxed" dangerouslySetInnerHTML={{ __html: job.descriptionHtml || "<p>No description provided.</p>" }} />
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">From {countryName(country)}</span>
            <VerdictBadge verdict={v.verdict} />
          </div>
          <p className="mt-2 text-sm">{v.reason}</p>
          {v.quote ? <blockquote className="mt-2 border-l-2 border-line pl-3 text-sm text-muted">&ldquo;{v.quote}&rdquo;</blockquote> : null}
          {v.note ? <p className="mt-2 text-sm text-warn">{v.note}</p> : null}
          {v.overlap ? <p className="mt-2 text-sm"><OverlapText overlap={v.overlap} /> (your 9–5, across the year)</p> : null}
          {e.scope === "restricted" && (e.countries.length || e.regions.length) ? (
            <p className="mt-2 text-xs text-muted">
              Open to: {[...e.regions.map((r) => REGIONS[r]?.label ?? r), ...e.countries.slice(0, 12).map(countryName)].join(", ")}
              {e.countries.length > 12 ? ` and ${e.countries.length - 12} more` : ""}
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-line bg-surface p-4 text-sm">
          {job.status === "live" ? (
            <a href={job.applyUrl} target="_blank" rel="noopener" className="block rounded bg-accent px-3 py-2 text-center font-medium text-white">
              Apply on {isEmployerSource(job.canonicalSource) ? "the employer's site" : sourceById(job.canonicalSource)?.name ?? "source"}
            </a>
          ) : (
            <p className="rounded bg-bad-soft px-3 py-2 text-center font-medium text-bad">This job has closed</p>
          )}
          <dl className="mt-3 space-y-1 text-muted">
            <div>Live as of {new Date(liveAsOf).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</div>
            <div>Posted {timeAgo(job.sourcePostedAt ?? job.firstSeen, now)} · first seen {timeAgo(job.firstSeen, now)}</div>
            {daysOpen(job.firstSeen, now) >= 30 ? <div>Open {daysOpen(job.firstSeen, now)} days</div> : null}
            {job.repostCount > 0 ? <div>Reposted {job.repostCount}× by the same source</div> : null}
            {job.reopenedAt ? <div>Reopened {timeAgo(job.reopenedAt, now)} after closing</div> : null}
            {pay ? <div>Pay: {pay}</div> : null}
            {job.engagement !== "unknown" ? <div>Engagement: {job.engagement === "eor" ? "through an employer of record" : job.engagement}</div> : null}
            {job.locationText ? <div>Listed location: {job.locationText}</div> : null}
          </dl>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4 text-sm">
          <div className="mb-2 font-medium">Where this job is listed</div>
          <ul className="space-y-1">
            {open.map((p) => {
              const s = sourceById(p.sourceId);
              return (
                <li key={p.id}>
                  {/* Followed link back to the source, as the sources' terms require. */}
                  <a href={p.url} target="_blank" rel="noopener" className="text-accent underline">
                    {s ? (isEmployerSource(s.id) ? `${job.company}'s ${s.atsName} board` : s.attribution.text) : p.sourceId}
                  </a>
                  {p.id === canonical?.id ? <span className="text-muted"> (shown here)</span> : null}
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </article>
  );
}
