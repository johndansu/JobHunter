import { categorize, normTitle } from "./normalize";
import type { Requirements } from "./requirements";

/**
 * Rule-based matching (no-AI mode, D-16; decisions RANK-02…06).
 * Fit is shown as bands with a quoted checklist, never as a percentage.
 */

export type MatchProfile = {
  targetTitles: string[];
  categories: string[];
  seniority: string | null;
  years: number | null;
  skills: string[];
  languages: { language: string; level: string }[];
};

export type Band = "strong" | "good" | "stretch" | "unlikely";
export type Checklist = {
  title: { best: string | null; score: number };
  matched: { skill: string; quote: string }[];
  missingMust: { skill: string; quote: string }[];
  missingNice: { skill: string; quote: string }[];
  years: { need: number; have: number | null; ok: boolean; quote: string } | null;
  seniority: { job: string | null; you: string | null; fit: "under" | "at" | "over" | "unknown" };
  languages: { language: string; ok: boolean; quote: string }[];
};
export type MatchResult = { fit: number; band: Band; checklist: Checklist };

const LADDER: Record<string, number> = { Intern: 0, Junior: 1, Mid: 2, Senior: 3, "Lead/Manager": 4, "Principal/Staff": 4, "Director+": 5 };
const STOP = new Set(["senior", "junior", "lead", "staff", "principal", "i", "ii", "iii", "iv", "head", "of", "and", "the", "a", "an", "to", "for", "in", "with", "remote", "global", "emea", "us", "uk"]);
const SYNONYM: Record<string, string> = {
  developer: "engineer", programmer: "engineer", swe: "engineer", dev: "engineer",
  service: "support", care: "support", rep: "representative", representatives: "representative",
  mgr: "manager", exec: "executive", ops: "operations", assistant: "assistant", va: "assistant",
  analyst: "analyst", specialist: "specialist", associate: "specialist", officer: "specialist",
  frontend: "front", backend: "back", fullstack: "full",
};

const tokens = (t: string) =>
  normTitle(t)
    .replace(/front[- ]end/g, "frontend").replace(/back[- ]end/g, "backend").replace(/full[- ]stack/g, "fullstack")
    .split(" ")
    .filter((w) => w && !STOP.has(w))
    .map((w) => SYNONYM[w] ?? w);

/** How close a job title is to the candidate's target titles (0–1). */
export function titleSimilarity(jobTitle: string, targets: string[]): { best: string | null; score: number } {
  const jt = new Set(tokens(jobTitle));
  let best: string | null = null;
  let score = 0;
  for (const t of targets) {
    const tt = new Set(tokens(t));
    if (!tt.size || !jt.size) continue;
    const inter = [...tt].filter((w) => jt.has(w)).length;
    const containment = inter / tt.size; // how much of the target appears in the job title
    const jaccard = inter / new Set([...tt, ...jt]).size;
    const s = 0.7 * containment + 0.3 * jaccard;
    if (s > score) [score, best] = [s, t];
  }
  return { best, score: Math.round(score * 100) / 100 };
}

const BAND_SCORE: Record<Band, number> = { strong: 1, good: 0.75, stretch: 0.5, unlikely: 0.2 };
export const bandScore = (b: Band) => BAND_SCORE[b];

export function scoreMatch(
  profile: MatchProfile,
  job: { title: string; category: string; seniority: string | null; requirements: Requirements | null },
): MatchResult {
  const req = job.requirements;
  const mine = new Set(profile.skills.map((s) => s.toLowerCase()));
  const title = titleSimilarity(job.title, profile.targetTitles);
  // No categories picked yet: infer them from the target roles.
  const cats = profile.categories.length ? profile.categories : profile.targetTitles.map((t) => categorize(t));
  const categoryMatch = cats.includes(job.category);
  const categoryBoost = categoryMatch ? 0.1 : 0;
  const titleScore = Math.min(1, title.score + categoryBoost);

  const reqSkills = req?.skills ?? [];
  const must = reqSkills.filter((s) => s.level === "must");
  const nice = reqSkills.filter((s) => s.level !== "must");
  const matched = reqSkills.filter((s) => mine.has(s.skill.toLowerCase())).map((s) => ({ skill: s.skill, quote: s.quote }));
  const missingMust = must.filter((s) => !mine.has(s.skill.toLowerCase())).map((s) => ({ skill: s.skill, quote: s.quote }));
  const missingNice = nice.filter((s) => !mine.has(s.skill.toLowerCase())).map((s) => ({ skill: s.skill, quote: s.quote }));
  let skillScore: number;
  if (must.length) skillScore = (must.length - missingMust.length) / must.length + (nice.length ? 0.15 * ((nice.length - missingNice.length) / nice.length) : 0);
  else if (nice.length) skillScore = Math.min(1, (nice.length - missingNice.length) / Math.min(5, nice.length));
  else skillScore = 0.5; // posting names no skills we recognise: neutral
  skillScore = Math.min(1, skillScore);

  const jl = job.seniority ? LADDER[job.seniority] : undefined;
  const yl = profile.seniority ? LADDER[profile.seniority] : undefined;
  let senScore = 0.8;
  let senFit: Checklist["seniority"]["fit"] = "unknown";
  if (jl != null && yl != null) {
    const d = jl - yl;
    senFit = d === 0 ? "at" : d > 0 ? "under" : "over";
    senScore = d === 0 ? 1 : Math.abs(d) === 1 ? 0.6 : 0.2;
  }

  let years: Checklist["years"] = null;
  let yearsScore = 0.8;
  if (req?.years) {
    const have = profile.years;
    const ok = have != null && have >= req.years.min;
    years = { need: req.years.min, have, ok, quote: req.years.quote };
    yearsScore = have == null ? 0.6 : ok ? 1 : req.years.min - have <= 1 ? 0.6 : 0.2;
  }

  const spoken = new Set(["english", ...profile.languages.map((l) => l.language.toLowerCase())]);
  const languages = (req?.languages ?? []).map((l) => ({ language: l.language, ok: spoken.has(l.language.toLowerCase()), quote: l.quote }));

  let fit = 0.4 * titleScore + 0.35 * skillScore + 0.15 * senScore + 0.1 * yearsScore;
  fit = Math.round(fit * 100) / 100;
  let band: Band = fit >= 0.68 ? "strong" : fit >= 0.5 ? "good" : fit >= 0.33 ? "stretch" : "unlikely";
  // Guards: skills alone can't make a far-off role a top match.
  const rankOf = { strong: 3, good: 2, stretch: 1, unlikely: 0 } as const;
  const cap = (b: Band) => { if (rankOf[band] > rankOf[b]) band = b; };
  if (title.score < 0.6) cap("good"); // Strong needs a close title
  if (title.score < 0.35 && !(categoryMatch && skillScore >= 0.6)) cap("stretch");
  if (title.score < 0.1 && matched.length < 3) cap("unlikely");
  if (titleScore < 0.2 && skillScore < 0.4) cap("unlikely");
  if (missingMust.length >= 3) cap("good");
  if (languages.some((l) => !l.ok)) cap("unlikely"); // a required language you don't speak

  return {
    fit,
    band,
    checklist: { title, matched, missingMust, missingNice, years, seniority: { job: job.seniority, you: profile.seniority, fit: senFit }, languages },
  };
}

/** Half-life in days for the freshness multiplier (RANK-06): senior/niche roles stay relevant longer. */
export const halfLifeDays = (seniority: string | null) =>
  seniority && ["Lead/Manager", "Principal/Staff", "Director+"].includes(seniority) ? 12 : 4;

export const FRESHNESS_FLOOR = 0.3;
export function freshness(ageDays: number, halfLife: number, floor = FRESHNESS_FLOOR) {
  return floor + (1 - floor) * Math.pow(0.5, Math.max(0, ageDays) / halfLife);
}

/** Related titles to suggest for approval (RANK-10, rule-based). */
const FAMILIES: string[][] = [
  ["Customer Support Specialist", "Customer Success Manager", "Technical Support Specialist", "Support Engineer", "Customer Experience Specialist", "Community Manager"],
  ["Software Engineer", "Backend Engineer", "Frontend Engineer", "Full Stack Engineer", "Web Developer", "Platform Engineer"],
  ["Data Analyst", "Business Analyst", "BI Analyst", "Analytics Engineer", "Data Scientist", "Operations Analyst"],
  ["Sales Development Representative", "Business Development Representative", "Account Executive", "Account Manager", "Partnerships Manager"],
  ["Marketing Manager", "Content Marketing Manager", "Growth Marketer", "SEO Specialist", "Social Media Manager", "Product Marketing Manager"],
  ["Product Designer", "UX Designer", "UI Designer", "Graphic Designer", "Brand Designer"],
  ["Product Manager", "Product Owner", "Technical Product Manager", "Program Manager", "Project Manager"],
  ["Accountant", "Bookkeeper", "Financial Analyst", "Accounts Payable Specialist", "Payroll Specialist", "FP&A Analyst"],
  ["Recruiter", "Technical Recruiter", "Talent Acquisition Specialist", "HR Generalist", "People Operations Specialist"],
  ["Virtual Assistant", "Executive Assistant", "Administrative Assistant", "Operations Coordinator", "Office Manager"],
  ["Content Writer", "Copywriter", "Technical Writer", "Editor", "Content Strategist"],
  ["Teacher", "Tutor", "Instructional Designer", "Curriculum Developer", "Online English Teacher"],
  ["DevOps Engineer", "Site Reliability Engineer", "Cloud Engineer", "Infrastructure Engineer", "Platform Engineer"],
  ["QA Engineer", "Test Automation Engineer", "QA Analyst", "Software Tester"],
];

export function relatedTitles(targets: string[]): string[] {
  const out = new Set<string>();
  for (const t of targets)
    for (const fam of FAMILIES)
      if (fam.some((f) => titleSimilarity(f, [t]).score >= 0.7)) fam.forEach((f) => out.add(f));
  for (const t of targets) for (const f of [...out]) if (titleSimilarity(f, [t]).score >= 0.95) out.delete(f);
  return [...out].slice(0, 12);
}
