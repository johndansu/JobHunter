import type { MatchProfile } from "./match";

/**
 * The candidate profile (PROF-04): CV-derived fields the candidate confirmed,
 * plus facts only the candidate can declare. Never inferred by the app.
 */
export type Profile = MatchProfile & {
  country: string; // ISO alpha-2
  timezone: string; // IANA
  shiftHours: number; // how far the candidate will move their working day
  engagements: ("employee" | "contractor" | "eor")[];
  salaryFloor: { amount: number; currency: string; period: "year" | "month" | "hour" } | null;
  citizenships: string[]; // ISO alpha-2
  permits: { country: string; expires: string | null }[];
  includeUnclear: boolean; // show jobs whose location rules are unclear
};

export const EMPTY_PROFILE: Profile = {
  targetTitles: [],
  categories: [],
  seniority: null,
  years: null,
  skills: [],
  languages: [{ language: "English", level: "C2" }],
  country: process.env.DEFAULT_COUNTRY || "NG",
  timezone: process.env.DEFAULT_TIMEZONE || "Africa/Lagos",
  shiftHours: 0,
  engagements: ["employee", "contractor", "eor"],
  salaryFloor: null,
  citizenships: [],
  permits: [],
  includeUnclear: true,
};

const list = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

/** Build a profile from the profile form. Unknown values fall back to the current profile. */
export function profileFromForm(f: FormData, current: Profile): Profile {
  const langs = String(f.get("languages") ?? "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [language, level] = l.split(/[:\-–(]/).map((x) => x.replace(/\)/g, "").trim());
      return { language, level: (level || "B2").toUpperCase() };
    })
    .filter((l) => l.language);
  const permits: Profile["permits"] = [];
  for (const p of list(f.get("permits"))) {
    const m = p.match(/^([A-Za-z]{2})(?:\s+(?:until|to|exp(?:ires)?)?\s*(\d{4}-\d{2}(?:-\d{2})?))?$/);
    if (m) permits.push({ country: m[1].toUpperCase(), expires: m[2] ?? null });
  }
  const amount = Number(f.get("salaryAmount"));
  const years = f.get("years");
  return {
    targetTitles: list(f.get("targetTitles")),
    categories: f.getAll("categories").map(String),
    seniority: String(f.get("seniority") || "") || null,
    years: years === "" || years == null ? current.years : Number(years),
    skills: [...new Set(list(f.get("skills")))],
    languages: langs.length ? langs : current.languages,
    country: String(f.get("country") || current.country).toUpperCase(),
    timezone: String(f.get("timezone") || current.timezone),
    shiftHours: Math.max(0, Math.min(8, Number(f.get("shiftHours")) || 0)),
    engagements: f.getAll("engagements").map(String) as Profile["engagements"],
    salaryFloor: amount > 0 ? { amount, currency: String(f.get("salaryCurrency") || "USD").toUpperCase(), period: (String(f.get("salaryPeriod")) as "year") || "year" } : null,
    citizenships: list(f.get("citizenships")).map((c) => c.toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c)),
    permits,
    includeUnclear: f.get("includeUnclear") === "on",
  };
}
