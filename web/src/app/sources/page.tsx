import { connection } from "next/server";
import { Suspense } from "react";
import { timeAgo } from "@/components/bits";
import { sourceHealth } from "@/server/queries";
import { SOURCES } from "@/server/sources";

export default function SourcesPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Health />
    </Suspense>
  );
}

async function Health() {
  await connection();
  const { list, counts, recent, totals } = await sourceHealth();
  const now = Date.now();
  const total = totals.reduce((n, t) => n + t.n, 0);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Sources</h1>
        <p className="text-sm text-muted">
          {total.toLocaleString()} live jobs ·{" "}
          {totals.map((t) => `${t.verdict.replace("_", " ")}: ${t.n.toLocaleString()}`).join(" · ")} (for the default country)
        </p>
      </div>
      <table className="w-full overflow-hidden rounded-lg border border-line bg-surface text-sm">
        <thead className="bg-bg text-left text-muted">
          <tr><th className="p-2">Source</th><th className="p-2">Open postings</th><th className="p-2">Closed</th><th className="p-2">Last run</th><th className="p-2">Status</th><th className="p-2" /></tr>
        </thead>
        <tbody>
          {SOURCES.map((s) => {
            const row = list.find((r) => r.id === s.id);
            const c = counts.find((x) => x.sourceId === s.id);
            return (
              <tr key={s.id} className="border-t border-line">
                <td className="p-2"><a href={s.homepage} className="underline">{s.name}</a><div className="text-xs text-muted">every {s.everyHours} h</div></td>
                <td className="p-2">{(c?.open ?? 0).toLocaleString()}</td>
                <td className="p-2">{(c?.closed ?? 0).toLocaleString()}</td>
                <td className="p-2">{row?.lastRunAt ? timeAgo(row.lastRunAt, now) : "never"}</td>
                <td className="p-2">{row?.lastRunAt ? (row.lastOk ? <span className="text-good">ok · {row.lastFetched} fetched</span> : <span className="text-bad">{row.lastError}</span>) : "—"}</td>
                <td className="p-2 text-right">
                  <form action={`/api/ingest?source=${s.id}`} method="post"><button className="rounded border border-line px-2 py-1 text-xs">Run now</button></form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div>
        <h2 className="mb-2 font-medium">Recent runs</h2>
        <table className="w-full rounded-lg border border-line bg-surface text-xs">
          <thead className="bg-bg text-left text-muted"><tr><th className="p-2">Source</th><th className="p-2">Started</th><th className="p-2">Requests</th><th className="p-2">Fetched</th><th className="p-2">New</th><th className="p-2">Updated</th><th className="p-2">Closed</th><th className="p-2">Skipped (not remote)</th><th className="p-2">Result</th></tr></thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="p-2">{r.sourceId}</td><td className="p-2">{timeAgo(r.startedAt, now)}</td><td className="p-2">{r.requests}</td>
                <td className="p-2">{r.fetched}</td><td className="p-2">{r.created}</td><td className="p-2">{r.updated}</td><td className="p-2">{r.closed}</td><td className="p-2">{r.skipped}</td>
                <td className="p-2">{r.finishedAt ? (r.ok ? "ok" : `failed: ${r.error}`) : "running…"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
