import Link from "next/link";
import {
  approveEmailAction,
  cancelEmailAction,
  dismissReplyAction,
  emailDraftAction,
  prepareEmailAction,
  replyAction,
  saveEmailAction,
  testEmailAction,
} from "@/app/applications/actions";
import { FlagList } from "@/components/apply";
import { timeAgo } from "@/components/bits";
import type { OutboxRow } from "@/server/db/schema";
import { summarizeMime } from "@/server/lib/mime";
import { emailsFor, repliesFor, reviewDraft } from "@/server/outbox";
import { getAccount } from "@/server/mail/transport";

const card = "rounded-lg border border-line bg-surface p-4";
const btn = "rounded border border-line bg-bg px-3 py-1.5 text-sm hover:border-ink/40";
const primary = "rounded bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40";
const input = "w-full rounded border border-line bg-bg px-2 py-1.5 text-sm";

const time = (d: Date | null | undefined) => (d ? new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "");

/** Email for this application (Phase 4): draft → exact message → approval → queue → sent, plus follow-ups and replies. */
export async function EmailSection({ applicationId, channel, applied, title }: { applicationId: number; channel: string; applied: boolean; title: string }) {
  const [emails, replies, account] = await Promise.all([emailsFor(applicationId), repliesFor(applicationId), getAccount()]);
  const main = [...emails].reverse().find((e) => e.kind === "application" || e.kind === "speculative") ?? null;
  const followUps = emails.filter((e) => e.kind === "follow_up" && e.status !== "cancelled");
  const sent = emails.filter((e) => e.status === "sent");
  const proposed = replies.filter((r) => r.status === "proposed");
  const hidden = { name: "applicationId", value: applicationId };

  return (
    <section id="email" className={card}>
      <h2 className="font-medium">{title}</h2>
      {!account ? (
        <p className="mt-2 rounded bg-warn-soft px-3 py-2 text-sm text-warn">
          Connect your Gmail first in <Link href="/settings/email" className="underline">Settings → Email</Link>. You can still write the email now.
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">From {account.email}. Nothing is sent until you approve the exact message.</p>
      )}

      {proposed.map((r) => (
        <div key={r.id} className="mt-3 rounded border border-accent/40 bg-accent-soft p-3 text-sm">
          <div className="font-medium text-accent">Reply from {r.senderDomain ?? "the employer"} on {time(r.at)}. What was it?</div>
          <ReplyButtons applicationId={applicationId} eventId={r.id} />
          <form action={dismissReplyAction} className="mt-1"><input type="hidden" {...hidden} /><input type="hidden" name="eventId" value={r.id} /><button className="text-xs text-muted underline">Not a reply to this application</button></form>
        </div>
      ))}

      {!main ? (
        <form action={emailDraftAction} className="mt-3">
          <input type="hidden" {...hidden} />
          <button className={primary}>Write the email</button>
          <p className="mt-1 text-xs text-muted">{channel === "speculative" ? "A short note asking about openings, from your CV, with your CV attached." : "A short note from your CV, with your approved CV attached, to the address the posting gives."}</p>
        </form>
      ) : (
        <div className="mt-3 space-y-4">
          <EmailEditor row={main} applicationId={applicationId} label={main.kind === "speculative" ? "Speculative application" : "Application email"} />
          {followUps.map((f, i) => <EmailEditor key={f.id} row={f} applicationId={applicationId} label={`Follow-up ${i + 1}`} />)}
        </div>
      )}

      {applied || sent.length ? (
        <div className="mt-4 rounded border border-line p-3 text-sm">
          <div className="font-medium">Got a reply?</div>
          <p className="text-xs text-muted">Tell JobHunter what it was. It updates the stage and stops follow-ups.</p>
          <ReplyButtons applicationId={applicationId} />
        </div>
      ) : null}

      {sent.length ? (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium">Send log ({sent.length})</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="text-muted"><tr><th className="py-1 pr-2">Sent</th><th className="pr-2">To</th><th className="pr-2">Subject</th><th className="pr-2">Message-ID</th><th>SHA-256</th></tr></thead>
              <tbody>
                {sent.map((s) => (
                  <tr key={s.id} className="border-t border-line align-top">
                    <td className="py-1 pr-2">{time(s.sentAt)}</td><td className="pr-2">{s.toAddr}</td><td className="pr-2">{s.subject}</td>
                    <td className="break-all pr-2 font-mono">{s.messageId}</td><td className="font-mono">{s.mimeHash?.slice(0, 16)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </section>
  );
}

function ReplyButtons({ applicationId, eventId }: { applicationId: number; eventId?: number }) {
  const opts: [string, string][] = [["interview", "Interview invite"], ["info", "They asked for more"], ["rejection", "Rejection"], ["other", "Something else"]];
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {opts.map(([v, l]) => (
        <form key={v} action={replyAction}>
          <input type="hidden" name="applicationId" value={applicationId} />
          {eventId ? <input type="hidden" name="eventId" value={eventId} /> : null}
          <input type="hidden" name="category" value={v} />
          <button className={btn}>{l}</button>
        </form>
      ))}
    </div>
  );
}

const STATUS: Record<string, [string, string]> = {
  draft: ["Draft", "text-muted"],
  failed: ["Didn't send", "text-bad"],
  ready: ["Ready for your approval", "text-accent"],
  queued: ["Approved, waiting for its slot", "text-accent"],
  sending: ["Sending…", "text-accent"],
  sent: ["Sent", "text-good"],
};

async function EmailEditor({ row, applicationId, label }: { row: OutboxRow; applicationId: number; label: string }) {
  const hidden = [<input key="a" type="hidden" name="applicationId" value={applicationId} />, <input key="e" type="hidden" name="emailId" value={row.id} />];
  const [st, cls] = STATUS[row.status] ?? [row.status, "text-muted"];
  const head = (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <span className="font-medium">{label}</span>
      <span className={`text-xs ${cls}`}>{st}{row.status === "sent" ? ` ${time(row.sentAt)} to ${row.toAddr}` : ""}</span>
    </div>
  );

  if (row.status === "sent") return <div className="rounded border border-line p-3 text-sm">{head}<div className="mt-1 text-xs text-muted">Subject: {row.subject} · Message-ID {row.messageId}</div></div>;

  if (row.status === "queued" || row.status === "sending") {
    return (
      <div className="rounded border border-accent/40 p-3 text-sm">
        {head}
        <p className="mt-1">To {row.toAddr} · {row.sendAt && new Date(row.sendAt).getTime() > Date.now() ? `goes out at ${time(row.sendAt)} (a gap between sends keeps your account in good standing)` : "going out now"}.</p>
        {row.status === "queued" ? <form action={cancelEmailAction} className="mt-2">{hidden}<button className={btn}>Cancel</button></form> : null}
      </div>
    );
  }

  if (row.status === "ready" && row.mime) {
    const s = summarizeMime(row.mime);
    const show = ["From", "To", "Subject", "Date", "Message-ID", "In-Reply-To"];
    return (
      <div className="rounded border border-accent/40 p-3 text-sm">
        {head}
        <p className="mt-1 text-xs text-muted">This is the exact message that will be sent, byte for byte. Its fingerprint (SHA-256) is checked again just before sending.</p>
        <dl className="mt-2 space-y-0.5">
          {s.headers.filter(([k]) => show.includes(k)).map(([k, v]) => <div key={k}><dt className="inline text-muted">{k}: </dt><dd className="inline break-all">{k === "Subject" ? row.subject : v}</dd></div>)}
        </dl>
        <pre className="mt-2 whitespace-pre-wrap rounded bg-bg p-3 font-sans text-sm leading-relaxed">{row.body}</pre>
        <div className="mt-2 text-xs">
          {s.attachments.length ? s.attachments.map((a) => <div key={a.filename}>📎 {a.filename} · {(a.bytes / 1024).toFixed(0)} KB</div>) : <div className="text-muted">No attachments</div>}
          <div className="mt-1 text-muted">Message size {(s.size / 1024).toFixed(0)} KB · SHA-256 <span className="break-all font-mono">{row.mimeHash}</span></div>
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted">Show the raw message</summary>
          <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded bg-bg p-2 font-mono text-[11px]">{row.mime}</pre>
        </details>
        <form action={approveEmailAction} className="mt-3 space-y-2">
          {hidden}
          <input type="hidden" name="hash" value={row.mimeHash ?? ""} />
          <label className="flex items-start gap-2"><input type="checkbox" name="confirm" className="mt-1" /> <span>I&apos;ve read this message and want it sent to <strong>{row.toAddr}</strong>.</span></label>
          <div className="flex flex-wrap gap-2">
            <button className={primary}>Approve and send</button>
            <button formAction={testEmailAction} className={btn}>Send a test to myself first</button>
            <button formAction={cancelEmailAction} className={btn}>Back to editing</button>
          </div>
        </form>
      </div>
    );
  }

  // draft / failed: edit, with live checks
  const review = await reviewDraft(row);
  const overrides = "error" in review ? [] : review.recipient.filter((r) => r.severity === "override");
  return (
    <div className="rounded border border-line p-3 text-sm">
      {head}
      {row.status === "failed" && row.error ? <p className="mt-1 rounded bg-bad-soft px-3 py-2 text-bad">{row.error}</p> : null}
      <div className="mt-2 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <form action={saveEmailAction} className="space-y-2">
          {hidden}
          {row.kind === "follow_up" ? (
            <div><span className="text-muted">To: </span>{row.toAddr} <span className="text-xs text-muted">(same thread as your application)</span></div>
          ) : (
            <label className="block">
              <span className="mb-1 block font-medium">To</span>
              <input name="to" defaultValue={row.toAddr} className={input} placeholder={row.kind === "speculative" ? "The careers address on their site" : "The address the posting gives"} />
              {row.toSource?.quote ? <span className="mt-1 block text-xs text-muted">From the posting: &ldquo;{row.toSource.quote}&rdquo;</span> : null}
              {row.kind === "speculative" && row.toSource?.url ? <span className="mt-1 block break-all text-xs text-muted">Must appear on: {row.toSource.url}</span> : null}
            </label>
          )}
          <label className="block"><span className="mb-1 block font-medium">Subject</span><input name="subject" defaultValue={row.subject} className={input} /></label>
          <label className="block"><span className="mb-1 block font-medium">Message</span><textarea name="body" defaultValue={row.body} rows={14} className={`${input} font-mono text-[13px] leading-relaxed`} /></label>
          {row.kind !== "follow_up" ? (
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">CV
                <select name="attachCv" defaultValue={row.attach.cv ?? ""} className="rounded border border-line bg-bg px-2 py-1"><option value="pdf">PDF</option><option value="docx">Word</option><option value="">Don&apos;t attach</option></select>
              </label>
              <label className="flex items-center gap-2">Cover letter
                <select name="attachLetter" defaultValue={row.attach.letter ?? ""} className="rounded border border-line bg-bg px-2 py-1"><option value="">Don&apos;t attach</option><option value="pdf">PDF</option><option value="docx">Word</option></select>
              </label>
            </div>
          ) : null}
          {overrides.map((o) => (
            <label key={o.id} className="flex items-start gap-2 rounded bg-warn-soft px-3 py-2 text-warn">
              <input type="checkbox" name="override" value={o.id} defaultChecked={row.overrides.includes(o.id)} className="mt-1" />
              <span><strong>{o.title}.</strong> {o.why} Tick to confirm you&apos;ve checked it.</span>
            </label>
          ))}
          <div className="flex flex-wrap gap-2">
            <button className={btn}>Save and check</button>
            <button formAction={prepareEmailAction} className={primary} disabled={"error" in review || review.blockers.length > 0}>Show me the exact message</button>
          </div>
          <p className="text-xs text-muted">Only approved CV and letter files can be attached; JobHunter never attaches ID, passport or bank documents.</p>
        </form>
        <div className="space-y-3">
          {"error" in review ? <p className="text-bad">{review.error}</p> : (
            <>
              {review.blockers.length ? (
                <div className="rounded border border-bad/40 bg-bad-soft p-3">
                  <div className="font-medium text-bad">Before it can go</div>
                  <ul className="mt-1 list-disc pl-5 text-bad">{review.blockers.map((b, i) => <li key={i}>{b}</li>)}</ul>
                </div>
              ) : <p className="rounded bg-good-soft px-3 py-2 text-good">Ready to build the exact message.</p>}
              {review.recipient.filter((r) => r.severity === "warn").map((r) => <p key={r.id} className="rounded bg-warn-soft px-3 py-2 text-warn"><strong>{r.title}.</strong> {r.why}</p>)}
              <FlagList flags={review.flags.filter((f) => f.severity === "warn")} />
              {review.attachments.length ? <div className="text-xs text-muted">Attaching: {review.attachments.map((a) => `${a.name} (${(a.bytes / 1024).toFixed(0)} KB)`).join(", ")}</div> : null}
              {review.plan.ok ? <div className="text-xs text-muted">{review.plan.sendAt.getTime() - Date.now() < 30_000 ? "If approved now, it sends straight away." : `If approved now, it waits until ${time(review.plan.sendAt)} to keep a gap between sends.`}</div> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
