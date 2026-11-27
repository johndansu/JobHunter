import { authenticityLint, factLock, type Flag } from "./checks";
import { letterConsistency } from "./consistency";
import type { CvParse } from "./cv";
import type { Profile } from "./profile";
import { locationSentence, proofSentences, type Evidence } from "./tailor";
import { sentences } from "./text";

/**
 * Email drafts (MAIL-12, MAIL-14, MAIL-19): a short plain-text note that
 * carries the approved CV, written only from the CV, with blanks the candidate
 * fills. The same fact lock and authenticity checks as the letter apply.
 */

/** The subject the posting asks for, if it says ("…with the subject line 'Support Lead – Lagos'"). */
export function postingSubject(text: string): { subject: string; quote: string } | null {
  for (const s of sentences(text)) {
    const m = s.match(/\bsubject(?:\s+line)?(?:\s+(?:of|as|should be|reading|titled|must be|stating))?\s*[:\-–]?\s*["“'‘]([^"”'’\n]{3,120})["”'’]/i);
    if (m) return { subject: m[1].trim(), quote: s };
  }
  return null;
}

export function defaultSubject(o: { kind: "application" | "speculative"; title: string; name: string }): string {
  return o.kind === "speculative" ? `Speculative application – ${o.title} – ${o.name}` : `Job application – ${o.title} – ${o.name}`;
}

function signature(cv: CvParse): string[] {
  const c = cv.contact;
  const link = c.links.find((l) => /linkedin/i.test(l)) ?? c.links[0];
  return [c.name ?? "[Your name]", ...(c.phone ? [c.phone] : []), ...(link ? [link] : [])];
}

export function applicationEmailBody(o: { company: string; title: string; evidence: Evidence[]; profile: Profile; cv: CvParse; overlapNote: string | null; withLetter: boolean }): string {
  const proof = proofSentences(o.evidence, 1)[0];
  return [
    `Dear ${o.company} hiring team,`,
    "",
    `I'm applying for the ${o.title} role, and I've attached my CV${o.withLetter ? " and a cover letter" : ""}. [Write one sentence on why ${o.company}: something concrete from the posting or their product.]`,
    "",
    proof ?? "[Add one specific result from your CV that fits this role.]",
    "",
    locationSentence(o.profile, o.overlapNote),
    "",
    "Thank you for your time.",
    "",
    "Kind regards,",
    ...signature(o.cv),
  ].join("\n");
}

export function speculativeEmailBody(o: { company: string; roleArea: string; profile: Profile; cv: CvParse }): string {
  const latest = o.cv.roles[0];
  return [
    `Dear ${o.company} team,`,
    "",
    `I'm writing to ask whether you have, or expect to have, openings in ${o.roleArea}. My CV is attached.`,
    "",
    latest ? `I'm currently ${/present|current|now/i.test(latest.end ?? "") ? "working" : "most recently worked"} as ${latest.title}${latest.employer ? ` at ${latest.employer}` : ""}. [Add one specific result from your CV.]` : "[Say in one sentence what you do, with one specific result from your CV.]",
    "",
    `[Write one sentence on why ${o.company}: something specific from their website, not general praise.]`,
    "",
    locationSentence(o.profile, null),
    "",
    "Kind regards,",
    ...signature(o.cv),
  ].join("\n");
}

/** "26 November" in the candidate's time zone. */
export const dayMonth = (d: Date, tz: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: tz }).format(d);

export function followUpBody(o: { company: string; title: string; cv: CvParse; n: number; appliedOn: string }): string {
  return [
    `Dear ${o.company} hiring team,`,
    "",
    o.n === 1
      ? `I applied for the ${o.title} role on ${o.appliedOn} and wanted to check whether it's still open and if there's anything else you need from me.`
      : `I'm following up once more on my application for the ${o.title} role. I'm still very interested, and I'll leave it with you after this note.`,
    "",
    "Kind regards,",
    ...signature(o.cv),
  ].join("\n");
}

const SHORTENER = /\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly|rebrand\.ly|cutt\.ly|shorturl\.at|tiny\.cc)\//i;
// Full URLs, www. addresses, and bare domain/path links (linkedin.com/in/…, bit.ly/…). Email addresses don't count.
const LINK = /\b(?:https?:\/\/|www\.)\S+|(?<![@\w.-])[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\/\S*/gi;

/** Checks for an email body: fact lock, sign-off, authenticity, links and length (MAIL-12). */
export function emailChecks(o: { body: string; kind: "application" | "speculative" | "follow_up"; cv: CvParse & { text: string }; profile: Profile; company: string; title: string; jobText: string; overlapNote: string | null; allowed?: string[] }): Flag[] {
  const flags: Flag[] = [
    ...factLock({ kind: "letter", text: o.body, cv: o.cv, profile: o.profile, allowed: [o.title, o.company, o.overlapNote ?? "", ...o.cv.contact.links, o.cv.contact.phone ?? "", ...(o.allowed ?? [])] }),
    ...letterConsistency(o.body, o.cv, o.company),
  ];
  if (o.kind !== "follow_up") flags.push(...authenticityLint({ letterText: o.body, jobText: o.jobText, locale: null, ownWriting: o.cv.summary, allowed: [o.title, o.company] }));
  const links = o.body.match(LINK) ?? [];
  if (links.length > 3) flags.push({ id: "links", severity: "block", title: `${links.length} links in the email`, why: "Keep to three links at most. Link-heavy emails from personal accounts are often filtered as spam." });
  const short = o.body.match(SHORTENER);
  if (short) flags.push({ id: "shortener", severity: "block", title: "A link shortener is used", why: "Shortened links hide where they go and get emails filtered as spam. Use the full address.", quote: short[0] });
  const words = o.body.replace(/\[[^\]]*\]/g, " ").split(/\s+/).filter(Boolean).length;
  if (o.kind !== "follow_up" && words > 220) flags.push({ id: "length", severity: "warn", title: `The email is ${words} words`, why: "Keep the note to about 100–200 words; the CV and letter carry the detail." });
  return flags;
}
