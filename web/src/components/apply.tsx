import type { DocChecks } from "@/server/applications";
import type { Flag } from "@/server/lib/checks";
import type { ChangeEntry, Evidence } from "@/server/lib/tailor";

export function FlagList({ flags }: { flags: Flag[] }) {
  const block = flags.filter((f) => f.severity === "block");
  const warn = flags.filter((f) => f.severity === "warn");
  if (!flags.length) return <p className="rounded bg-good-soft px-3 py-2 text-sm text-good">No problems found. Every claim traces to your CV.</p>;
  return (
    <div className="space-y-2 text-sm">
      {block.length ? <div className="font-medium text-bad">Must fix before approval ({block.length})</div> : null}
      {block.map((f, i) => <FlagItem key={`b${i}`} f={f} />)}
      {warn.length ? <div className="pt-1 font-medium text-warn">Worth a look ({warn.length})</div> : null}
      {warn.map((f, i) => <FlagItem key={`w${i}`} f={f} />)}
    </div>
  );
}

function FlagItem({ f }: { f: Flag }) {
  return (
    <div className={`rounded border px-3 py-2 ${f.severity === "block" ? "border-bad/40 bg-bad-soft" : "border-warn/40 bg-warn-soft"}`}>
      <div className={`font-medium ${f.severity === "block" ? "text-bad" : "text-warn"}`}>{f.title}</div>
      <div className="mt-0.5 text-ink/80">{f.why}</div>
      {f.quote ? <div className="mt-1 text-xs text-muted">&ldquo;{f.quote}&rdquo;</div> : null}
    </div>
  );
}

const STATUS = { pass: "text-good", warn: "text-warn", fail: "text-bad" } as const;
const MARK = { pass: "✓", warn: "!", fail: "✗" } as const;

/** ATS read-back preview (DOC-05): what hiring software gets out of each file. */
export function ReadBackView({ checks }: { checks: DocChecks }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {checks.readBack.map((rb) => (
        <div key={rb.format} className="rounded border border-line p-3 text-sm">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-medium">{rb.format.toUpperCase()} read-back</span>
            <span className={rb.ok ? "text-good" : "text-bad"}>{rb.ok ? "Reads cleanly" : "Problems found"}</span>
          </div>
          <ul className="space-y-0.5">
            {rb.checks.map((c, i) => (
              <li key={i}>
                <span className={`inline-block w-4 font-semibold ${STATUS[c.status]}`}>{MARK[c.status]}</span> {c.label}
                {c.detail ? <span className="text-xs text-muted"> · {c.detail}</span> : null}
              </li>
            ))}
          </ul>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-muted">Show the text as hiring software reads it</summary>
            <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-bg p-2 font-mono text-[11px] leading-snug">{rb.text}</pre>
          </details>
        </div>
      ))}
    </div>
  );
}

const EV = { met: ["Met", "bg-good-soft text-good"], partial: ["Partly", "bg-warn-soft text-warn"], missing: ["Not met", "bg-bad-soft text-bad"] } as const;

/** Evidence matrix (DOC-02): each requirement against the line in your CV that proves it. */
export function EvidenceTable({ rows }: { rows: Evidence[] }) {
  if (!rows.length) return <p className="text-sm text-muted">No specific requirements were found in this posting.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-muted">
          <tr><th className="py-1 pr-3">Requirement</th><th className="pr-3">Level</th><th className="pr-3">You</th><th>Evidence from your CV</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line align-top">
              <td className="py-1.5 pr-3"><div className="font-medium">{r.requirement}</div><div className="text-xs text-muted">&ldquo;{r.postingQuote}&rdquo;</div></td>
              <td className="pr-3 text-xs">{r.level === "must" ? "Required" : r.level === "nice" ? "Nice to have" : "Mentioned"}</td>
              <td className="pr-3"><span className={`rounded px-2 py-0.5 text-xs ${EV[r.status][1]}`}>{EV[r.status][0]}</span></td>
              <td className="text-xs">{r.cvQuote ?? <span className="text-muted">{r.status === "missing" ? "Not in your CV or profile. Don't claim it." : "Listed as a skill, but no bullet shows you using it."}</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const CH = { from_cv: ["From your CV", "text-good"], moved: ["From your CV, moved up", "text-accent"], edited: ["New or edited: checked by the fact lock", "text-warn"] } as const;

/** Change log (DOC-07). */
export function ChangeLogView({ entries }: { entries: ChangeEntry[] }) {
  return (
    <ul className="space-y-1 text-sm">
      {entries.map((e, i) => (
        <li key={i} className="rounded border border-line px-3 py-1.5">
          <div>{e.text}</div>
          <div className="text-xs">
            <span className={CH[e.status][1]}>{CH[e.status][0]}</span>
            <span className="text-muted"> · {e.where}</span>
            {e.serves.length ? <span className="text-muted"> · serves: {e.serves.join(", ")}</span> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Identity-readiness checklist (TRUST-09). */
export function IdentityChecklist() {
  const items: [string, string][] = [
    ["One legal name everywhere", "Use the same name on your CV, letter, LinkedIn, email sender and ID. Remote hiring teams check for mismatches because of identity fraud."],
    ["References who'll answer", "Two or three people who know you'll be contacted, with current emails or phone numbers."],
    ["Ready for an ID check", "A valid passport or national ID. Some employers and employer-of-record providers verify identity before an offer."],
    ["Camera-on interviews", "A working camera, steady internet and a quiet place. Many remote employers now insist on video."],
    ["Your real location", "Apply from where you are. A VPN that puts you in another country can look like fraud and get an offer withdrawn."],
    ["Payment set up honestly", "If you'll be paid as a contractor, use an account in your own name. Never accept a job that pays through someone else's account."],
  ];
  return (
    <ul className="space-y-2 text-sm">
      {items.map(([t, d]) => (
        <li key={t}><div className="font-medium">{t}</div><div className="text-muted">{d}</div></li>
      ))}
    </ul>
  );
}
