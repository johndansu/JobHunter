import type { Checklist } from "@/server/lib/match";

/** "Why this match" (RANK-04): every item quotes the posting. Compact mode for cards. */
export function ChecklistView({ c, compact = false }: { c: Checklist; compact?: boolean }) {
  if (compact) {
    return (
      <div className="mt-2 space-y-1 text-xs">
        {c.matched.length ? (
          <div><span className="text-muted">You have:</span> <span className="text-good">{c.matched.slice(0, 6).map((m) => m.skill).join(", ")}{c.matched.length > 6 ? ` +${c.matched.length - 6}` : ""}</span></div>
        ) : null}
        {c.missingMust.length ? (
          <div><span className="text-muted">Missing must-haves:</span> <span className="text-bad">{c.missingMust.slice(0, 5).map((m) => m.skill).join(", ")}{c.missingMust.length > 5 ? ` +${c.missingMust.length - 5}` : ""}</span></div>
        ) : null}
        <div className="text-muted">
          {c.title.best ? `Close to your target "${c.title.best}"` : "Title differs from your targets"}
          {c.years ? ` · needs ${c.years.need}+ yrs${c.years.have != null ? `, you have ${c.years.have}` : ""}` : ""}
          {c.seniority.fit === "under" ? " · more senior than you" : c.seniority.fit === "over" ? " · more junior than you" : ""}
          {c.languages.filter((l) => !l.ok).map((l) => ` · requires ${l.language}`).join("")}
        </div>
      </div>
    );
  }
  const Item = ({ ok, label, quote }: { ok: boolean | null; label: string; quote?: string }) => (
    <li className="text-sm">
      <span className={ok == null ? "text-muted" : ok ? "text-good" : "text-bad"}>{ok == null ? "•" : ok ? "✓" : "✗"}</span> {label}
      {quote ? <div className="ml-4 text-xs text-muted">&ldquo;{quote}&rdquo;</div> : null}
    </li>
  );
  return (
    <ul className="space-y-2">
      <Item ok={c.title.score >= 0.5} label={c.title.best ? `Title is close to your target "${c.title.best}"` : "Title doesn't match your target roles"} />
      {c.matched.map((m) => <Item key={`m${m.skill}`} ok label={`${m.skill}: you have it`} quote={m.quote} />)}
      {c.missingMust.map((m) => <Item key={`x${m.skill}`} ok={false} label={`${m.skill}: required, not in your profile`} quote={m.quote} />)}
      {c.missingNice.slice(0, 6).map((m) => <Item key={`n${m.skill}`} ok={null} label={`${m.skill}: nice to have`} quote={m.quote} />)}
      {c.years ? <Item ok={c.years.ok} label={`Needs ${c.years.need}+ years${c.years.have != null ? `; you have ${c.years.have}` : ""}`} quote={c.years.quote} /> : null}
      {c.seniority.job ? <Item ok={c.seniority.fit === "at" ? true : c.seniority.fit === "unknown" ? null : false} label={`Seniority: ${c.seniority.job}${c.seniority.you ? ` (you: ${c.seniority.you})` : ""}`} /> : null}
      {c.languages.map((l) => <Item key={`l${l.language}`} ok={l.ok} label={`${l.language} required`} quote={l.quote} />)}
    </ul>
  );
}
