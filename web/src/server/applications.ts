import { createHash } from "node:crypto";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "./db";
import { applicationEvents, applications, documents, jobs, outbox, postings, replyEvents, type Application, type Job } from "./db/schema";
import { authenticityLint, factLock, specificity, type Flag } from "./lib/checks";
import { withCvDefaults, type CvParse } from "./lib/cv";
import { letterConsistency } from "./lib/consistency";
import { verdictFor } from "./lib/eligibility";
import { detectAiPolicy, detectApplyEmail, readGreenhouseForm, type AiPolicy, type FormField } from "./lib/preflight";
import type { Profile } from "./lib/profile";
import type { Requirements } from "./lib/requirements";
import { readBackCv, readBackLetter, renderCv, renderLetter, type ReadBack } from "./lib/render";
import { buildCvDoc, buildLetter, cvDocToText, evidenceMatrix, parseCvDocText } from "./lib/tailor";
import { checkLiveness } from "./liveness";
import { getProfile, viewerOf } from "./matching";

const UA = process.env.USER_AGENT || "JobHunter/2.0";
export const NO_RESPONSE_DAYS = 28; // AFT-02 (21–30 days, editable later)

export type Preflight = {
  checkedAt: string;
  live: "open" | "closed" | "unknown";
  form: { source: "greenhouse" | "lever" | "ashby" | null; fields: FormField[]; note: string | null };
  lever: { country: string | null; workplaceType: string | null } | null;
  aiPolicy: AiPolicy;
  aiNotice: { disclaimer: string | null; optOutUrl: string | null };
  applyEmail: { email: string; quote: string } | null;
  letter: "required" | "optional" | "asked" | "not_asked";
};

export type DocChecks = { flags: Flag[]; readBack: ReadBack[]; substitutions: string[]; checkedAt: string };

export const STAGES = ["saved", "applied", "screening", "interviewing", "offer", "accepted", "declined", "rejected", "withdrawn", "no_response"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABEL: Record<Stage, string> = {
  saved: "Saved", applied: "Applied", screening: "Screening / assessment", interviewing: "Interviewing", offer: "Offer",
  accepted: "Accepted", declined: "Declined", rejected: "Rejected", withdrawn: "Withdrawn", no_response: "No response",
};

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    return res.ok ? ((await res.json()) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Pre-flight (DOC-01): liveness, the employer's form questions, AI policy and opt-out notice, apply channel. */
export async function runPreflight(job: Job): Promise<Preflight> {
  const started = Date.now();
  const checked = await checkLiveness(job.id, null);
  const [fresh] = await db.select({ status: jobs.status }).from(jobs).where(eq(jobs.id, job.id));
  const live: Preflight["live"] = fresh?.status === "closed" ? "closed" : checked && checked.getTime() >= started - 1000 ? "open" : "unknown";

  const posts = await db.select().from(postings).where(eq(postings.jobId, job.id));
  const gh = posts.find((p) => p.sourceId === "greenhouse" && !p.closedAt);
  const lv = posts.find((p) => p.sourceId === "lever" && !p.closedAt);
  const ash = posts.find((p) => p.sourceId === "ashby" && !p.closedAt);

  let form: Preflight["form"] = { source: null, fields: [], note: "This job's form isn't published in a way we can read. Check it for location, authorization and sponsorship questions before you start." };
  let aiNotice: Preflight["aiNotice"] = { disclaimer: null, optOutUrl: null };
  let lever: Preflight["lever"] = null;
  if (gh) {
    const j = await getJson(`https://boards-api.greenhouse.io/v1/boards/${gh.board}/jobs/${gh.sourceJobId}?questions=true`);
    if (j) {
      const f = readGreenhouseForm(j);
      form = { source: "greenhouse", fields: f.questions, note: null };
      aiNotice = f.aiNotice;
    } else form = { source: "greenhouse", fields: [], note: "Greenhouse didn't return the form just now. Try again, or check it on the employer's page." };
  } else if (lv) {
    const j = await getJson(`https://api.lever.co/v0/postings/${lv.board}/${lv.sourceJobId}`);
    lever = j ? { country: typeof j.country === "string" ? j.country : null, workplaceType: typeof j.workplaceType === "string" ? j.workplaceType : null } : null;
    form = { source: "lever", fields: [], note: "Lever doesn't publish form questions. Check the form for location and authorization questions." };
  } else if (ash) form = { source: "ashby", fields: [], note: "Ashby doesn't publish form questions. Check the form for location and authorization questions." };

  const labels = form.fields.map((f) => f.label).join(". ");
  const aiPolicy = detectAiPolicy(`${job.descriptionText}\n${labels}`);
  const cl = form.fields.find((f) => /cover letter/i.test(f.label));
  const letter: Preflight["letter"] = cl ? (cl.required ? "required" : "optional") : /\bcover letter\b/i.test(job.descriptionText) ? "asked" : "not_asked";
  return { checkedAt: new Date().toISOString(), live, form, lever, aiPolicy, aiNotice, applyEmail: detectApplyEmail(job.descriptionText), letter };
}

/** Spelling locale of the employer's market, when it's clear (DOC-10). */
export function localeOf(job: Job): "us" | "uk" | null {
  const c = job.eligibility.countries;
  const uk = ["GB", "IE", "AU", "NZ", "ZA", "NG", "KE", "GH", "IN"];
  if (/\.(co\.uk|uk|ie|com\.au|co\.nz|co\.za|ng)$/.test(job.companyDomain ?? "")) return "uk";
  if (c.length && c.every((x) => x === "US" || x === "CA")) return "us";
  if (c.length && c.every((x) => uk.includes(x))) return "uk";
  return null;
}

function zoneName(anchor: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: anchor, timeZoneName: "longGeneric" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? anchor;
  } catch {
    return anchor;
  }
}

function overlapNote(job: Job, profile: Profile): string | null {
  const v = verdictFor(job.eligibility, viewerOf(profile));
  if (!v.overlap) return null;
  const h = v.overlap.min === v.overlap.max ? `${v.overlap.min}` : `${v.overlap.min} to ${v.overlap.max}`;
  return `my working day overlaps ${h} hours with ${zoneName(v.overlap.anchor)}`;
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** What an application is aimed at: a job posting, or a company for a speculative application. */
export type Target = {
  job: Job | null;
  company: string;
  title: string; // job title, or the role area for a speculative application
  text: string; // posting text, or the company page
  requirements: Requirements | null;
  companyDomain: string | null;
  locale: "us" | "uk" | null;
  overlapNote: string | null;
};

export type Ctx = { target: Target; profile: Profile; cv: CvParse & { text: string } };

export function targetOf(app: Pick<Application, "specCompany" | "specRole" | "specDomain" | "specSourceText">, job: Job | null, profile: Profile): Target {
  if (job) return { job, company: job.company, title: job.title, text: job.descriptionText, requirements: job.requirements, companyDomain: job.companyDomain, locale: localeOf(job), overlapNote: overlapNote(job, profile) };
  return { job: null, company: app.specCompany ?? "the company", title: app.specRole ?? "", text: app.specSourceText ?? "", requirements: null, companyDomain: app.specDomain, locale: null, overlapNote: null };
}

async function profileCtx(): Promise<{ profile: Profile; cv: CvParse & { text: string } } | { error: string }> {
  const p = await getProfile();
  if (!p?.cv) return { error: "Upload your CV on the Profile page first. Drafts are built only from your own CV." };
  return { profile: p.data, cv: withCvDefaults(p.cv) };
}

async function contextForJob(jobId: number): Promise<Ctx | { error: string }> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
  if (!job) return { error: "Job not found" };
  const p = await profileCtx();
  if ("error" in p) return p;
  return { ...p, target: targetOf({ specCompany: null, specRole: null, specDomain: null, specSourceText: null }, job, p.profile) };
}

export async function contextForApp(app: Application): Promise<Ctx | { error: string }> {
  const p = await profileCtx();
  if ("error" in p) return p;
  const job = app.jobId ? (await db.select().from(jobs).where(eq(jobs.id, app.jobId)))[0] ?? null : null;
  if (app.jobId && !job) return { error: "Job not found" };
  return { ...p, target: targetOf(app, job, p.profile) };
}

/** Checks and read-back for one document's current text. */
export async function checkDoc(kind: "cv" | "letter", content: string, ctx: Ctx): Promise<DocChecks> {
  const { target: t, profile, cv } = ctx;
  const allowed = [t.title, t.company, t.overlapNote ?? ""];
  const flags: Flag[] = [...factLock({ kind, text: content, cv, profile, allowed })];
  if (kind === "cv") {
    flags.push(...specificity(parseCvDocText(content)));
    flags.push(...authenticityLint({ cvText: content, jobText: t.text, locale: t.locale, allowed }));
    const r = await renderCv(content);
    const readBack = await Promise.all([readBackCv(r.pdf, "pdf", r.doc, r.substitutions), readBackCv(r.docx, "docx", r.doc)]);
    return { flags, readBack, substitutions: r.substitutions, checkedAt: new Date().toISOString() };
  }
  flags.push(...letterConsistency(content, cv, t.company));
  flags.push(...authenticityLint({ letterText: content, jobText: t.text, locale: t.locale, ownWriting: cv.summary, allowed }));
  const name = cv.contact.name ?? "";
  const r = await renderLetter(content, name);
  const readBack = await Promise.all([readBackLetter(r.pdf, "pdf", content, r.substitutions), readBackLetter(r.docx, "docx", content)]);
  return { flags, readBack, substitutions: r.substitutions, checkedAt: new Date().toISOString() };
}

function drafts(ctx: Ctx, evidence: ReturnType<typeof evidenceMatrix>) {
  const { target: t, profile, cv } = ctx;
  const cvText = cvDocToText(buildCvDoc(cv, profile, t.requirements));
  const letter = buildLetter({ name: cv.contact.name ?? "[Your name]", company: t.company, title: t.title, evidence, profile, overlapNote: t.overlapNote });
  return { cvText, letter };
}

export async function logEvent(applicationId: number, kind: string, detail = "") {
  await db.insert(applicationEvents).values({ applicationId, kind, detail });
}

/** Start (or reopen) the application for a job: pre-flight, evidence matrix, drafts and their checks. */
export async function startApplication(jobId: number): Promise<{ id: number } | { error: string }> {
  const [existing] = await db.select({ id: applications.id }).from(applications).where(eq(applications.jobId, jobId));
  if (existing) return existing;
  const ctx = await contextForJob(jobId);
  if ("error" in ctx) return ctx;
  const preflight = await runPreflight(ctx.target.job!);
  const evidence = evidenceMatrix(ctx.target.requirements, ctx.cv, ctx.profile);
  const { cvText, letter } = drafts(ctx, evidence);
  const [cvChecks, letterChecks] = await Promise.all([checkDoc("cv", cvText, ctx), checkDoc("letter", letter, ctx)]);
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(applications)
      .values({ jobId, preflight, evidence, channel: preflight.applyEmail ? "email" : "web_form" })
      .onConflictDoNothing()
      .returning({ id: applications.id });
    if (!row) return null;
    await tx.insert(documents).values([
      { applicationId: row.id, kind: "cv", content: cvText, generated: cvText, checks: cvChecks },
      { applicationId: row.id, kind: "letter", content: letter, generated: letter, checks: letterChecks },
    ]);
    await tx.insert(applicationEvents).values({ applicationId: row.id, kind: "created", detail: `Pre-flight: job ${preflight.live}` });
    return row.id;
  });
  if (id == null) {
    const [again] = await db.select({ id: applications.id }).from(applications).where(eq(applications.jobId, jobId));
    return again ?? { error: "Couldn't create the application" };
  }
  return { id };
}

/**
 * Start a speculative application (MAIL-19): the company, the role area, and the
 * page on the company's own site that publishes the address. The page text is
 * kept so the recipient check can show where the address came from.
 */
export async function startSpeculative(o: { company: string; roleArea: string; pageUrl: string; pageText: string; domain: string | null }): Promise<{ id: number } | { error: string }> {
  const p = await profileCtx();
  if ("error" in p) return p;
  const app = { specCompany: o.company, specRole: o.roleArea, specDomain: o.domain, specSourceText: o.pageText };
  const ctx: Ctx = { ...p, target: targetOf(app, null, p.profile) };
  const cvText = cvDocToText(buildCvDoc(ctx.cv, ctx.profile, null));
  const cvChecks = await checkDoc("cv", cvText, ctx);
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(applications).values({ ...app, specSourceUrl: o.pageUrl, channel: "speculative" }).returning({ id: applications.id });
    await tx.insert(documents).values({ applicationId: row.id, kind: "cv", content: cvText, generated: cvText, checks: cvChecks });
    await tx.insert(applicationEvents).values({ applicationId: row.id, kind: "created", detail: `Speculative application to ${o.company}` });
    return { id: row.id };
  });
}

export async function getApplication(id: number) {
  const [app] = await db.select().from(applications).where(eq(applications.id, id));
  if (!app) return null;
  const [jobRows, docs, events, profile] = await Promise.all([
    app.jobId ? db.select().from(jobs).where(eq(jobs.id, app.jobId)) : Promise.resolve([] as Job[]),
    db.select().from(documents).where(eq(documents.applicationId, id)),
    db.select().from(applicationEvents).where(eq(applicationEvents.applicationId, id)).orderBy(desc(applicationEvents.at)),
    getProfile(),
  ]);
  const job = (jobRows[0] as Job | undefined) ?? null;
  if (app.jobId && !job) return null;
  return { app, job, cv: docs.find((d) => d.kind === "cv") ?? null, letter: docs.find((d) => d.kind === "letter") ?? null, events, profile };
}

/** Save the candidate's edit: bump the version, reset approval, re-run checks. */
export async function saveDocument(applicationId: number, kind: "cv" | "letter", content: string) {
  const [app] = await db.select().from(applications).where(eq(applications.id, applicationId));
  if (!app) return { error: "Application not found" };
  const ctx = await contextForApp(app);
  if ("error" in ctx) return ctx;
  const clean = content.replace(/\r\n/g, "\n");
  const checks = await checkDoc(kind, clean, ctx);
  await db
    .update(documents)
    .set({ content: clean, checks, version: sql`${documents.version} + 1`, approvedAt: null, approvedHash: null, updatedAt: new Date() })
    .where(and(eq(documents.applicationId, applicationId), eq(documents.kind, kind)));
  await logEvent(applicationId, "edit", `${kind === "cv" ? "CV" : "Letter"} edited`);
  return { ok: true };
}

/** Rebuild a document from the current CV and profile (discarding edits). */
export async function regenerateDocument(applicationId: number, kind: "cv" | "letter") {
  const [app] = await db.select().from(applications).where(eq(applications.id, applicationId));
  if (!app) return { error: "Application not found" };
  const ctx = await contextForApp(app);
  if ("error" in ctx) return ctx;
  const evidence = evidenceMatrix(ctx.target.requirements, ctx.cv, ctx.profile);
  const d = drafts(ctx, evidence);
  const content = kind === "cv" ? d.cvText : d.letter;
  const checks = await checkDoc(kind, content, ctx);
  await db.update(applications).set({ evidence }).where(eq(applications.id, applicationId));
  await db
    .update(documents)
    .set({ content, generated: content, checks, version: sql`${documents.version} + 1`, approvedAt: null, approvedHash: null, updatedAt: new Date() })
    .where(and(eq(documents.applicationId, applicationId), eq(documents.kind, kind)));
  await logEvent(applicationId, "edit", `${kind === "cv" ? "CV" : "Letter"} rebuilt from your CV`);
  return { ok: true };
}

export function docProblems(doc: { checks: DocChecks | null }): string[] {
  const c = doc.checks;
  if (!c) return ["Checks haven't run yet"];
  const out = c.flags.filter((f) => f.severity === "block").map((f) => f.title);
  for (const rb of c.readBack) if (!rb.ok) out.push(`The ${rb.format.toUpperCase()} didn't read back cleanly`);
  return out;
}

/** Approval (AUTH-05): only when nothing blocks. Pins the exact text that may be downloaded. */
export async function approveDocument(applicationId: number, kind: "cv" | "letter") {
  const [doc] = await db.select().from(documents).where(and(eq(documents.applicationId, applicationId), eq(documents.kind, kind)));
  if (!doc) return { error: "Document not found" };
  const problems = docProblems(doc);
  if (problems.length) return { error: `Fix these first: ${problems.join("; ")}` };
  await db.update(documents).set({ approvedAt: new Date(), approvedHash: sha(doc.content) }).where(eq(documents.id, doc.id));
  await logEvent(applicationId, "approve", `${kind === "cv" ? "CV" : "Letter"} v${doc.version} approved`);
  return { ok: true };
}

/** The approved file, or why it can't be downloaded. Never serves unapproved text. */
/** The approved file, rendered and re-verified. `log` is off when the outbox attaches it (the send log records that). */
export async function approvedFile(applicationId: number, kind: "cv" | "letter", format: "pdf" | "docx", opts: { log?: boolean } = {}) {
  const [doc] = await db.select().from(documents).where(and(eq(documents.applicationId, applicationId), eq(documents.kind, kind)));
  if (!doc) return { error: "Not found", status: 404 } as const;
  if (!doc.approvedAt || doc.approvedHash !== sha(doc.content)) return { error: "Approve this document first. Downloads are only for text you've approved.", status: 409 } as const;
  const p = await getProfile();
  const name = withCvDefaults(p?.cv ?? {}).contact.name ?? "Candidate";
  const r = kind === "cv" ? await renderCv(doc.content) : await renderLetter(doc.content, name);
  // Re-verify the exact bytes being served (DOC-05).
  const rb = kind === "cv" ? await readBackCv(format === "pdf" ? r.pdf : r.docx, format, parseCvDocText(doc.content), format === "pdf" ? r.substitutions : []) : await readBackLetter(format === "pdf" ? r.pdf : r.docx, format, doc.content, format === "pdf" ? r.substitutions : []);
  if (!rb.ok) return { error: "The file didn't pass the read-back check. Open the application to see why.", status: 409 } as const;
  const base = name.trim().split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}-]/gu, "")).filter(Boolean).join("-") || "Candidate";
  if (opts.log !== false) await logEvent(applicationId, "download", `${kind} ${format}`);
  return {
    contentHash: sha(doc.content),
    bytes: format === "pdf" ? r.pdf : r.docx,
    fileName: `${base}-${kind === "cv" ? "CV" : "Cover-Letter"}.${format}`,
    type: format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  } as const;
}

export async function setStage(applicationId: number, stage: Stage) {
  const now = new Date();
  await db
    .update(applications)
    .set({ stage, stageAt: now, ...(stage === "applied" ? { appliedAt: sql`coalesce(${applications.appliedAt}, now())` } : {}) })
    .where(eq(applications.id, applicationId));
  await logEvent(applicationId, "stage", STAGE_LABEL[stage]);
}

export async function setAiOptOut(applicationId: number, choice: "opted_out" | "stayed_in") {
  await db.update(applications).set({ aiOptOut: choice }).where(eq(applications.id, applicationId));
  await logEvent(applicationId, "ai_opt_out", choice === "opted_out" ? "You chose to request human review (AI opt-out)" : "You chose not to opt out");
}

export async function saveNotes(applicationId: number, notes: string) {
  await db.update(applications).set({ notes: notes.slice(0, 20000) }).where(eq(applications.id, applicationId));
}

export async function refreshPreflight(applicationId: number) {
  const [app] = await db.select().from(applications).where(eq(applications.id, applicationId));
  if (!app?.jobId) return; // speculative applications have no posting to check
  const [job] = await db.select().from(jobs).where(eq(jobs.id, app.jobId));
  if (!job) return;
  const preflight = await runPreflight(job);
  await db.update(applications).set({ preflight }).where(eq(applications.id, applicationId));
  await logEvent(applicationId, "preflight", `Job ${preflight.live}`);
}

export async function deleteApplication(applicationId: number) {
  await db.transaction(async (tx) => {
    await tx.delete(documents).where(eq(documents.applicationId, applicationId));
    await tx.delete(outbox).where(eq(outbox.applicationId, applicationId)); // queued emails go too, so nothing sends later
    await tx.delete(replyEvents).where(eq(replyEvents.applicationId, applicationId));
    await tx.delete(applicationEvents).where(eq(applicationEvents.applicationId, applicationId));
    await tx.delete(applications).where(eq(applications.id, applicationId));
  });
}

/** Silence is the most common outcome (AFT-02): "Applied" with no change for 28 days becomes "No response". */
export async function sweepNoResponse() {
  const cutoff = new Date(Date.now() - NO_RESPONSE_DAYS * 86400_000);
  const stale = await db.select({ id: applications.id }).from(applications).where(and(eq(applications.stage, "applied"), lt(applications.stageAt, cutoff)));
  if (!stale.length) return 0;
  const ids = stale.map((s) => s.id);
  await db.update(applications).set({ stage: "no_response", stageAt: new Date() }).where(inArray(applications.id, ids));
  await db.insert(applicationEvents).values(ids.map((applicationId) => ({ applicationId, kind: "stage", detail: `No response after ${NO_RESPONSE_DAYS} days (automatic; change it if you heard back)` })));
  return ids.length;
}

/** Business days between two dates (Mon–Fri; public holidays aren't known yet). */
export function businessDaysBetween(a: Date, b: Date): number {
  let n = 0;
  const d = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()));
  const end = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  while (d.getTime() < end) {
    d.setUTCDate(d.getUTCDate() + 1);
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6) n++;
  }
  return n;
}

/** Follow-up timing hint (MAIL-14): first at 7–10 business days, at most two. */
export function followUpHint(app: { stage: string; appliedAt: Date | null; stageAt: Date }, now = new Date()): string | null {
  if (app.stage !== "applied" || !app.appliedAt) return null;
  const bd = businessDaysBetween(app.appliedAt, now);
  if (bd < 7) return null;
  if (bd <= 10) return "A short follow-up is reasonable now (7–10 business days after applying).";
  if (bd <= 17) return "If you haven't followed up yet, do it now; if you have, one final note in about a week is the limit.";
  return null;
}

export async function listApplications() {
  await sweepNoResponse();
  // Draft any follow-ups that have come due, so they show up here (they still need your approval).
  await (await import("./outbox")).ensureFollowUps().catch(() => 0);
  const rows = await db
    .select({ app: applications, jobTitle: jobs.title, jobCompany: jobs.company, jobStatus: jobs.status })
    .from(applications)
    .leftJoin(jobs, eq(jobs.id, applications.jobId))
    .orderBy(desc(applications.stageAt));
  const ids = rows.map((r) => r.app.id);
  const docs = ids.length ? await db.select({ applicationId: documents.applicationId, kind: documents.kind, approvedAt: documents.approvedAt }).from(documents).where(inArray(documents.applicationId, ids)) : [];
  const mail = ids.length
    ? await db.select({ applicationId: outbox.applicationId, kind: outbox.kind, status: outbox.status }).from(outbox).where(inArray(outbox.applicationId, ids))
    : [];
  const proposed = ids.length
    ? await db.select({ applicationId: replyEvents.applicationId }).from(replyEvents).where(and(inArray(replyEvents.applicationId, ids), eq(replyEvents.status, "proposed")))
    : [];
  const emailState = (id: number) => {
    const m = mail.filter((x) => x.applicationId === id && x.kind !== "test");
    if (proposed.some((p) => p.applicationId === id)) return "A reply came in: confirm what it was";
    if (m.some((x) => x.kind === "follow_up" && x.status === "draft")) return "Follow-up draft ready for your review";
    if (m.some((x) => x.status === "queued" || x.status === "sending")) return "Email queued";
    if (m.some((x) => x.status === "ready")) return "Email waiting for your approval";
    if (m.some((x) => x.status === "failed")) return "Email didn't send";
    if (m.some((x) => x.status === "sent")) return "Emailed";
    return null;
  };
  return rows.map((r) => ({
    ...r,
    emailState: emailState(r.app.id),
    title: r.jobTitle ?? `Speculative: ${r.app.specRole ?? ""}`,
    company: r.jobCompany ?? r.app.specCompany ?? "",
    cvApproved: docs.some((d) => d.applicationId === r.app.id && d.kind === "cv" && d.approvedAt),
  }));
}

export async function applicationForJob(jobId: number) {
  const [row] = await db.select({ id: applications.id, stage: applications.stage }).from(applications).where(eq(applications.jobId, jobId));
  return row ?? null;
}
