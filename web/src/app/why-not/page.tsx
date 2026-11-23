import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { countryName } from "@/server/lib/geo";
import { whyNot } from "@/server/matchQueries";

export default function WhyNotPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <WhyNot />
    </Suspense>
  );
}

const ADVICE: Record<string, string> = {
  "Limited to other countries": "These employers hire only in the listed countries. Roles naming your country or region, or saying they hire contractors anywhere, are your best bets.",
  "Time zone": "These need working hours that overlap with a far-off team. A small change to your hours can open some of them.",
  "Work authorization in another country": "These need the legal right to work in a specific country. Add any permits you hold to your profile and they'll be re-checked.",
  "Citizenship or security clearance": "These need a specific citizenship or a government clearance. They can't be opened by changing settings.",
  "Your country is excluded": "These employers explicitly exclude your country.",
  Sanctions: "Most employers can't hire where sanctions apply. This is not legal advice.",
};

async function WhyNot() {
  await connection();
  const res = await whyNot();
  if (!res) {
    return (
      <p className="rounded-lg border border-line bg-surface p-6 text-muted">
        Set up your <Link href="/profile" className="underline">profile</Link> first.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Why not me?</h1>
        <p className="text-sm text-muted">
          {res.total.toLocaleString()} jobs fit your profile well (Strong or Good) but aren&apos;t open to someone in {countryName(res.profile.data.country)}. Here&apos;s what shuts you out, and what would open the most.
        </p>
      </div>
      {res.groups.map((g) => (
        <section key={g.name} className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-medium">{g.name}</h2>
            <span className="text-sm text-muted">{g.count.toLocaleString()} jobs</span>
          </div>
          <p className="mt-1 text-sm">{ADVICE[g.name] ?? ""}</p>
          {g.name === "Time zone" ? (
            <p className="mt-1 text-sm text-accent">
              {res.shiftOpens.map((s) => `Shifting your day by ${s.hours} more hours would open ${s.opens}`).join(" · ")}.
              {" "}<Link href="/profile" className="underline">Change your hours</Link>
            </p>
          ) : null}
          <ul className="mt-2 text-xs text-muted">
            {g.topReasons.map(([r, n]) => <li key={r}>{r}: {n}</li>)}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {g.examples.map((e) => <Link key={e.id} href={`/jobs/${e.id}`} className="rounded border border-line px-2 py-1 hover:border-accent">{e.title} · {e.company}</Link>)}
          </div>
        </section>
      ))}
      {!res.groups.length ? <p className="rounded-lg border border-line bg-surface p-6 text-muted">Nothing here: every good fit is open to you.</p> : null}
    </div>
  );
}
