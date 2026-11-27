import { promises as dns } from "node:dns";
import { and, asc, desc, eq, inArray, isNotNull, lte, ne, sql } from "drizzle-orm";
import { approvedFile, contextForApp, logEvent, setStage, type Ctx, type Stage } from "./applications";
import { db } from "./db";
import { applications, documents, outbox, replyEvents, type OutboxRow } from "./db/schema";
import type { Flag } from "./lib/checks";
import { applicationEmailBody, dayMonth, defaultSubject, emailChecks, followUpBody, postingSubject, speculativeEmailBody } from "./lib/emailDraft";
import { buildMime, mimeHash, newMessageId, type Attachment } from "./lib/mime";
import { normCompany } from "./lib/normalize";
import { checkRecipient, unresolved, type RecipientIssue } from "./lib/recipients";
import { DAILY_CAP, nextFollowUpDue, planSend, type PastSend, type SendKind } from "./lib/sendPolicy";
import { getAccount, markError, markOk, SendError, transportFor } from "./mail/transport";

/**
 * The outbox (Phase 4). An email moves draft → ready → queued → sent:
 *  - draft: the candidate edits recipient, subject, note and attachments;
 *  - ready: the exact MIME message is built and shown in full with its hash;
 *  - queued: the candidate approved those bytes; the worker sends them at their slot;
 *  - sent / failed / cancelled.
 * Nothing leaves without an explicit approval of the exact message (AUTH-05, MAIL-08).
 */

const MB = 1024 * 1024;
const WARN_BYTES = 5 * MB;
const MAX_BYTES = 10 * MB;
const MAX_ATTEMPTS = 3;

// ---------- reading ----------

export async function emailsFor(applicationId: number) {
  return db.select().from(outbox).where(eq(outbox.applicationId, applicationId)).orderBy(asc(outbox.createdAt));
}

export async function repliesFor(applicationId: number) {
  return db.select().from(replyEvents).where(eq(replyEvents.applicationId, applicationId)).orderBy(desc(replyEvents.at));
}

/** Sends and queued sends, for caps and gaps. */
async function sendHistory(): Promise<PastSend[]> {
  const rows = await db
    .select({ at: sql<Date>`coalesce(${outbox.sentAt}, ${outbox.sendAt})`, kind: outbox.kind, company: sql<string | null>`coalesce(${applications.specCompany}, (select company from jobs where jobs.id = ${applications.jobId}))` })
    .from(outbox)
    .leftJoin(applications, eq(applications.id, outbox.applicationId))
    .where(and(inArray(outbox.status, ["queued", "sending", "sent"]), sql`${outbox.sentAt} > now() - interval '120 days' or ${outbox.sendAt} > now() - interval '120 days'`));
  return rows.map((r) => ({ at: new Date(r.at), kind: r.kind as SendKind, companyKey: r.company ? normCompany(r.company) : null }));
}

const mxCache = new Map<string, { ok: boolean; until: number }>();

/** Does the domain receive email? MX records, or an address record as the fallback (RFC 5321). */
export async function receivesMail(domain: string): Promise<boolean | null> {
  const hit = mxCache.get(domain);
  if (hit && hit.until > Date.now()) return hit.ok;
  const withTimeout = <T,>(p: Promise<T>) => Promise.race([p, new Promise<never>((_, r) => setTimeout(() => r(new Error("timeout")), 5000))]);
  try {
    const mx = await withTimeout(dns.resolveMx(domain)).catch(() => []);
    const ok = mx.length > 0 || (await withTimeout(dns.resolve4(domain)).then((a) => a.length > 0).catch(() => false));
    mxCache.set(domain, { ok, until: Date.now() + 3600_000 });
    return ok;
  } catch {
    return null; // DNS trouble: unknown, not a block
  }
}

export type Review = {
  recipient: RecipientIssue[];
  flags: Flag[];
  attachments: { name: string; bytes: number }[];
  attachmentProblems: string[];
  blockers: string[];
  plan: { ok: true; sendAt: Date; gapSeconds: number } | { ok: false; reason: string; retryAt: Date | null };
};

async function draftContext(row: OutboxRow): Promise<{ error: string } | { app: typeof applications.$inferSelect; ctx: Ctx }> {
  if (!row.applicationId) return { error: "This email isn't linked to an application" };
  const [app] = await db.select().from(applications).where(eq(applications.id, row.applicationId));
  if (!app) return { error: "Application not found" };
  const ctx = await contextForApp(app);
  if ("error" in ctx) return { error: ctx.error };
  return { app, ctx };
}

async function attachmentsFor(row: OutboxRow): Promise<{ files: (Attachment & { contentHash: string })[]; problems: string[] }> {
  const files: (Attachment & { contentHash: string })[] = [];
  const problems: string[] = [];
  for (const kind of ["cv", "letter"] as const) {
    const fmt = row.attach[kind];
    if (!fmt || !row.applicationId) continue;
    const f = await approvedFile(row.applicationId, kind, fmt, { log: false });
    if ("error" in f) problems.push(`${kind === "cv" ? "CV" : "Cover letter"}: ${f.error}`);
    else files.push({ filename: f.fileName, contentType: f.type, bytes: f.bytes, contentHash: f.contentHash });
  }
  if (row.kind !== "follow_up" && !row.attach.cv) problems.push("Attach your CV.");
  const total = files.reduce((n, f) => n + f.bytes.length, 0);
  if (total > MAX_BYTES) problems.push(`Attachments are ${(total / MB).toFixed(1)} MB; the limit is 10 MB.`);
  return { files, problems };
}

/** Everything that decides whether this draft may go, and when. */
export async function reviewDraft(row: OutboxRow): Promise<Review | { error: string }> {
  const dc = await draftContext(row);
  if ("error" in dc) return { error: dc.error };
  const { app, ctx } = dc;
  const t = ctx.target;
  const sent = await db.select({ id: outbox.id }).from(outbox).where(and(eq(outbox.applicationId, app.id), eq(outbox.status, "sent"), eq(outbox.toAddr, row.toAddr), ne(outbox.kind, "follow_up"), ne(outbox.id, row.id)));
  const recipient = checkRecipient({
    email: row.toAddr,
    kind: row.kind === "follow_up" ? "follow_up" : row.kind === "speculative" ? "speculative" : "application",
    sourceText: row.kind === "speculative" ? app.specSourceText : t.text,
    sourceUrl: row.kind === "speculative" ? app.specSourceUrl : null,
    company: t.company,
    companyDomain: t.companyDomain,
    alreadySent: sent.length > 0,
  });
  const domain = row.toAddr.split("@")[1];
  if (domain && row.kind !== "follow_up" && !recipient.some((r) => r.id === "syntax")) {
    const ok = await receivesMail(domain);
    if (ok === false) recipient.push({ id: "no_mx", severity: "block", title: `${domain} doesn't receive email`, why: "There's no mail server for that domain, so the email would bounce. Check the address." });
  }
  const appliedOn = app.appliedAt ? dayMonth(app.appliedAt, ctx.profile.timezone) : "";
  const flags = emailChecks({ body: row.body, kind: row.kind as "application" | "speculative" | "follow_up", cv: ctx.cv, profile: ctx.profile, company: t.company, title: t.title, jobText: t.text, overlapNote: t.overlapNote, allowed: appliedOn ? [appliedOn] : [] });
  if (!row.subject.trim()) flags.push({ id: "subject", severity: "block", title: "The email has no subject", why: "Add a subject; the posting's own wording is best." });
  const { files, problems } = await attachmentsFor(row);
  const total = files.reduce((n, f) => n + f.bytes.length, 0);
  if (total > WARN_BYTES && total <= MAX_BYTES) flags.push({ id: "size", severity: "warn", title: `Attachments are ${(total / MB).toFixed(1)} MB`, why: "Large attachments can be stripped or bounced. Keep under 5 MB if you can." });
  const plan = planSend({ kind: row.kind as SendKind, companyKey: normCompany(t.company), now: new Date(), history: await sendHistory() });
  const account = await getAccount();
  const blockers = [
    ...(!account ? ["Connect Gmail first (Settings → Email)."] : []),
    ...unresolved(recipient, row.overrides).map((r) => r.title),
    ...flags.filter((f) => f.severity === "block").map((f) => f.title),
    ...problems,
    ...(!plan.ok ? [plan.reason] : []),
  ];
  return { recipient, flags, attachments: files.map((f) => ({ name: f.filename, bytes: f.bytes.length })), attachmentProblems: problems, blockers, plan };
}

// ---------- drafting ----------

/** The application's email draft, created on first use from the posting and the CV. */
export async function ensureDraft(applicationId: number): Promise<OutboxRow | { error: string }> {
  const [existing] = await db.select().from(outbox).where(and(eq(outbox.applicationId, applicationId), inArray(outbox.kind, ["application", "speculative"]), inArray(outbox.status, ["draft", "ready", "queued", "sending", "failed"]))).orderBy(desc(outbox.createdAt)).limit(1);
  if (existing) return existing;
  const [app] = await db.select().from(applications).where(eq(applications.id, applicationId));
  if (!app) return { error: "Application not found" };
  const ctx = await contextForApp(app);
  if ("error" in ctx) return ctx;
  const t = ctx.target;
  const name = ctx.cv.contact.name ?? "[Your name]";
  const speculative = !app.jobId;
  const [letter] = await db.select({ approvedAt: documents.approvedAt }).from(documents).where(and(eq(documents.applicationId, applicationId), eq(documents.kind, "letter")));
  const wantsLetter = !!letter?.approvedAt || ["required", "asked"].includes(app.preflight?.letter ?? "");
  const asked = !speculative ? postingSubject(t.text) : null;
  const pre = app.preflight?.applyEmail;
  const [row] = await db
    .insert(outbox)
    .values({
      applicationId,
      kind: speculative ? "speculative" : "application",
      toAddr: speculative ? "" : pre?.email ?? "",
      toSource: speculative ? { kind: "company_site", url: app.specSourceUrl, quote: null, capturedAt: new Date().toISOString() } : { kind: "posting", url: t.job?.applyUrl ?? null, quote: pre?.quote ?? null, capturedAt: new Date().toISOString() },
      subject: asked?.subject ?? defaultSubject({ kind: speculative ? "speculative" : "application", title: t.title, name }),
      body: speculative
        ? speculativeEmailBody({ company: t.company, roleArea: t.title, profile: ctx.profile, cv: ctx.cv })
        : applicationEmailBody({ company: t.company, title: t.title, evidence: app.evidence, profile: ctx.profile, cv: ctx.cv, overlapNote: t.overlapNote, withLetter: wantsLetter }),
      attach: { cv: "pdf", letter: wantsLetter ? "pdf" : null },
    })
    .returning();
  return row;
}

/** Edit a draft (or a ready message, which goes back to draft). Queued or sent emails can't be edited. */
export async function updateDraft(id: number, d: { toAddr?: string; subject?: string; body?: string; attach?: OutboxRow["attach"]; overrides?: string[] }) {
  const [row] = await db.select().from(outbox).where(eq(outbox.id, id));
  if (!row) return { error: "Email not found" };
  if (!["draft", "ready", "failed"].includes(row.status)) return { error: "This email is already queued or sent. Cancel it first to change it." };
  const toAddr = d.toAddr?.trim().toLowerCase();
  const overrides = toAddr !== undefined && toAddr !== row.toAddr ? [] : d.overrides ?? row.overrides; // a new address needs fresh confirmations
  await db
    .update(outbox)
    .set({ ...(toAddr !== undefined && row.kind !== "follow_up" ? { toAddr } : {}), ...(d.subject !== undefined ? { subject: d.subject.trim() } : {}), ...(d.body !== undefined ? { body: d.body.replace(/\r\n/g, "\n") } : {}), ...(d.attach ? { attach: d.attach } : {}), overrides, status: "draft", mime: null, mimeHash: null, messageId: null, approvedAt: null, error: null, updatedAt: new Date() })
    .where(eq(outbox.id, id));
  return { ok: true };
}

/** Build the exact message (draft → ready). Fails if anything still blocks. */
export async function prepareMessage(id: number) {
  const [row] = await db.select().from(outbox).where(eq(outbox.id, id));
  if (!row) return { error: "Email not found" };
  if (!["draft", "failed"].includes(row.status)) return { error: "This email is already prepared." };
  const review = await reviewDraft(row);
  if ("error" in review) return review;
  if (review.blockers.length) return { error: `Fix these first: ${review.blockers.join("; ")}` };
  const account = (await getAccount())!;
  const dc = await draftContext(row);
  if ("error" in dc) return { error: dc.error };
  const { files } = await attachmentsFor(row);
  const messageId = newMessageId(account.email);
  const mime = buildMime({
    from: { name: dc.ctx.cv.contact.name ?? account.name, email: account.email },
    to: [row.toAddr],
    subject: row.subject,
    text: row.body,
    date: new Date(),
    messageId,
    inReplyTo: row.inReplyTo,
    references: row.inReplyTo ? [row.inReplyTo] : [],
    attachments: files,
  });
  await db.update(outbox).set({ status: "ready", mime, mimeHash: mimeHash(mime), messageId, cvHash: files.find((f) => /-CV\./.test(f.filename))?.contentHash ?? null, error: null, updatedAt: new Date() }).where(eq(outbox.id, id));
  return { ok: true };
}

/**
 * Approve the exact prepared bytes and queue them (ready → queued). The slot
 * respects the daily cap and a random 2–5 minute gap. `expectedHash` must be the
 * hash shown in the preview, so what's approved is what was seen.
 */
export async function approveAndQueue(id: number, expectedHash: string) {
  const [row] = await db.select().from(outbox).where(eq(outbox.id, id));
  if (!row?.mime) return { error: "Prepare the message first." };
  if (row.status !== "ready") return { error: "This email isn't waiting for approval." };
  if (row.mimeHash !== expectedHash || mimeHash(row.mime) !== expectedHash) return { error: "The message changed after you looked at it. Review it again." };
  const plan = planSend({ kind: row.kind as SendKind, companyKey: row.applicationId ? await companyKeyOf(row.applicationId) : null, now: new Date(), history: await sendHistory() });
  if (!plan.ok) return { error: plan.reason };
  await db.update(outbox).set({ status: "queued", approvedAt: new Date(), sendAt: plan.sendAt, updatedAt: new Date() }).where(eq(outbox.id, id));
  if (row.applicationId) await logEvent(row.applicationId, "email", `Email to ${row.toAddr} approved; sends ${plan.sendAt.getTime() - Date.now() < 30_000 ? "now" : `at ${plan.sendAt.toISOString().slice(11, 16)} UTC`}`);
  return { ok: true, sendAt: plan.sendAt };
}

async function companyKeyOf(applicationId: number): Promise<string | null> {
  const [r] = await db.select({ c: sql<string | null>`coalesce(${applications.specCompany}, (select company from jobs where jobs.id = ${applications.jobId}))` }).from(applications).where(eq(applications.id, applicationId));
  return r?.c ? normCompany(r.c) : null;
}

/** Cancel until it goes (MAIL-17): back to draft. */
export async function cancelEmail(id: number) {
  const [row] = await db.update(outbox).set({ status: "draft", mime: null, mimeHash: null, messageId: null, approvedAt: null, sendAt: null, updatedAt: new Date() }).where(and(eq(outbox.id, id), inArray(outbox.status, ["ready", "queued", "failed"]))).returning();
  if (!row) return { error: "Too late: it's already being sent, or it was sent." };
  if (row.applicationId) await logEvent(row.applicationId, "email", "Email cancelled before sending");
  return { ok: true };
}

/** "Send a test to myself": the same message, addressed to you, sent now and outside the caps. */
export async function sendTestToSelf(id: number) {
  const [row] = await db.select().from(outbox).where(eq(outbox.id, id));
  if (!row) return { error: "Email not found" };
  const account = await getAccount();
  if (!account) return { error: "Connect Gmail first." };
  const dc = await draftContext(row);
  if ("error" in dc) return { error: dc.error };
  const { files, problems } = await attachmentsFor(row);
  if (problems.length) return { error: problems.join("; ") };
  const messageId = newMessageId(account.email);
  const mime = buildMime({ from: { name: dc.ctx.cv.contact.name ?? account.name, email: account.email }, to: [account.email], subject: `[Test] ${row.subject}`, text: row.body, date: new Date(), messageId, attachments: files });
  const [t] = await db.insert(outbox).values({ applicationId: row.applicationId, kind: "test", status: "queued", toAddr: account.email, toSource: { kind: "self", url: null, quote: null, capturedAt: new Date().toISOString() }, subject: `[Test] ${row.subject}`, body: row.body, attach: row.attach, mime, mimeHash: mimeHash(mime), messageId, approvedAt: new Date(), sendAt: new Date() }).returning();
  const r = await processQueue({ onlyId: t.id });
  return r.sent ? { ok: true, id: t.id, hash: t.mimeHash! } : { error: r.error ?? "The test didn't send." };
}

/** Settings → "Send a test to myself": a short note through the real send path. */
export async function sendConnectionTest(): Promise<{ ok: true } | { error: string }> {
  const account = await getAccount();
  if (!account) return { error: "Connect Gmail first." };
  const messageId = newMessageId(account.email);
  const text = "This is a test from JobHunter on your computer. If you can read this, sending works.\n\nNothing else was sent.";
  const mime = buildMime({ from: { name: account.name, email: account.email }, to: [account.email], subject: "JobHunter test email", text, date: new Date(), messageId });
  const [t] = await db.insert(outbox).values({ kind: "test", status: "queued", toAddr: account.email, toSource: { kind: "self", url: null, quote: null, capturedAt: new Date().toISOString() }, subject: "JobHunter test email", body: text, attach: { cv: null, letter: null }, mime, mimeHash: mimeHash(mime), messageId, approvedAt: new Date(), sendAt: new Date() }).returning();
  const r = await processQueue({ onlyId: t.id });
  return r.sent ? { ok: true } : { error: r.error ?? "The test didn't send." };
}

// ---------- sending ----------

let working: Promise<{ sent: number; error?: string }> | null = null;

/** Send what's due, one at a time (gaps were planned at approval). Re-checks the hash and the cap first. */
export function processQueue(o: { onlyId?: number } = {}): Promise<{ sent: number; error?: string }> {
  if (o.onlyId) return sendOne(o.onlyId);
  working ??= (async () => {
    let sent = 0;
    for (;;) {
      const [due] = await db.select({ id: outbox.id }).from(outbox).where(and(eq(outbox.status, "queued"), lte(outbox.sendAt, new Date()), ne(outbox.kind, "test"))).orderBy(asc(outbox.sendAt)).limit(1);
      if (!due) break;
      const r = await sendOne(due.id);
      sent += r.sent;
      if (!r.sent) return { sent, error: r.error };
    }
    return { sent };
  })().finally(() => (working = null));
  return working;
}

async function sendOne(id: number): Promise<{ sent: number; error?: string }> {
  // Claim it atomically so two workers can never send the same email.
  const [row] = await db.update(outbox).set({ status: "sending", updatedAt: new Date() }).where(and(eq(outbox.id, id), eq(outbox.status, "queued"))).returning();
  if (!row) return { sent: 0 };
  const fail = async (error: string, retry: boolean) => {
    const attempts = row.attempts + 1;
    const again = retry && attempts < MAX_ATTEMPTS;
    await db.update(outbox).set({ status: again ? "queued" : "failed", error, attempts, sendAt: again ? new Date(Date.now() + 15 * 60_000) : row.sendAt, updatedAt: new Date() }).where(eq(outbox.id, id));
    if (row.applicationId && !again) await logEvent(row.applicationId, "email", `Email to ${row.toAddr} failed: ${error}`);
    return { sent: 0, error };
  };
  if (!row.mime || !row.approvedAt || mimeHash(row.mime) !== row.mimeHash) return fail("The message doesn't match what was approved, so it wasn't sent.", false);
  if (row.kind !== "test") {
    const recent = (await sendHistory()).filter((h) => h.kind !== "test" && h.at.getTime() > Date.now() - 86400_000 && h.at.getTime() <= Date.now());
    if (recent.length > DAILY_CAP) return fail(`The ${DAILY_CAP}-a-day ceiling was reached; it will try again later.`, true);
  }
  const account = await getAccount();
  if (!account) return fail("Gmail isn't connected.", false);
  try {
    const r = await transportFor(account).send(row.mime, { to: [row.toAddr], threadId: row.threadId });
    const now = new Date();
    await db.update(outbox).set({ status: "sent", sentAt: now, providerId: r.providerId, threadId: r.threadId ?? row.threadId, error: null, attempts: row.attempts + 1, updatedAt: now }).where(eq(outbox.id, id));
    await markOk();
    if (row.applicationId && row.kind !== "test") {
      await logEvent(row.applicationId, "email", `${row.kind === "follow_up" ? "Follow-up" : "Email"} sent to ${row.toAddr} (Message-ID ${row.messageId})`);
      const [app] = await db.select({ stage: applications.stage }).from(applications).where(eq(applications.id, row.applicationId));
      if (app?.stage === "saved") await setStage(row.applicationId, "applied");
    }
    return { sent: 1 };
  } catch (e) {
    const se = e instanceof SendError ? e : new SendError((e as Error).message, false, true);
    if (se.auth) await markError(se.message);
    return fail(se.message, se.retryable);
  }
}

// ---------- follow-ups and replies ----------

/** Draft due follow-ups (MAIL-14): in the same thread, at most two, only while you're still waiting. */
export async function ensureFollowUps(now = new Date()) {
  const sent = await db
    .select({ o: outbox, stage: applications.stage, appliedAt: applications.appliedAt, jobId: applications.jobId })
    .from(outbox)
    .innerJoin(applications, eq(applications.id, outbox.applicationId))
    .where(and(eq(outbox.status, "sent"), inArray(outbox.kind, ["application", "speculative"])));
  let created = 0;
  for (const { o, stage, appliedAt } of sent) {
    if (stage !== "applied" || !o.applicationId || !o.sentAt) continue;
    const ups = await db.select().from(outbox).where(and(eq(outbox.applicationId, o.applicationId), eq(outbox.kind, "follow_up"), ne(outbox.status, "cancelled")));
    if (ups.some((u) => u.status !== "sent")) continue; // one pending at a time
    const replied = (await db.select({ id: replyEvents.id }).from(replyEvents).where(and(eq(replyEvents.applicationId, o.applicationId), ne(replyEvents.category, "auto_reply"), ne(replyEvents.status, "dismissed")))).length > 0;
    const due = nextFollowUpDue({ kind: o.kind as "application" | "speculative", sentAt: o.sentAt, followUps: ups.map((u) => u.sentAt!).filter(Boolean), replied });
    if (!due || due > now) continue;
    const [app] = await db.select().from(applications).where(eq(applications.id, o.applicationId));
    const ctx = app ? await contextForApp(app) : null;
    if (!ctx || "error" in ctx) continue;
    await db.insert(outbox).values({
      applicationId: o.applicationId,
      kind: "follow_up",
      toAddr: o.toAddr,
      toSource: { kind: "thread", url: null, quote: null, capturedAt: new Date().toISOString() },
      subject: /^re:/i.test(o.subject) ? o.subject : `Re: ${o.subject}`,
      body: followUpBody({ company: ctx.target.company, title: ctx.target.title, cv: ctx.cv, n: ups.length + 1, appliedOn: dayMonth(appliedAt ?? o.sentAt, ctx.profile.timezone) }),
      attach: { cv: null, letter: null },
      inReplyTo: o.messageId,
      threadId: o.threadId,
    });
    await logEvent(o.applicationId, "email", `Follow-up ${ups.length + 1} drafted for your review`);
    created++;
  }
  return created;
}

const STAGE_FOR: Record<string, Stage | null> = { interview: "interviewing", rejection: "rejected", info: "screening", reply: null, other: null, auto_reply: null };

/** "Got a reply" (manual) or confirming a detected one: the candidate picks what it was. */
export async function confirmReply(o: { applicationId: number; eventId?: number; category: "interview" | "rejection" | "info" | "other" }) {
  if (o.eventId) await db.update(replyEvents).set({ status: "confirmed", category: o.category }).where(and(eq(replyEvents.id, o.eventId), eq(replyEvents.applicationId, o.applicationId)));
  else await db.insert(replyEvents).values({ applicationId: o.applicationId, category: o.category, source: "manual", status: "confirmed" });
  await logEvent(o.applicationId, "reply", `Reply recorded: ${o.category}`);
  const stage = STAGE_FOR[o.category];
  if (stage) await setStage(o.applicationId, stage);
  // Pending follow-ups are no longer appropriate.
  await db.update(outbox).set({ status: "cancelled", updatedAt: new Date() }).where(and(eq(outbox.applicationId, o.applicationId), eq(outbox.kind, "follow_up"), inArray(outbox.status, ["draft", "ready", "queued"])));
}

export async function dismissReply(applicationId: number, eventId: number) {
  await db.update(replyEvents).set({ status: "dismissed" }).where(and(eq(replyEvents.id, eventId), eq(replyEvents.applicationId, applicationId)));
}

/**
 * Opt-in reply detection (MAIL-16): only the threads JobHunter sent, headers only.
 * Stores the sender's domain, the time and auto-reply vs reply; the candidate
 * confirms what it was.
 */
export async function pollReplies(): Promise<number> {
  const account = await getAccount();
  if (!account?.replyDetection) return 0;
  const t = transportFor(account);
  if (!t.thread) return 0;
  const threads = await db
    .select({ id: outbox.id, applicationId: outbox.applicationId, threadId: outbox.threadId })
    .from(outbox)
    .where(and(eq(outbox.status, "sent"), isNotNull(outbox.threadId), ne(outbox.kind, "test"), sql`${outbox.sentAt} > now() - interval '60 days'`));
  const seen = new Set<string>();
  let found = 0;
  for (const th of threads) {
    if (!th.threadId || !th.applicationId || seen.has(th.threadId)) continue;
    seen.add(th.threadId);
    let msgs;
    try {
      msgs = await t.thread(th.threadId);
    } catch (e) {
      if (e instanceof Error && /Connect Gmail again/.test(e.message)) await markError(e.message);
      continue;
    }
    for (const m of msgs) {
      const fromEmail = (m.from.match(/<([^>]+)>/)?.[1] ?? m.from).trim().toLowerCase();
      if (m.sentByMe || fromEmail === account.email) continue;
      const r = await db.insert(replyEvents).values({ applicationId: th.applicationId, outboxId: th.id, providerMessageId: m.id, at: m.at, senderDomain: fromEmail.split("@")[1] ?? null, category: m.autoReply ? "auto_reply" : "reply", source: "detected", status: m.autoReply ? "dismissed" : "proposed" }).onConflictDoNothing().returning({ id: replyEvents.id });
      if (r.length) {
        found++;
        await logEvent(th.applicationId, "reply", m.autoReply ? `Automatic reply from ${fromEmail.split("@")[1]}` : `Reply from ${fromEmail.split("@")[1]}: confirm what it was`);
      }
    }
  }
  return found;
}

// ---------- background worker ----------

const g = globalThis as unknown as { __jhMail?: boolean };

/** Runs inside the app: sends due emails every 30 s, drafts follow-ups and checks replies every 30 min. */
export function startMailWorker() {
  if (g.__jhMail) return;
  g.__jhMail = true;
  setInterval(() => void processQueue().catch((e) => console.error("[mail] queue:", (e as Error).message)), 30_000);
  const slow = () => void (async () => {
    try {
      await ensureFollowUps();
      await pollReplies();
    } catch (e) {
      console.error("[mail] follow-ups/replies:", (e as Error).message);
    }
  })();
  setTimeout(slow, 60_000);
  setInterval(slow, 30 * 60_000);
  console.log("[mail] worker started");
}
