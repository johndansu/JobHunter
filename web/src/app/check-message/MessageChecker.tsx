"use client";

import Link from "next/link";
import { useActionState } from "react";
import { checkMessageAction, type CheckResult } from "./actions";

const input = "w-full rounded border border-line bg-bg px-2 py-1.5 text-sm";
const LEVEL = {
  high: ["High risk: treat this as a likely scam", "bg-bad-soft text-bad"],
  caution: ["Use caution: check this before you reply", "bg-warn-soft text-warn"],
  none: ["No red flags found", "bg-good-soft text-good"],
} as const;

export function MessageChecker() {
  const [state, action, pending] = useActionState<CheckResult, FormData>(checkMessageAction, null);
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <form action={action} className="space-y-3 rounded-lg border border-line bg-surface p-4 text-sm">
        <label className="block">
          <span className="font-medium">The message</span>
          <textarea name="text" rows={10} required className={`${input} mt-1`} placeholder="Paste the recruiter message, interview invite or offer" />
        </label>
        <label className="block">
          <span className="font-medium">Sender&apos;s email address</span>
          <input name="sender" className={`${input} mt-1`} placeholder="e.g. talent@company.com" />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="font-medium">Company they say they&apos;re from</span>
            <input name="company" className={`${input} mt-1`} />
          </label>
          <label className="block">
            <span className="font-medium">Company website (optional)</span>
            <input name="website" className={`${input} mt-1`} placeholder="company.com" />
          </label>
        </div>
        <button disabled={pending} className="rounded bg-accent px-3 py-1.5 font-medium text-white disabled:opacity-50">{pending ? "Checking…" : "Check message"}</button>
        <p className="text-xs text-muted">Checked on this computer. Nothing you paste is sent anywhere.</p>
      </form>

      <div className="space-y-3 text-sm">
        {state ? (
          <>
            <div className={`rounded px-3 py-2 font-medium ${LEVEL[state.level][1]}`}>{LEVEL[state.level][0]}</div>
            <ul className="space-y-2">
              {state.flags.map((f, i) => (
                <li key={i} className={`rounded border px-3 py-2 ${f.level === "high" ? "border-bad/40" : f.level === "caution" ? "border-warn/40" : "border-line"}`}>
                  <div className={f.level === "high" ? "font-medium text-bad" : f.level === "caution" ? "font-medium text-warn" : "font-medium"}>{f.title}</div>
                  {f.quote ? <div className="mt-0.5 text-xs text-muted">&ldquo;{f.quote}&rdquo;</div> : null}
                </li>
              ))}
            </ul>
            {state.searched ? (
              <div className="rounded border border-line bg-surface px-3 py-2">
                {state.liveJobs.length ? (
                  <>
                    <div className="font-medium">Live jobs from {state.company} in JobHunter</div>
                    <ul className="mt-1 list-disc pl-5">
                      {state.liveJobs.map((j) => <li key={j.id}><Link href={`/jobs/${j.id}`} className="underline">{j.title}</Link></li>)}
                    </ul>
                    <p className="mt-1 text-xs text-muted">If the message is about one of these, apply through the employer&apos;s own page rather than any link in the message.</p>
                  </>
                ) : (
                  <p>No live jobs from {state.company} in JobHunter. That isn&apos;t proof of a scam (we don&apos;t index every employer), but check the company&apos;s own careers page for the role.</p>
                )}
                {state.companyDomain ? <p className="mt-1 text-xs text-muted">Company domain used for the check: {state.companyDomain}</p> : null}
              </div>
            ) : null}
            {state.level === "none" ? <p className="text-xs text-muted">No rule fired, but rules can&apos;t catch everything. Never pay to get a job, and never send ID or bank details before a written offer you&apos;ve verified.</p> : null}
          </>
        ) : (
          <div className="rounded-lg border border-line bg-surface p-4 text-muted">
            <p className="font-medium text-ink">What this looks for</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Requests to pay for training, equipment or a visa, or to pay in crypto or gift cards</li>
              <li>Interviews only by Telegram, WhatsApp, Signal or text chat</li>
              <li>Requests for your passport, BVN, NIN or bank details before a verified offer</li>
              <li>Offers without an interview, cheque-and-forward and reshipping schemes</li>
              <li>A sender domain that isn&apos;t the company&apos;s, or one made to look like it</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
