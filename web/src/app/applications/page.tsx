import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { timeAgo } from "@/components/bits";
import { NO_RESPONSE_DAYS, STAGE_LABEL, followUpHint, listApplications, type Stage } from "@/server/applications";

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Tracker />
    </Suspense>
  );
}

const GROUPS: { label: string; stages: Stage[] }[] = [
  { label: "Getting ready", stages: ["saved"] },
  { label: "Waiting to hear back", stages: ["applied"] },
  { label: "In progress", stages: ["screening", "interviewing", "offer"] },
  { label: "Closed", stages: ["accepted", "declined", "rejected", "withdrawn", "no_response"] },
];

async function Tracker() {
  await connection();
  const rows = await listApplications();
  const now = new Date();
  const applied = rows.filter((r) => r.app.appliedAt);
  const heard = applied.filter((r) => ["screening", "interviewing", "offer", "accepted", "declined", "rejected"].includes(r.app.stage));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Applications</h1>
        <p className="text-sm text-muted">
          Start one from any job page, or send a <Link href="/speculative" className="underline">speculative application</Link> to a company you like. &ldquo;Applied&rdquo; turns into &ldquo;No response&rdquo; after {NO_RESPONSE_DAYS} days without a change, because silence is the most common answer. Change it any time you hear back.
        </p>
      </div>
      {applied.length ? (
        <p className="rounded border border-line bg-surface px-3 py-2 text-sm">
          You&apos;ve applied to {applied.length} job{applied.length === 1 ? "" : "s"} and heard back from {heard.length}.{" "}
          <span className="text-muted">For scale: about 8% of applicants pass a first screen and about 1 in 200 applications becomes an offer, so small numbers say little yet.</span>
        </p>
      ) : null}
      {!rows.length ? <p className="text-muted">No applications yet. Open a job from <Link href="/matches" className="underline">My matches</Link> and choose &ldquo;Start application&rdquo;.</p> : null}
      {GROUPS.map((g) => {
        const list = rows.filter((r) => g.stages.includes(r.app.stage as Stage));
        if (!list.length) return null;
        return (
          <section key={g.label}>
            <h2 className="mb-2 text-sm font-medium text-muted">{g.label} ({list.length})</h2>
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {list.map((r) => {
                const hint = followUpHint(r.app, now);
                return (
                  <li key={r.app.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div className="min-w-0">
                      <Link href={`/applications/${r.app.id}`} className="font-medium hover:underline">{r.title}</Link>
                      <div className="text-sm text-muted">
                        {r.company} · {STAGE_LABEL[r.app.stage as Stage]} {timeAgo(r.app.stageAt, now.getTime())}
                        {r.jobStatus === "closed" && r.app.stage === "saved" ? <span className="text-bad"> · job has closed</span> : null}
                        {r.app.stage === "saved" ? <span> · {r.cvApproved ? "CV approved" : "CV not approved yet"}</span> : null}
                      </div>
                      {r.emailState ? <div className="text-xs text-accent">{r.emailState}</div> : hint ? <div className="text-xs text-accent">{hint}</div> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
