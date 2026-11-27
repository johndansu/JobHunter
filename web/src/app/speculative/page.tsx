import { Suspense } from "react";
import { startSpeculativeAction } from "@/app/applications/actions";

type SP = Promise<Record<string, string | string[] | undefined>>;
const input = "w-full rounded border border-line bg-bg px-2 py-1.5";
const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default function SpeculativePage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <SpeculativeForm searchParams={searchParams} />
    </Suspense>
  );
}

async function SpeculativeForm({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Speculative application</h1>
        <p className="text-sm text-muted">
          Ask a company you&apos;d like to work for whether they have openings, even with no job posted. JobHunter only sends to a careers address the company publishes on its own website. It never guesses addresses (like firstname@company.com) and never takes them from LinkedIn or contact-finder sites.
        </p>
      </div>
      {str(sp.error) ? <p className="rounded bg-bad-soft px-3 py-2 text-sm text-bad">{str(sp.error)}</p> : null}
      <form action={startSpeculativeAction} className="space-y-3 rounded-lg border border-line bg-surface p-4 text-sm">
        <label className="block"><span className="mb-1 block font-medium">Company</span><input name="company" defaultValue={str(sp.company)} className={input} placeholder="e.g. Acme" /></label>
        <label className="block"><span className="mb-1 block font-medium">What kind of role?</span><input name="roleArea" defaultValue={str(sp.roleArea)} className={input} placeholder="e.g. customer support" /></label>
        <label className="block">
          <span className="mb-1 block font-medium">The page on their website that gives the careers email</span>
          <input name="page" defaultValue={str(sp.page)} className={input} placeholder="https://acme.com/careers" />
          <span className="mt-1 block text-xs text-muted">JobHunter opens this page once to confirm the address is there, and keeps the text so you can see where the address came from.</span>
        </label>
        <button className="rounded bg-accent px-3 py-1.5 font-medium text-white">Check the page and start</button>
      </form>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
        <li>At most 3 a day, and one per company every 90 days, each written for that company.</li>
        <li>If the company says it doesn&apos;t accept unsolicited applications, JobHunter won&apos;t send.</li>
        <li>One follow-up at most, after about 10 business days.</li>
        <li>If you know someone there, ask them first: referred candidates pass first screens far more often than cold ones.</li>
      </ul>
    </div>
  );
}
