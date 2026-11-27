import type { CvParse } from "./cv";
import type { Profile } from "./profile";
import type { Requirements } from "./requirements";
import { countryName } from "./geo";
import { findSkills } from "./skills";

/**
 * No-AI drafting (D-16, DOC-02/03/08/09). Everything is assembled from the
 * candidate's own CV: skills and bullets are re-ordered for the job, nothing is
 * added. The letter is a template with proof from the CV and blanks only the
 * candidate can fill.
 */

export type Evidence = {
  requirement: string;
  level: "must" | "nice" | "mentioned";
  status: "met" | "partial" | "missing";
  postingQuote: string;
  cvQuote: string | null;
  /** The bullet that proves it, and the role it sits under. */
  proof?: { role: string; line: string } | null;
};

/** Each requirement mapped to master-CV evidence with the exact lines (DOC-02). */
export function evidenceMatrix(req: Requirements | null, cv: CvParse | null, profile: Profile): Evidence[] {
  const cvSkillQuotes = new Map((cv?.skills ?? []).map((s) => [s.skill.toLowerCase(), s.quote]));
  const mine = new Set(profile.skills.map((s) => s.toLowerCase()));
  const bullets = (cv?.roles ?? []).flatMap((r) => r.bullets.map((b) => ({ b, role: r })));
  const out: Evidence[] = [];
  for (const s of req?.skills ?? []) {
    const k = s.skill.toLowerCase();
    // Strongest proof: a bullet that uses the skill; otherwise the CV line where it appears.
    const bullet = bullets.find((x) => findSkills(x.b).some((h) => h.skill.toLowerCase() === k));
    const cvQuote = bullet ? `${bullet.role.title}${bullet.role.employer ? `, ${bullet.role.employer}` : ""}: ${bullet.b}` : cvSkillQuotes.get(k) ?? null;
    const status: Evidence["status"] = mine.has(k) ? (bullet ? "met" : "partial") : "missing";
    const proof = mine.has(k) && bullet ? { role: `${bullet.role.title}${bullet.role.employer ? ` at ${bullet.role.employer}` : ""}`, line: bullet.b } : null;
    out.push({ requirement: s.skill, level: s.level, status, postingQuote: s.quote, cvQuote: mine.has(k) ? cvQuote : null, proof });
  }
  if (req?.years) {
    const have = profile.years;
    out.push({ requirement: `${req.years.min}+ years of experience`, level: "must", status: have == null ? "partial" : have >= req.years.min ? "met" : "missing", postingQuote: req.years.quote, cvQuote: have != null ? `${have} years across the roles in your CV` : null });
  }
  for (const l of req?.languages ?? []) {
    const lang = profile.languages.find((x) => x.language.toLowerCase() === l.language.toLowerCase());
    out.push({ requirement: `${l.language}`, level: "must", status: lang || l.language === "English" ? "met" : "missing", postingQuote: l.quote, cvQuote: lang ? `${lang.language}: ${lang.level}` : null });
  }
  const order = { missing: 0, partial: 1, met: 2 };
  const lvl = { must: 0, nice: 1, mentioned: 2 };
  return out.sort((a, b) => lvl[a.level] - lvl[b.level] || order[a.status] - order[b.status]);
}

export type CvDoc = {
  name: string;
  contact: string[]; // email, phone, location, links
  summary: string;
  skills: string[];
  experience: { title: string; employer: string | null; start: string | null; end: string | null; bullets: string[] }[];
  education: string[];
  languages: string[];
};

/** Tailored CV from the master CV: matched skills first, the most relevant bullets first, nothing invented. */
export function buildCvDoc(cv: CvParse, profile: Profile, req: Requirements | null): CvDoc {
  const weight = new Map((req?.skills ?? []).map((s) => [s.skill.toLowerCase(), s.level === "must" ? 2 : 1]));
  const relevant = (text: string) => findSkills(text).reduce((n, h) => n + (weight.get(h.skill.toLowerCase()) ?? 0), 0) + (/\d/.test(text) ? 0.5 : 0);
  const skills = [...profile.skills].sort((a, b) => (weight.get(b.toLowerCase()) ?? 0) - (weight.get(a.toLowerCase()) ?? 0));
  const c = cv.contact;
  return {
    name: c.name ?? "Your Name",
    contact: [c.email, c.phone, c.location, ...c.links].filter((x): x is string => !!x),
    summary: cv.summary ?? `[Write 2 sentences in your own words: what you do, for how long (${profile.years ?? "?"} years), and what you're best at for this role.]`,
    skills,
    experience: cv.roles.map((r) => ({
      title: r.title,
      employer: r.employer,
      start: r.start,
      end: r.end,
      bullets: [...r.bullets].map((b, i) => ({ b, i, s: relevant(b) })).sort((x, y) => y.s - x.s || x.i - y.i).map((x) => x.b),
    })),
    education: cv.education.map((e) => e.text),
    languages: profile.languages.map((l) => `${l.language} (${l.level})`),
  };
}

/**
 * Editable plain-text form of the tailored CV. The candidate edits this; the PDF
 * and DOCX are both rendered from it (DOC-04: one source, single column).
 *
 *   Name
 *   Location · email · phone · links
 *   SUMMARY / SKILLS / EXPERIENCE / EDUCATION / LANGUAGES headings
 *   Title | Employer | Jan 2022 – Present   (role header)
 *   - bullet
 */
export const CV_HEADINGS = ["SUMMARY", "SKILLS", "EXPERIENCE", "EDUCATION", "LANGUAGES"] as const;

export function cvDocToText(d: CvDoc): string {
  const out = [d.name, d.contact.join(" · "), "", "SUMMARY", d.summary, "", "SKILLS", d.skills.join(", "), "", "EXPERIENCE"];
  for (const r of d.experience) {
    const dates = r.start || r.end ? `${r.start ?? ""} – ${r.end ?? ""}`.trim() : null;
    out.push([r.title, r.employer, dates].filter(Boolean).join(" | "));
    for (const b of r.bullets) out.push(`- ${b}`);
    out.push("");
  }
  if (d.education.length) out.push("EDUCATION", ...d.education, "");
  if (d.languages.length) out.push("LANGUAGES", d.languages.join(", "), "");
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

const DATE_RANGE = /^(.*?\d{4})\s*[–—-]\s*(.+)$/;

export function parseCvDocText(text: string): CvDoc {
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.trimEnd());
  const d: CvDoc = { name: "", contact: [], summary: "", skills: [], experience: [], education: [], languages: [] };
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  d.name = (lines[i++] ?? "").trim();
  if (lines[i] && !CV_HEADINGS.includes(lines[i].trim() as never)) d.contact = lines[i++].split(/\s+·\s+/).map((s) => s.trim()).filter(Boolean);
  let section = "";
  const summary: string[] = [];
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (CV_HEADINGS.includes(line as never)) { section = line; continue; }
    if (section === "SUMMARY") summary.push(line);
    else if (section === "SKILLS") d.skills.push(...line.split(/\s*,\s*/).filter(Boolean));
    else if (section === "EXPERIENCE") {
      if (/^[-•*]\s+/.test(line) && d.experience.length) d.experience.at(-1)!.bullets.push(line.replace(/^[-•*]\s+/, ""));
      else {
        const parts = line.split(/\s+\|\s+/);
        const last = parts.at(-1) ?? "";
        const m = parts.length > 1 ? last.match(DATE_RANGE) : null;
        if (m) parts.pop();
        d.experience.push({ title: parts[0] ?? line, employer: parts[1] ?? null, start: m ? m[1].trim() : null, end: m ? m[2].trim() : null, bullets: [] });
      }
    } else if (section === "EDUCATION") d.education.push(line);
    else if (section === "LANGUAGES") d.languages.push(...line.split(/\s*,\s*(?![^()]*\))/).filter(Boolean));
  }
  d.summary = summary.join(" ");
  return d;
}

export type ChangeEntry = { text: string; where: string; status: "from_cv" | "moved" | "edited"; serves: string[] };

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}%]+/gu, " ").trim();

/**
 * Change log (DOC-07): every summary sentence and bullet in the tailored CV, with
 * whether it is word-for-word from the master CV, moved, or new/edited text, and
 * which of the posting's requirements it serves.
 */
export function changeLog(doc: CvDoc, cv: CvParse, req: Requirements | null): ChangeEntry[] {
  const reqSkills = new Map((req?.skills ?? []).filter((s) => s.level !== "mentioned").map((s) => [s.skill.toLowerCase(), s.skill]));
  const serves = (t: string) => [...new Set(findSkills(t).map((h) => reqSkills.get(h.skill.toLowerCase())).filter((x): x is string => !!x))];
  const out: ChangeEntry[] = [];
  const masterSummary = norm(cv.summary ?? "");
  if (doc.summary && !/^\[/.test(doc.summary)) {
    out.push({ text: doc.summary, where: "Summary", status: masterSummary && masterSummary === norm(doc.summary) ? "from_cv" : "edited", serves: serves(doc.summary) });
  }
  for (const r of doc.experience) {
    const master = cv.roles.find((m) => norm(m.title) === norm(r.title) && norm(m.employer ?? "") === norm(r.employer ?? ""));
    const masterBullets = (master?.bullets ?? []).map(norm);
    r.bullets.forEach((b, i) => {
      const at = masterBullets.indexOf(norm(b));
      out.push({ text: b, where: `${r.title}${r.employer ? `, ${r.employer}` : ""}`, status: at < 0 ? "edited" : at === i ? "from_cv" : "moved", serves: serves(b) });
    });
  }
  return out;
}

export function offsetOf(tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? tz;
  } catch {
    return tz;
  }
}

export function engagementSentence(e: Profile["engagements"]): string {
  const parts: string[] = [];
  if (e.includes("employee") && e.includes("eor")) parts.push("as an employee, directly or through an employer of record");
  else if (e.includes("employee")) parts.push("as an employee");
  else if (e.includes("eor")) parts.push("as an employee through an employer of record");
  if (e.includes("contractor")) parts.push("as a contractor");
  return parts.length ? ` I can work ${parts.join(", or ")}.` : "";
}

/** Up to `max` proof sentences, each from a different CV line, must-haves first. */
export function proofSentences(evidence: Evidence[], max = 2): string[] {
  const proofs: { req: string[]; role: string; line: string }[] = [];
  for (const e of evidence.filter((x) => x.status === "met" && x.proof && x.level !== "mentioned")) {
    const same = proofs.find((p) => p.line === e.proof!.line);
    if (same) same.req.push(e.requirement);
    else if (proofs.length < max) proofs.push({ req: [e.requirement], role: e.proof!.role, line: e.proof!.line });
  }
  return proofs.map((p) => {
    const what = p.req.length > 1 ? `${p.req.slice(0, -1).join(", ")} and ${p.req.at(-1)}` : p.req[0];
    const line = p.line.replace(/[.;]\s*$/, "");
    const first = line.split(/\s+/)[0] ?? "";
    const verbLike = /^[A-Z][a-z]+ed$/.test(first) || /^(Led|Built|Ran|Grew|Won|Made|Set|Drove|Wrote|Took|Cut|Sold|Kept|Taught|Brought|Began|Rebuilt)$/.test(first);
    return verbLike
      ? `On ${what}: as ${p.role}, I ${first.toLowerCase()}${line.slice(first.length)}.`
      : `On ${what}, from my time as ${p.role}: ${line}.`;
  });
}

/** "I'm based in Nigeria (GMT+1). I can work as …" */
export function locationSentence(profile: Profile, overlapNote: string | null): string {
  return `I'm based in ${countryName(profile.country)} (${offsetOf(profile.timezone)})${overlapNote ? `, ${overlapNote}` : ""}.${engagementSentence(profile.engagements)}`;
}

/** Cover letter template (DOC-08): proof from the CV plus blanks the candidate must fill. */
export function buildLetter(opts: {
  name: string;
  company: string;
  title: string;
  evidence: Evidence[];
  profile: Profile;
  overlapNote: string | null;
}): string {
  const proofLines = proofSentences(opts.evidence);
  const lines = [
    `Dear ${opts.company} hiring team,`,
    "",
    `I'm applying for the ${opts.title} role. [Write one or two sentences on why ${opts.company} specifically: something concrete from the posting, their product or their customers. Avoid praise that would fit any company.]`,
    "",
    ...proofLines,
    ...(proofLines.length ? [""] : ["[Add one specific result from your CV that matches what this role needs most.]", ""]),
    locationSentence(opts.profile, opts.overlapNote),
    "",
    "Kind regards,",
    opts.name,
  ];
  return lines.join("\n");
}

/** Application-form questions that must never be auto-answered (P-08, DOC-09). */
export const SENSITIVE_Q = /\b(authori[sz]|sponsor|visa|citizen|right to work|work permit|legally|gender|race|ethnic|veteran|disab|pronoun|sexual|age\b|date of birth|criminal|convict|salary|compensation|pay expectation|located|location|country|reside|relocat|hispanic|latino|demographic|employment agreements?|non-?compete|post-employment|restrictions? with|clearance)/i;
export const KNOCKOUT_Q = /\b(authori[sz]|sponsor|visa|citizen|right to work|work permit|located|country|reside|time ?zone|willing to relocate|clearance|overlap|working hours)/i;

export type FormQuestion = { label: string; required: boolean; kind: "sensitive" | "contact" | "free" | "choice" | "other"; prefill: string | null; guidance: string };

/** Classify employer form questions; prefill only harmless contact fields. */
export function classifyQuestions(qs: { label: string; required: boolean; type: string }[], cv: CvParse | null): FormQuestion[] {
  const c = cv?.contact;
  const [first, ...rest] = (c?.name ?? "").split(" ");
  return qs.map((q) => {
    const l = q.label.toLowerCase();
    if (SENSITIVE_Q.test(q.label)) return { ...q, kind: "sensitive", prefill: null, guidance: KNOCKOUT_Q.test(q.label) ? "Knockout question: answer it yourself, truthfully. A wrong yes here can disqualify you or worse." : "Answer this yourself. JobHunter never fills it in." };
    if (/^first name/.test(l)) return { ...q, kind: "contact", prefill: first || null, guidance: "From your CV" };
    if (/^last name|surname/.test(l)) return { ...q, kind: "contact", prefill: rest.join(" ") || null, guidance: "From your CV" };
    if (/e-?mail/.test(l)) return { ...q, kind: "contact", prefill: c?.email ?? null, guidance: "From your CV" };
    if (/phone/.test(l)) return { ...q, kind: "contact", prefill: c?.phone ?? null, guidance: "From your CV" };
    if (/linkedin/.test(l)) return { ...q, kind: "contact", prefill: c?.links.find((x) => /linkedin/i.test(x)) ?? null, guidance: "From your CV" };
    if (/resume|cv/.test(l)) return { ...q, kind: "other", prefill: null, guidance: "Upload the tailored CV from this page" };
    if (/cover letter/.test(l)) return { ...q, kind: "other", prefill: null, guidance: "Upload or paste the letter from this page" };
    if (/select|boolean|checkbox|yes_no/.test(q.type)) return { ...q, kind: "choice", prefill: null, guidance: "A choice about you: answer it yourself." };
    if (q.type === "textarea" || /\b(why|tell us|describe|what|how)\b/.test(l)) return { ...q, kind: "free", prefill: null, guidance: "Write this in your own words. Use one concrete example from your CV." };
    return { ...q, kind: "other", prefill: null, guidance: "" };
  });
}
