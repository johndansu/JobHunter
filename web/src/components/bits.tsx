import type { VerdictKind } from "@/server/lib/eligibility";
import { zoneLabel } from "@/server/lib/eligibility";
import type { TrustLabel } from "@/server/lib/trust";

export function timeAgo(d: Date | string | null | undefined, now = Date.now()): string {
  if (!d) return "unknown";
  const t = typeof d === "string" ? new Date(d).getTime() : d.getTime();
  const days = Math.floor((now - t) / 86_400_000);
  if (days <= 0) {
    const h = Math.max(1, Math.floor((now - t) / 3_600_000));
    return `${h} h ago`;
  }
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const m = Math.floor(days / 30);
  return `${m} month${m > 1 ? "s" : ""} ago`;
}

export const daysOpen = (d: Date | string | null | undefined, now = Date.now()) =>
  d ? Math.floor((now - new Date(d).getTime()) / 86_400_000) : 0;

const VERDICT: Record<VerdictKind, { label: string; cls: string }> = {
  eligible: { label: "Open to you", cls: "bg-good-soft text-good" },
  region_match: { label: "Your region · verify", cls: "bg-warn-soft text-warn" },
  unclear: { label: "Location unclear", cls: "bg-line/60 text-muted" },
  not_eligible: { label: "Not open to you", cls: "bg-bad-soft text-bad" },
};

export function VerdictBadge({ verdict }: { verdict: VerdictKind }) {
  const v = VERDICT[verdict];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${v.cls}`}>{v.label}</span>;
}

export function OverlapText({ overlap }: { overlap: { min: number; max: number; anchor: string } | null | undefined }) {
  if (!overlap) return null;
  const r = overlap.min === overlap.max ? `${overlap.min} h` : `${overlap.min}–${overlap.max} h`;
  return <span>{r} overlap with {zoneLabel(overlap.anchor)} hours</span>;
}

export function TrustChips({ labels, max = 4 }: { labels: TrustLabel[]; max?: number }) {
  const order: TrustLabel["kind"][] = ["possible_scam", "use_caution", "employer_says", "employer_ats", "salary_listed", "thin_description"];
  const sorted = [...labels].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)).slice(0, max);
  const cls: Record<TrustLabel["kind"], string> = {
    possible_scam: "bg-bad-soft text-bad",
    use_caution: "bg-warn-soft text-warn",
    employer_says: "bg-warn-soft text-warn",
    employer_ats: "bg-accent-soft text-accent",
    salary_listed: "bg-accent-soft text-accent",
    thin_description: "bg-line/60 text-muted",
  };
  return (
    <>
      {sorted.map((l, i) => (
        <span key={i} title={"quote" in l ? l.quote : undefined} className={`rounded px-2 py-0.5 text-xs ${cls[l.kind]}`}>
          {l.text}
        </span>
      ))}
    </>
  );
}
