import { seniorityOf } from "./normalize";
import { findSkills, skillIndex } from "./skills";
import { sentences } from "./text";

/**
 * Requirement record per posting (RANK-01), extracted by rules (no-AI mode).
 * Skills are classed must / nice / mentioned by the section they sit in and the
 * wording around them; every item keeps the posting's own sentence.
 */
export type ReqSkill = { skill: string; level: "must" | "nice" | "mentioned"; quote: string };
export type Requirements = {
  skills: ReqSkill[];
  years: { min: number; quote: string } | null;
  languages: { language: string; quote: string }[];
  degree: { level: "bachelor" | "master" | "phd" | "any"; required: boolean; quote: string } | null;
  seniority: string | null;
};

const MUST_HEAD = /^(requirements?|qualifications?|minimum qualifications|basic qualifications|required (skills|experience|qualifications)|what you('ll)? (need|bring|have)|what we('re)? looking for|must[- ]haves?|you (have|bring|are|will have)|about you|who you are|your (profile|skills|experience)|skills( and|\s*&)? experience|key skills|the ideal candidate)\b/i;
const NICE_HEAD = /^(nice[- ]to[- ]haves?|bonus( points)?|preferred( qualifications| skills)?|pluses|extra credit|good to have|it('s| is| would be) (great|a plus|nice) if|additional (skills|qualifications)|desirable)\b/i;
const OTHER_HEAD = /^(responsibilities|what you('ll)? do|the role|about the role|day[- ]to[- ]day|your (role|mission|impact)|about us|who we are|why (join|us))\b/i;
// Benefits sections list what the employer gives, never what the candidate needs ("Health insurance plans", "L&D budget").
const BENEFIT_HEAD = /^((our )?benefits|perks|(our )?benefits( and|\s*&)? perks|perks( and|\s*&)? benefits|what we offer|we offer|our offer|what ([\p{L}\d&.'-]+ ){0,3}(offers?|provides?|gives?)( to)?( you)?|what you('ll)? get(\s+in return)?$|what's in it for you|why you'll love|compensation( and|\s*&)? benefits|total rewards|the perks)/iu;

const NICE_WORDS = /\b(nice to have|preferred|is a plus|are a plus|a plus|bonus|ideally|desirable|advantageous|would be great|familiarity with|exposure to)\b/i;
const MUST_WORDS = /\b(required|must|need(ed)?|requires?|proven|strong|solid|expert|proficien\w*|experience (with|in|using)|hands-on|deep knowledge|demonstrated|minimum)\b/i;

const LANGS = [
  "English", "French", "Spanish", "Portuguese", "German", "Italian", "Dutch", "Arabic", "Mandarin", "Chinese", "Japanese",
  "Korean", "Hindi", "Russian", "Polish", "Turkish", "Swahili", "Yoruba", "Igbo", "Hausa", "Amharic", "Swedish",
  "Norwegian", "Danish", "Finnish", "Greek", "Hebrew", "Vietnamese", "Thai", "Indonesian", "Malay", "Tagalog", "Ukrainian", "Czech", "Romanian", "Hungarian",
];
const LANG_RE = new RegExp(
  `\\b(?:(?:fluen(?:t|cy)|native|bilingual|proficien(?:t|cy)|business[- ]level|professional(?: working)?|written and spoken|spoken and written|excellent|strong|good)\\s+(?:in\\s+|level\\s+)?(?:command of\\s+)?(?:(?:written|spoken|verbal)(?:\\s+and\\s+(?:written|spoken|verbal))?\\s+)?(?:communication in\\s+)?(${LANGS.join("|")})|(${LANGS.join("|")})\\s*(?:\\(|-|–|:)?\\s*(?:c1|c2|b2|native|fluent|business|professional)\\b|(?:speak|write|read)s?\\s+(?:fluent\\s+)?(${LANGS.join("|")}))`,
  "i",
);

export function extractRequirements(title: string, text: string): Requirements {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const bySkill = new Map<string, ReqSkill>();
  let years: Requirements["years"] = null;
  const languages: Requirements["languages"] = [];
  const rank = { must: 3, nice: 2, mentioned: 1 } as const;
  let section: "must" | "nice" | "other" | "benefits" | "none" = "none";

  for (const line of lines) {
    const head = line.replace(/^[•\-*#\s]+/, "").replace(/[:：]\s*$/, "");
    if (head.length <= 60) {
      if (BENEFIT_HEAD.test(head)) { section = "benefits"; continue; }
      if (NICE_HEAD.test(head)) { section = "nice"; continue; }
      if (MUST_HEAD.test(head)) { section = "must"; continue; }
      if (OTHER_HEAD.test(head)) { section = "other"; continue; }
    }
    if (section === "benefits") continue;
    for (const s of sentences(line)) {
      const quote = s.length > 200 ? s.slice(0, 199) + "…" : s;
      // "…in customer support, ideally in SaaS": a nice-word only softens what comes after it.
      const niceAt = s.search(NICE_WORDS);
      for (const h of findSkills(s)) {
        const at = skillIndex(h.skill, s);
        const softened = niceAt >= 0 && (at < 0 || niceAt < at);
        const level: ReqSkill["level"] = section === "nice" || softened ? "nice" : section === "must" || MUST_WORDS.test(s) ? "must" : "mentioned";
        const prev = bySkill.get(h.skill);
        if (!prev || rank[level] > rank[prev.level]) bySkill.set(h.skill, { skill: h.skill, level, quote: h.quote });
      }
      if (section === "nice") continue; // nice-to-have years/languages aren't requirements
      const y = s.match(/\b(\d{1,2})\s*\+?\s*(?:[-–to]+\s*\d{1,2}\s*\+?\s*)?(?:years?|yrs?)\b(?:\s+of)?(?:[^.]{0,60})\b(experience|exp\b|background|working)/i)
        ?? s.match(/\b(?:minimum|at least|min\.?)\s+(?:of\s+)?(\d{1,2})\s*(?:years?|yrs?)\b/i);
      if (y && (niceAt < 0 || niceAt > (y.index ?? 0))) {
        const min = Number(y[1]);
        if (min > 0 && min <= 25 && (!years || min > years.min)) years = { min, quote };
      }
      const m = s.match(LANG_RE);
      if (m && (niceAt < 0 || niceAt > (m.index ?? 0))) {
        const lang = m[1] ?? m[2] ?? m[3] ?? "";
        const normal = LANGS.find((l) => l.toLowerCase() === lang.toLowerCase());
        if (normal && !languages.some((x) => x.language === normal)) languages.push({ language: normal, quote });
      }
    }
  }

  // Titles like "Customer Success Manager (Arabic speaking)" or "German-speaking Support Agent".
  const tl = title.match(new RegExp(`\\b(${LANGS.join("|")})[- ]speak(?:ing|er)\\b|\\b(?:speaks?|fluent)\\s+(${LANGS.join("|")})\\b`, "i"));
  if (tl) {
    const normal = LANGS.find((l) => l.toLowerCase() === (tl[1] ?? tl[2]).toLowerCase());
    if (normal && !languages.some((x) => x.language === normal)) languages.push({ language: normal, quote: title });
  }

  let degree: Requirements["degree"] = null;
  for (const s of sentences(text)) {
    const m = s.match(/\b(ph\.?d|doctorate)|\b(master'?s|msc|m\.sc|mba)\b|\b(bachelor'?s|bsc|b\.sc|ba\b|b\.a\.|undergraduate degree)|\b(degree in|university degree|college degree|degree)\b/i);
    if (!m) continue;
    const level = m[1] ? "phd" : m[2] ? "master" : m[3] ? "bachelor" : "any";
    const required = !NICE_WORDS.test(s) && !/\bor equivalent( experience)?\b/i.test(s);
    degree = { level, required, quote: s.length > 200 ? s.slice(0, 199) + "…" : s };
    break;
  }

  return { skills: [...bySkill.values()], years, languages, degree, seniority: seniorityOf(title) };
}
