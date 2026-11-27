import { describe, expect, it } from "vitest";
import { parseCvText } from "./cv";
import { applicationEmailBody, emailChecks, followUpBody, postingSubject, speculativeEmailBody } from "./emailDraft";
import { buildMime, encodeHeaderText, mimeHash, quotedPrintable, rfc5322Date, summarizeMime } from "./mime";
import { EMPTY_PROFILE, type Profile } from "./profile";
import { checkRecipient, unresolved } from "./recipients";
import { extractRequirements } from "./requirements";
import { addBusinessDays, DAILY_CAP, nextFollowUpDue, planSend, type PastSend } from "./sendPolicy";
import { evidenceMatrix } from "./tailor";

const CV_TEXT = `Ada Sample
Lagos, Nigeria · ada.sample@example.com · +234 801 234 5678
linkedin.com/in/ada-sample

Professional Summary
Customer support lead with 6 years in SaaS. I like fixing the process behind the ticket.

Work Experience
Customer Support Lead | Paystackish Ltd
Jan 2022 – Present
• Led a team of 8 agents on Zendesk and Intercom, cutting first-response time by 40%.

Education
B.Sc. Business Administration, University of Lagos, 2017

Skills
Zendesk, Intercom`;
const cv = { ...parseCvText(CV_TEXT), text: CV_TEXT };
const profile: Profile = { ...EMPTY_PROFILE, years: 4, skills: cv.skills.map((s) => s.skill) };

describe("MIME message", () => {
  const base = {
    from: { name: "Ada Sample", email: "ada.sample@example.com" },
    to: ["jobs@acme.com"],
    subject: "Job application – Support Lead – Ada Sample",
    text: "Dear Acme hiring team,\n\nI'm applying. Café = ok.\n\nKind regards,\nAda Sample",
    date: new Date(Date.UTC(2026, 10, 26, 9, 15, 0)),
    messageId: "abc.123@example.com",
  };
  it("is deterministic, so the preview hash is the sent hash", () => {
    expect(mimeHash(buildMime(base))).toBe(mimeHash(buildMime({ ...base })));
  });
  it("writes standard headers with CRLF and encodes non-ASCII subjects", () => {
    const m = buildMime(base);
    expect(m).toContain("\r\nDate: Thu, 26 Nov 2026 09:15:00 +0000\r\n");
    expect(m).toContain("Message-ID: <abc.123@example.com>");
    expect(m).toMatch(/^From: "Ada Sample" <ada\.sample@example\.com>\r\n/);
    expect(m).toContain("Subject: =?UTF-8?B?");
    expect(m.split("\r\n").every((l) => l.length <= 998)).toBe(true);
    expect(m.replace(/\r\n/g, "")).not.toMatch(/\n/);
  });
  it("encodes text as quoted-printable without breaking escapes", () => {
    expect(quotedPrintable("Café = ok ")).toBe("Caf=C3=A9 =3D ok=20");
    const long = quotedPrintable("é".repeat(60));
    expect(long.split("\r\n").every((l) => l.length <= 76)).toBe(true);
    expect(long.split("\r\n").every((l, i, a) => i === a.length - 1 || l.endsWith("="))).toBe(true);
    expect(encodeHeaderText("plain")).toBe("plain");
  });
  it("attaches files as base64 and lists them back for the preview", () => {
    const bytes = new Uint8Array(5000).map((_, i) => i % 256);
    const m = buildMime({ ...base, attachments: [{ filename: "Ada-Sample-CV.pdf", contentType: "application/pdf", bytes }] });
    const s = summarizeMime(m);
    expect(s.attachments).toEqual([{ filename: "Ada-Sample-CV.pdf", contentType: "application/pdf", bytes: 5000 }]);
    expect(s.headers.find(([k]) => k === "Content-Type")?.[1]).toMatch(/^multipart\/mixed/);
    expect(rfc5322Date(new Date(Date.UTC(2026, 0, 5, 7, 4, 3)))).toBe("Mon, 05 Jan 2026 07:04:03 +0000");
  });
  it("threads follow-ups", () => {
    const m = buildMime({ ...base, inReplyTo: "orig@example.com", references: ["orig@example.com"] });
    expect(m).toContain("In-Reply-To: <orig@example.com>\r\nReferences: <orig@example.com>");
  });
});

describe("caps and gaps", () => {
  const now = new Date(Date.UTC(2026, 10, 26, 12));
  const ago = (min: number) => new Date(now.getTime() - min * 60_000);
  const h = (n: number, kind: PastSend["kind"] = "application", minutesApart = 30): PastSend[] => Array.from({ length: n }, (_, i) => ({ at: ago(10 + i * minutesApart), kind, companyKey: `c${i}` }));
  it("waits a random 2–5 minutes after the previous send", () => {
    const p = planSend({ kind: "application", companyKey: "x", now, history: [{ at: ago(1), kind: "application", companyKey: "y" }], random: () => 0.5 });
    expect(p).toMatchObject({ ok: true, gapSeconds: 210 });
    if (p.ok) expect(p.sendAt.getTime()).toBe(ago(1).getTime() + 210_000);
    const first = planSend({ kind: "application", companyKey: "x", now, history: [], random: () => 0 });
    if (first.ok) expect(first.sendAt).toEqual(now);
  });
  it("queues behind emails already waiting to go", () => {
    const p = planSend({ kind: "application", companyKey: "x", now, history: [{ at: new Date(now.getTime() + 4 * 60_000), kind: "application", companyKey: "y" }], random: () => 1 });
    if (p.ok) expect(p.sendAt.getTime()).toBe(now.getTime() + 4 * 60_000 + 300_000);
  });
  it(`stops at ${DAILY_CAP} in 24 hours and says when you can send again`, () => {
    expect(planSend({ kind: "application", companyKey: "x", now, history: h(24) }).ok).toBe(true);
    const p = planSend({ kind: "follow_up", companyKey: "x", now, history: h(25) });
    expect(p.ok).toBe(false);
    if (!p.ok) expect(p.retryAt!.getTime()).toBe(ago(10 + 24 * 30).getTime() + 86400_000);
    // Older sends fall out of the window.
    expect(planSend({ kind: "application", companyKey: "x", now, history: h(25, "application", 60) }).ok).toBe(true);
  });
  it("tests to yourself skip the caps", () => {
    expect(planSend({ kind: "test", companyKey: null, now, history: h(30) }).ok).toBe(true);
  });
  it("speculative: 3 a day, and one per company per 90 days", () => {
    expect(planSend({ kind: "speculative", companyKey: "acme", now, history: h(3, "speculative") }).ok).toBe(false);
    const recent = [{ at: new Date(now.getTime() - 89 * 86400_000), kind: "speculative" as const, companyKey: "acme" }];
    expect(planSend({ kind: "speculative", companyKey: "acme", now, history: recent }).ok).toBe(false);
    expect(planSend({ kind: "speculative", companyKey: "globex", now, history: recent }).ok).toBe(true);
    expect(planSend({ kind: "speculative", companyKey: "acme", now, history: [{ ...recent[0], at: new Date(now.getTime() - 91 * 86400_000) }] }).ok).toBe(true);
  });
});

describe("follow-up timing", () => {
  const thu = new Date(Date.UTC(2026, 10, 26, 10)); // Thursday 26 Nov 2026
  it("counts business days, skipping weekends", () => {
    expect(addBusinessDays(thu, 1).toISOString().slice(0, 10)).toBe("2026-11-27"); // Fri
    expect(addBusinessDays(thu, 2).toISOString().slice(0, 10)).toBe("2026-11-30"); // Mon
    expect(addBusinessDays(thu, 7).toISOString().slice(0, 10)).toBe("2026-12-07"); // Mon, 7 working days later
  });
  it("first after 7 business days, the last 7 after that, then none", () => {
    expect(nextFollowUpDue({ kind: "application", sentAt: thu, followUps: [], replied: false })?.toISOString().slice(0, 10)).toBe("2026-12-07");
    const first = new Date(Date.UTC(2026, 11, 7, 10));
    expect(nextFollowUpDue({ kind: "application", sentAt: thu, followUps: [first], replied: false })?.toISOString().slice(0, 10)).toBe("2026-12-16");
    expect(nextFollowUpDue({ kind: "application", sentAt: thu, followUps: [first, first], replied: false })).toBeNull();
    expect(nextFollowUpDue({ kind: "application", sentAt: thu, followUps: [], replied: true })).toBeNull();
  });
  it("speculative: one follow-up after 10 business days", () => {
    expect(nextFollowUpDue({ kind: "speculative", sentAt: thu, followUps: [], replied: false })?.toISOString().slice(0, 10)).toBe("2026-12-10");
    expect(nextFollowUpDue({ kind: "speculative", sentAt: thu, followUps: [thu], replied: false })).toBeNull();
  });
});

describe("recipient rules", () => {
  const posting = "Requirements\n• Zendesk.\nTo apply, send your CV to jobs@acme.com with the subject line 'Support Lead – Lagos'.";
  const base = { kind: "application" as const, sourceText: posting, sourceUrl: null, company: "Acme", companyDomain: "acme.com", alreadySent: false };
  it("accepts the address the posting gives", () => {
    expect(checkRecipient({ ...base, email: "jobs@acme.com" })).toEqual([]);
  });
  it("blocks guessed addresses and duplicates", () => {
    expect(checkRecipient({ ...base, email: "ceo@acme.com" }).map((i) => i.id)).toEqual(["not_published"]);
    expect(checkRecipient({ ...base, email: "jobs@acme.com", alreadySent: true }).map((i) => i.id)).toEqual(["duplicate"]);
  });
  it("blocks when the posting says not to apply by email", () => {
    const t = "Please do not email your application to hr@acme.com; apply through our form.";
    expect(checkRecipient({ ...base, sourceText: t, email: "hr@acme.com" }).map((i) => i.id)).toContain("not_by_email");
  });
  it("free-mail and look-alike recipients need your confirmation", () => {
    const t = "Send your CV to acme.hiring@gmail.com or to jobs@acme-careers.com to apply.";
    const free = checkRecipient({ ...base, sourceText: t, email: "acme.hiring@gmail.com" });
    expect(free.map((i) => [i.id, i.severity])).toEqual([["freemail", "override"]]);
    expect(unresolved(free, [])).toHaveLength(1);
    expect(unresolved(free, ["freemail"])).toHaveLength(0);
    expect(checkRecipient({ ...base, sourceText: t, email: "jobs@acme-careers.com" }).map((i) => i.id)).toEqual(["lookalike"]);
  });
  it("speculative: only from the company's own site, never a job board, and never if they refuse", () => {
    const page = "Careers at Acme. Don't see a role? Send your CV to careers@acme.com and we'll keep it on file.";
    const spec = { kind: "speculative" as const, company: "Acme", companyDomain: null, alreadySent: false, email: "careers@acme.com" };
    expect(checkRecipient({ ...spec, sourceText: page, sourceUrl: "https://acme.com/careers" })).toEqual([]);
    expect(checkRecipient({ ...spec, sourceText: page, sourceUrl: "https://www.linkedin.com/company/acme" }).map((i) => i.id)).toContain("third_party");
    expect(checkRecipient({ ...spec, sourceText: page, sourceUrl: null }).map((i) => i.id)).toContain("no_source");
    expect(checkRecipient({ ...spec, sourceText: "We do not accept unsolicited applications. Contact careers@acme.com for press.", sourceUrl: "https://acme.com/careers" }).map((i) => i.id)).toContain("no_unsolicited");
  });
});

describe("email drafts", () => {
  const job = "Requirements\n• Experience with Zendesk.\nTo apply, email jobs@acme.com with the subject line \"Support Lead (Remote)\".";
  const ev = evidenceMatrix(extractRequirements("Support Lead", job), cv, profile);
  it("uses the subject the posting asks for", () => {
    expect(postingSubject(job)?.subject).toBe("Support Lead (Remote)");
    expect(postingSubject("Send your CV to jobs@acme.com.")).toBeNull();
  });
  it("builds a short note from the CV, with blanks for the candidate", () => {
    const body = applicationEmailBody({ company: "Acme", title: "Support Lead", evidence: ev, profile, cv, overlapNote: null, withLetter: false });
    expect(body).toMatch(/I led a team of 8 agents on Zendesk/);
    expect(body).toMatch(/\[Write one sentence on why Acme/);
    expect(body.trim().split("\n").slice(-3)).toEqual(["Ada Sample", "+234 801 234 5678", "linkedin.com/in/ada-sample"]);
    const flags = emailChecks({ body, kind: "application", cv, profile, company: "Acme", title: "Support Lead", jobText: job, overlapNote: null });
    expect(flags.filter((f) => f.severity === "block").map((f) => f.id)).toEqual(["blank"]);
    const filled = body.replace(/\[Write one sentence[^\]]*\]/, "Your support team works across time zones, which is how I've always worked.");
    expect(emailChecks({ body: filled, kind: "application", cv, profile, company: "Acme", title: "Support Lead", jobText: job, overlapNote: null }).filter((f) => f.severity === "block")).toEqual([]);
  });
  it("speculative and follow-up notes pass the fact lock once filled", () => {
    const s = speculativeEmailBody({ company: "Acme", roleArea: "customer support", profile, cv }).replace(/\[[^\]]*\]/g, "I like their product.");
    expect(s).toMatch(/currently working as Customer Support Lead at Paystackish Ltd/);
    expect(emailChecks({ body: s, kind: "speculative", cv, profile, company: "Acme", title: "customer support", jobText: "", overlapNote: null }).filter((f) => f.severity === "block")).toEqual([]);
    const f = followUpBody({ company: "Acme", title: "Support Lead", cv, n: 1, appliedOn: "26 November" });
    expect(emailChecks({ body: f, kind: "follow_up", cv, profile, company: "Acme", title: "Support Lead", jobText: "", overlapNote: null, allowed: ["26 November"] }).filter((x) => x.severity === "block")).toEqual([]);
  });
  it("blocks link shorteners and too many links", () => {
    const b = "Dear Acme,\n\nSee bit.ly/abc123 and www.a.com www.b.com www.c.com.\n\nAda Sample";
    expect(emailChecks({ body: b, kind: "application", cv, profile, company: "Acme", title: "x", jobText: "", overlapNote: null }).map((f) => f.id)).toEqual(expect.arrayContaining(["shortener", "links"]));
  });
});
