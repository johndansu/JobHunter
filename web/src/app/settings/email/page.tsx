import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { timeAgo } from "@/components/bits";
import { db } from "@/server/db";
import { outbox } from "@/server/db/schema";
import { DAILY_CAP } from "@/server/lib/sendPolicy";
import { oauthConfigured, SCOPE_METADATA } from "@/server/mail/gmail";
import { getAccount } from "@/server/mail/transport";
import { connectAppPasswordAction, deleteAllDataAction, disconnectAction, replyDetectionOffAction, testSendAction } from "./actions";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function EmailSettingsPage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <EmailSettings searchParams={searchParams} />
    </Suspense>
  );
}

const card = "rounded-lg border border-line bg-surface p-4 text-sm";
const btn = "rounded border border-line bg-bg px-3 py-1.5 text-sm hover:border-ink/40";
const primary = "rounded bg-accent px-3 py-1.5 text-sm font-medium text-white";
const input = "w-full rounded border border-line bg-bg px-2 py-1.5";

async function EmailSettings({ searchParams }: { searchParams: SP }) {
  await connection();
  const sp = await searchParams;
  const [account, h] = await Promise.all([getAccount(), headers()]);
  const origin = process.env.APP_URL?.replace(/\/$/, "") || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3100"}`;
  const redirectUri = `${origin}/api/mail/google/callback`;
  const [{ n: sent24 }] = await db.select({ n: sql<number>`count(*)::int` }).from(outbox).where(and(eq(outbox.status, "sent"), gt(outbox.sentAt, sql`now() - interval '24 hours'`), sql`${outbox.kind} <> 'test'`));
  const [{ n: queued }] = await db.select({ n: sql<number>`count(*)::int` }).from(outbox).where(inArray(outbox.status, ["queued", "sending"]));
  const configured = oauthConfigured();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Email</h1>
        <p className="text-sm text-muted">Send applications from your own Gmail. Nothing is sent without your approval of the exact message, and JobHunter never reads your inbox.</p>
      </div>
      {typeof sp.error === "string" ? <p className="rounded bg-bad-soft px-3 py-2 text-sm text-bad">{sp.error}</p> : null}
      {typeof sp.ok === "string" ? <p className="rounded bg-good-soft px-3 py-2 text-sm text-good">{sp.ok}</p> : null}
      {sp.connected ? <p className="rounded bg-good-soft px-3 py-2 text-sm text-good">Gmail is connected. Send yourself a test to check it.</p> : null}
      {sp.disconnected ? <p className="rounded bg-good-soft px-3 py-2 text-sm text-good">Gmail is disconnected and the stored credential was deleted.</p> : null}

      {/* Provider health (MAIL-18) */}
      <section className={card}>
        <h2 className="mb-2 font-medium">Connection</h2>
        {account ? (
          <div className="space-y-3">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
              <div><dt className="inline text-muted">Address: </dt><dd className="inline font-medium">{account.email}</dd></div>
              <div><dt className="inline text-muted">Method: </dt><dd className="inline">{account.method === "gmail_oauth" ? "Google sign-in (send-only)" : "App password"}</dd></div>
              <div><dt className="inline text-muted">Connected: </dt><dd className="inline">{timeAgo(account.connectedAt)}</dd></div>
              <div><dt className="inline text-muted">Last successful send: </dt><dd className="inline">{account.lastOkAt ? timeAgo(account.lastOkAt) : "none yet"}</dd></div>
              <div><dt className="inline text-muted">Sent in the last 24 hours: </dt><dd className="inline">{sent24} of {DAILY_CAP}</dd></div>
              <div><dt className="inline text-muted">Waiting in the queue: </dt><dd className="inline">{queued}</dd></div>
            </dl>
            {account.lastError ? <p className="rounded bg-bad-soft px-3 py-2 text-bad">Problem {account.lastErrorAt ? timeAgo(account.lastErrorAt) : ""}: {account.lastError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <form action={testSendAction}><button className={primary}>Send a test to myself</button></form>
              <form action={disconnectAction}><button className={btn}>Disconnect</button></form>
            </div>
            <div className="rounded border border-line p-3">
              <div className="font-medium">Reply detection {account.replyDetection ? <span className="text-good">(on)</span> : <span className="text-muted">(off)</span>}</div>
              <p className="mt-1 text-muted">
                Optional. JobHunter checks only the email threads it sent, reads only the headers (who replied and when, never the message), and asks you what each reply was. It needs Google&apos;s &ldquo;view your email message metadata&rdquo; permission. Without it, use the &ldquo;Got a reply&rdquo; buttons on each application.
              </p>
              {account.method !== "gmail_oauth" ? <p className="mt-1 text-xs text-muted">Needs the Google sign-in method; app passwords can only send.</p> : account.replyDetection ? (
                <form action={replyDetectionOffAction} className="mt-2"><button className={btn}>Turn off</button></form>
              ) : (
                <a href="/api/mail/google/start?replies=1" className={`${btn} mt-2 inline-block`}>{account.scopes.includes(SCOPE_METADATA) ? "Turn on again" : "Turn on (Google will ask)"}</a>
              )}
            </div>
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
              <li>JobHunter sends at most {DAILY_CAP} new emails a day, 2–5 minutes apart. Personal Gmail allows 500 recipients a day, so you&apos;re far inside Google&apos;s limits.</li>
              {account.method === "gmail_app_password" ? <li>Google revokes app passwords when you change your Google password. If sending stops, create a new one.</li> : <li>You can remove access any time at myaccount.google.com/permissions.</li>}
            </ul>
          </div>
        ) : <p className="text-muted">Not connected. Choose one of the two ways below.</p>}
      </section>

      {!account ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className={card}>
            <h2 className="font-medium">Recommended: your own Google sign-in</h2>
            <p className="mt-1 text-muted">About 10 minutes, once. You create a small Google Cloud project with your own Google account, so the access belongs to you and can only send email.</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Open <a className="text-accent underline" href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener">Google Cloud</a> with your Gmail account and create a project (any name, e.g. &ldquo;JobHunter&rdquo;).</li>
              <li>Turn on the <a className="text-accent underline" href="https://console.cloud.google.com/apis/library/gmail.googleapis.com" target="_blank" rel="noopener">Gmail API</a> for that project.</li>
              <li>Open <a className="text-accent underline" href="https://console.cloud.google.com/auth/overview" target="_blank" rel="noopener">Google Auth Platform</a> and set it up: app name &ldquo;JobHunter&rdquo;, your address as the contact. For the audience, choose the option for your own personal use if Google offers it. Otherwise choose External, add your own address as a test user, then publish the app (so access doesn&apos;t expire after 7 days). Google may warn the app is unverified; it&apos;s your own app, so you can continue.</li>
              <li>Under <a className="text-accent underline" href="https://console.cloud.google.com/auth/clients" target="_blank" rel="noopener">Clients</a>, create a <strong>Web application</strong> client with this authorized redirect URI:
                <code className="mt-1 block break-all rounded bg-bg px-2 py-1 font-mono text-xs">{redirectUri}</code>
              </li>
              <li>Put its client ID and secret in <code className="font-mono text-xs">web/.env</code> as <code className="font-mono text-xs">GOOGLE_CLIENT_ID</code> and <code className="font-mono text-xs">GOOGLE_CLIENT_SECRET</code>, then restart the app.</li>
              <li>Come back here and connect. Google will ask you to allow sending email; JobHunter asks for nothing else.</li>
            </ol>
            {configured ? <a href="/api/mail/google/start" className={`${primary} mt-3 inline-block`}>Connect Gmail</a> : <p className="mt-3 rounded bg-warn-soft px-3 py-2 text-warn">Waiting for GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env (then restart the app).</p>}
          </section>
          <section className={card}>
            <h2 className="font-medium">Fallback: a Gmail app password</h2>
            <p className="mt-1 text-muted">
              Quicker, but Google calls it less secure, and it stops working when you change your Google password. It needs 2-Step Verification. Create one at <a className="text-accent underline" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener">myaccount.google.com/apppasswords</a> (name it &ldquo;JobHunter&rdquo;) and paste the 16 letters here. It&apos;s checked with Gmail, then stored encrypted on this computer.
            </p>
            <form action={connectAppPasswordAction} className="mt-3 space-y-2">
              <label className="block"><span className="mb-1 block">Gmail address</span><input name="email" type="email" autoComplete="email" className={input} /></label>
              <label className="block"><span className="mb-1 block">App password</span><input name="password" type="password" autoComplete="off" className={input} placeholder="xxxx xxxx xxxx xxxx" /></label>
              <button className={btn}>Check and connect</button>
            </form>
          </section>
        </div>
      ) : null}

      <section className={card}>
        <h2 className="font-medium">Your data</h2>
        <p className="mt-1 text-muted">Download everything JobHunter holds about your search, or delete it. Job listings aren&apos;t personal data and are kept.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/api/export?format=json" className={btn}>Download all (JSON)</a>
          <a href="/api/export?format=csv" className={btn}>Applications (CSV)</a>
          <a href="/api/export?format=sends" className={btn}>Send log (CSV)</a>
        </div>
        <details className="mt-4">
          <summary className="cursor-pointer text-bad">Delete all my data</summary>
          <form action={deleteAllDataAction} className="mt-2 flex flex-wrap items-center gap-2">
            <input name="confirm" placeholder="Type DELETE" className="w-40 rounded border border-line bg-bg px-2 py-1.5" />
            <button className="rounded bg-bad px-3 py-1.5 text-sm font-medium text-white">Delete profile, CV, applications, emails and the Gmail connection</button>
          </form>
        </details>
      </section>
    </div>
  );
}
