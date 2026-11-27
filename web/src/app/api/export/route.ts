import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { applicationEvents, applications, documents, jobs, mailAccount, outbox, profiles, replyEvents } from "@/server/db/schema";

const csvCell = (v: unknown) => {
  const s = v instanceof Date ? v.toISOString() : v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows: Record<string, unknown>[]) => rows.length ? [Object.keys(rows[0]).join(","), ...rows.map((r) => Object.values(r).map(csvCell).join(","))].join("\r\n") + "\r\n" : "";

function file(body: string, name: string, type: string) {
  return new Response(body, { headers: { "Content-Type": `${type}; charset=utf-8`, "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } });
}

/** Full export (AFT-13): JSON of everything personal, or CSVs of applications and the send log (MAIL-15). Credentials are never exported. */
export async function GET(req: Request) {
  const format = new URL(req.url).searchParams.get("format") ?? "json";
  const day = new Date().toISOString().slice(0, 10);
  const apps = await db
    .select({ id: applications.id, stage: applications.stage, channel: applications.channel, company: jobs.company, title: jobs.title, specCompany: applications.specCompany, specRole: applications.specRole, applyUrl: jobs.applyUrl, created: applications.createdAt, applied: applications.appliedAt, stageChanged: applications.stageAt, aiOptOut: applications.aiOptOut, notes: applications.notes })
    .from(applications)
    .leftJoin(jobs, eq(jobs.id, applications.jobId))
    .orderBy(asc(applications.createdAt));
  if (format === "csv") {
    return file(toCsv(apps.map((a) => ({ id: a.id, company: a.company ?? a.specCompany, role: a.title ?? a.specRole, stage: a.stage, channel: a.channel, created: a.created, applied: a.applied, stage_changed: a.stageChanged, apply_url: a.applyUrl, ai_opt_out: a.aiOptOut, notes: a.notes }))), `jobhunter-applications-${day}.csv`, "text/csv");
  }
  const sends = await db.select().from(outbox).orderBy(asc(outbox.createdAt));
  if (format === "sends") {
    // MAIL-15: Message-ID, thread, times (UTC), recipient, subject, CV version hash, where the address came from.
    return file(toCsv(sends.filter((s) => s.status === "sent").map((s) => ({ application_id: s.applicationId, kind: s.kind, sent_at_utc: s.sentAt, to: s.toAddr, subject: s.subject, message_id: s.messageId, gmail_thread_id: s.threadId, gmail_message_id: s.providerId, message_sha256: s.mimeHash, cv_sha256: s.cvHash, address_source: s.toSource?.kind, address_source_url: s.toSource?.url, address_quote: s.toSource?.quote, address_captured_at: s.toSource?.capturedAt }))), `jobhunter-send-log-${day}.csv`, "text/csv");
  }
  const [profile] = await db.select().from(profiles);
  const [account] = await db.select({ email: mailAccount.email, method: mailAccount.method, connectedAt: mailAccount.connectedAt, replyDetection: mailAccount.replyDetection }).from(mailAccount);
  const [docs, events, replies] = await Promise.all([db.select().from(documents), db.select().from(applicationEvents), db.select().from(replyEvents)]);
  const body = {
    exportedAt: new Date().toISOString(),
    profile: profile ? { data: profile.data, cv: profile.cv, linkedinComparison: profile.otherProfile } : null,
    gmail: account ?? null, // the credential itself is never exported
    applications: apps,
    documents: docs.map((d) => ({ applicationId: d.applicationId, kind: d.kind, version: d.version, content: d.content, approvedAt: d.approvedAt, checks: d.checks?.flags ?? [] })),
    emails: sends.map(({ mime, ...s }) => ({ ...s, messageBytes: mime ? Buffer.byteLength(mime) : null })),
    replies,
    history: events,
  };
  return file(JSON.stringify(body, null, 2), `jobhunter-export-${day}.json`, "application/json");
}
