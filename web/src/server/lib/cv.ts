import { seniorityOf } from "./normalize";
import { canonicalSkill, findSkills } from "./skills";

/**
 * Rule-based CV reader (no-AI mode, D-16). It pre-fills the profile form; the
 * candidate confirms everything. Every extracted item keeps the CV line it came
 * from (PROF-02), and dates/years are computed in code (PROF-03).
 */

export type CvRole = { title: string; employer: string | null; start: string | null; end: string | null; current: boolean; months: number | null; quote: string; flags: string[] };
export type CvParse = {
  roles: CvRole[];
  skills: { skill: string; quote: string }[];
  education: { text: string }[];
  languages: { language: string; level: string | null; quote: string }[];
  totalYears: number | null;
  seniorityGuess: string | null;
  warnings: string[];
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_RE = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const DATE = `(?:${MONTH_RE}\\.?\\s+\\d{4}|\\d{1,2}\\s*/\\s*\\d{4}|\\d{4})`;
const RANGE_RE = new RegExp(`(${DATE})\\s*(?:-|–|—|to|until)\\s*(${DATE}|present|current|now|date|ongoing)`, "i");

const SECTION_RE = /^(work experience|professional experience|experience|employment history|employment|career history|work history|education|academic background|qualifications|skills|technical skills|core skills|key skills|competencies|languages|certifications|certificates|summary|profile|professional summary|projects|volunteer(ing)?|references|awards|interests)\s*:?$/i;

/** Parse "Mar 2021", "03/2021" or "2021" into a month index (months since year 0). */
function toMonth(d: string, isEnd: boolean): number | null {
  const s = d.trim().toLowerCase();
  if (/^(present|current|now|date|ongoing)$/.test(s)) {
    const n = new Date();
    return n.getUTCFullYear() * 12 + n.getUTCMonth();
  }
  const m1 = s.match(new RegExp(`^(${MONTH_RE})\\.?\\s+(\\d{4})$`, "i"));
  if (m1) return Number(m1[2]) * 12 + MONTHS.indexOf(m1[1].slice(0, 3));
  const m2 = s.match(/^(\d{1,2})\s*\/\s*(\d{4})$/);
  if (m2) return Number(m2[2]) * 12 + Math.min(11, Math.max(0, Number(m2[1]) - 1));
  const m3 = s.match(/^(\d{4})$/);
  if (m3) return Number(m3[1]) * 12 + (isEnd ? 11 : 0);
  return null;
}

/** Total experience in years from role intervals, merging overlaps (rounded to 0.5). */
export function totalYears(intervals: [number, number][]): number | null {
  const valid = intervals.filter(([a, b]) => b >= a).sort((x, y) => x[0] - y[0]);
  if (!valid.length) return null;
  let months = 0;
  let [cs, ce] = valid[0];
  for (const [s, e] of valid.slice(1)) {
    if (s <= ce + 1) ce = Math.max(ce, e);
    else {
      months += ce - cs + 1;
      [cs, ce] = [s, e];
    }
  }
  months += ce - cs + 1;
  return Math.round((months / 12) * 2) / 2;
}

function splitTitleEmployer(text: string): { title: string; employer: string | null } {
  const t = text.replace(/[|•·]+/g, "|").replace(/\s{2,}/g, " ").trim().replace(/^[,|–—-]+|[,|–—-]+$/g, "").trim();
  const at = t.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  if (at) return { title: at[1].trim(), employer: at[2].trim() };
  const parts = t.split(/\s+[|–—]\s+|\s+-\s+|,\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { title: parts[0], employer: parts[1] };
  return { title: t, employer: null };
}

const LEVEL_WORDS: [RegExp, string][] = [
  [/\bnative|mother tongue|first language\b/i, "C2"],
  [/\bc2\b|\bproficient\b|\bbilingual\b/i, "C2"],
  [/\bc1\b|\bfluent\b|\badvanced\b/i, "C1"],
  [/\bb2\b|\bprofessional|upper[- ]intermediate|working proficiency\b/i, "B2"],
  [/\bb1\b|\bintermediate\b|\bconversational\b/i, "B1"],
  [/\ba2\b|\bbasic\b|\belementary\b/i, "A2"],
  [/\ba1\b|\bbeginner\b/i, "A1"],
];
const LANG_NAMES = /\b(English|French|Spanish|Portuguese|German|Italian|Dutch|Arabic|Mandarin|Chinese|Japanese|Korean|Hindi|Russian|Polish|Turkish|Swahili|Yoruba|Igbo|Hausa|Amharic|Swedish|Greek|Hebrew|Ukrainian|Romanian|Tagalog|Indonesian)\b/g;

export function parseCvText(raw: string): CvParse {
  const lines = raw.replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const warnings: string[] = [];
  let section = "";
  const roles: CvRole[] = [];
  const education: { text: string }[] = [];
  const languages: CvParse["languages"] = [];
  const explicitSkills: { skill: string; quote: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length <= 40 && SECTION_RE.test(line.replace(/[:\-–]+$/, "").trim())) {
      section = line.toLowerCase();
      continue;
    }
    const range = line.match(RANGE_RE);
    if (range && !/education|academic|qualification/.test(section)) {
      const start = range[1];
      const end = range[2];
      const rest = line.replace(range[0], " ").replace(/[()]/g, " ").trim();
      // Title/employer are on the same line, or on the line(s) just above the dates.
      let src = rest.length >= 3 ? rest : "";
      let quote = line;
      if (!src && i > 0 && !RANGE_RE.test(lines[i - 1]) && !SECTION_RE.test(lines[i - 1])) {
        src = lines[i - 1];
        quote = `${lines[i - 1]}\n${line}`;
        if (i > 1 && !RANGE_RE.test(lines[i - 2]) && lines[i - 2].length < 80 && !SECTION_RE.test(lines[i - 2]) && !/[.!?]$/.test(lines[i - 2]) && !roles.some((r) => r.quote.includes(lines[i - 2]))) {
          src = `${lines[i - 2]} | ${lines[i - 1]}`;
          quote = `${lines[i - 2]}\n${quote}`;
        }
      }
      const { title, employer } = splitTitleEmployer(src || "Unknown role");
      const s = toMonth(start, false);
      const e = toMonth(end, true);
      const flags: string[] = [];
      if (s == null || e == null) flags.push("date not understood");
      if (!employer) flags.push("employer not found");
      if (!src) flags.push("title not found");
      roles.push({
        title, employer, start, end,
        current: /present|current|now|date|ongoing/i.test(end),
        months: s != null && e != null ? e - s + 1 : null,
        quote, flags,
      });
      continue;
    }
    if (/education|academic|qualification/.test(section) && /\b(b\.?sc|bsc|b\.?a\b|ba\b|b\.?eng|b\.?tech|bachelor|m\.?sc|msc|mba|master|ph\.?d|doctor|hnd|ond|diploma|certificate|degree|nce\b|waec|neco)\b/i.test(line)) {
      education.push({ text: line });
      continue;
    }
    if (/language/.test(section) || /^languages?\s*:/i.test(line)) {
      for (const m of line.matchAll(LANG_NAMES)) {
        const after = line.slice(m.index!, m.index! + m[0].length + 30);
        const level = LEVEL_WORDS.find(([re]) => re.test(after))?.[1] ?? null;
        if (!languages.some((l) => l.language === m[1])) languages.push({ language: m[1], level, quote: line });
      }
      continue;
    }
    if (/skill|competenc/.test(section) || /^(skills|tools|technologies)\s*:/i.test(line)) {
      for (const part of line.replace(/^(skills|tools|technologies)\s*:/i, "").split(/[,;•|·]/)) {
        const p = part.trim();
        if (p.length >= 2 && p.length <= 40) explicitSkills.push({ skill: canonicalSkill(p), quote: line });
      }
    }
  }

  // Overlapping roles are fine (counted once); flag them so the candidate can check.
  const intervals: [number, number][] = [];
  for (const r of roles) {
    const s = r.start ? toMonth(r.start, false) : null;
    const e = r.end ? toMonth(r.end, true) : null;
    if (s != null && e != null) {
      if (intervals.some(([a, b]) => s <= b && e >= a)) r.flags.push("overlaps another role");
      intervals.push([s, e]);
    }
  }

  const found = findSkills(raw);
  const skills = [...found];
  for (const e of explicitSkills) if (!skills.some((s) => s.skill.toLowerCase() === e.skill.toLowerCase())) skills.push(e);

  if (!roles.length) warnings.push("No job dates were found. If your CV uses an unusual layout, add your roles in the form.");
  if (lines.filter((l) => l.length < 25).length > lines.length * 0.6) warnings.push("Many very short lines: the CV may use columns, so check the extracted roles carefully.");
  const years = totalYears(intervals);
  const latest = roles.find((r) => r.current) ?? roles[0];
  let seniorityGuess = latest ? seniorityOf(latest.title) : null;
  if (!seniorityGuess && years != null) seniorityGuess = years >= 8 ? "Senior" : years >= 3 ? "Mid" : "Junior";

  return { roles, skills, education, languages, totalYears: years, seniorityGuess, warnings };
}

/** Plain text from an uploaded CV. PDF via unpdf, Word via mammoth, otherwise UTF-8 text. */
export async function extractCvText(file: { name: string; type: string; bytes: Uint8Array }): Promise<string> {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(file.bytes);
    const { text } = await extractText(pdf, { mergePages: false });
    return (Array.isArray(text) ? text : [text]).join("\n");
  }
  if (name.endsWith(".docx") || file.type.includes("wordprocessingml")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(file.bytes) });
    return value;
  }
  return new TextDecoder().decode(file.bytes);
}
