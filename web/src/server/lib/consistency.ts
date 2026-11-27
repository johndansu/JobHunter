import { unzipSync, strFromU8 } from "fflate";
import { parseCvText, toMonth, type CvParse } from "./cv";
import { normCompany } from "./normalize";
import type { Flag } from "./checks";
import { sentences } from "./text";

/**
 * Consistency check (DOC-13). Names, titles, employers, dates and degrees must
 * agree across the CV, the letter and the candidate's public profile. Remote
 * employers screen hard for identity fraud, and a mismatch can read as one.
 * The profile comes only from an export the candidate supplies, never scraped.
 */

export type OtherRole = { title: string; employer: string; start: string | null; end: string | null };
export type OtherProfile = {
  source: "linkedin_export" | "document";
  fileName: string;
  name: string | null;
  roles: OtherRole[];
  education: { school: string; degree: string | null }[];
};

/** RFC 4180 CSV: quoted fields may hold commas, quotes ("") and newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let f = "";
  let q = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { f += '"'; i++; }
      else if (c === '"') q = false;
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(f); rows.push(row); row = []; f = "";
    } else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

/** Rows as objects, starting at the header row that has `must` (LinkedIn files can start with notes). */
function records(text: string, must: string): Record<string, string>[] {
  const rows = parseCsv(text);
  const h = rows.findIndex((r) => r.some((c) => c.trim() === must));
  if (h < 0) return [];
  const head = rows[h].map((c) => c.trim());
  return rows.slice(h + 1).map((r) => Object.fromEntries(head.map((k, i) => [k, (r[i] ?? "").trim()])));
}

/**
 * LinkedIn's "Get a copy of your data" export: the ZIP, or its Positions.csv /
 * Education.csv / Profile.csv. Only name, roles and education are kept; birth
 * date, address and everything else in Profile.csv are dropped.
 */
export function readLinkedInExport(files: { name: string; bytes: Uint8Array }[]): OtherProfile | null {
  const csv = new Map<string, string>();
  for (const f of files) {
    if (/\.zip$/i.test(f.name)) {
      const unz = unzipSync(f.bytes, { filter: (x) => /(^|\/)(positions|education|profile)\.csv$/i.test(x.name) });
      for (const [n, b] of Object.entries(unz)) csv.set(n.split("/").pop()!.toLowerCase(), strFromU8(b));
    } else if (/\.csv$/i.test(f.name)) csv.set(f.name.split(/[\\/]/).pop()!.toLowerCase(), strFromU8(f.bytes));
  }
  if (!csv.has("positions.csv") && !csv.has("education.csv") && !csv.has("profile.csv")) return null;
  const roles = records(csv.get("positions.csv") ?? "", "Company Name")
    .filter((r) => r["Company Name"] || r["Title"])
    .map((r) => ({ title: r["Title"] ?? "", employer: r["Company Name"] ?? "", start: r["Started On"] || null, end: r["Finished On"] || "Present" }));
  const education = records(csv.get("education.csv") ?? "", "School Name")
    .filter((r) => r["School Name"])
    .map((r) => ({ school: r["School Name"], degree: r["Degree Name"] || null }));
  const p = records(csv.get("profile.csv") ?? "", "First Name")[0];
  const name = p ? [p["First Name"], p["Last Name"]].filter(Boolean).join(" ") || null : null;
  return { source: "linkedin_export", fileName: files.map((f) => f.name).join(", "), name, roles, education };
}

/** A profile saved as PDF or text (e.g. LinkedIn's "Save to PDF"), read with the CV rules. */
export function readProfileDocument(text: string, fileName: string): OtherProfile {
  const p = parseCvText(text);
  return {
    source: "document",
    fileName,
    name: p.contact.name,
    roles: p.roles.map((r) => ({ title: r.title, employer: r.employer ?? "", start: r.start, end: r.end })),
    education: p.education.map((e) => ({ school: e.text, degree: null })),
  };
}

export type ConsistencyItem = {
  kind: "name" | "role" | "education";
  status: "match" | "mismatch" | "only_cv" | "only_other";
  label: string;
  cv: string | null;
  other: string | null;
  why: string;
};

const plain = (s: string | null | undefined) => (s ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const sameEmployer = (a: string | null, b: string | null) => {
  const x = normCompany(a ?? ""), y = normCompany(b ?? "");
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};
const sameTitle = (a: string, b: string) => {
  const x = plain(a), y = plain(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};
const isNow = (d: string | null) => !d || /present|current|now|date|ongoing/i.test(d);
const yearOnly = (d: string | null) => !!d && /^\s*\d{4}\s*$/.test(d);

/** Months between two dates, comparing years only when either side gives just a year. null = can't tell. */
function dateGap(a: string | null, b: string | null, isEnd: boolean): number | null {
  if (isEnd && isNow(a) && isNow(b)) return 0;
  if (isEnd && isNow(a) !== isNow(b)) return 99;
  if (!a || !b) return null;
  const x = toMonth(a, isEnd), y = toMonth(b, isEnd);
  if (x == null || y == null) return null;
  if (yearOnly(a) || yearOnly(b)) return Math.floor(x / 12) === Math.floor(y / 12) ? 0 : Math.abs(Math.floor(x / 12) - Math.floor(y / 12)) * 12;
  return Math.abs(x - y);
}

const range = (s: string | null, e: string | null) => `${s ?? "?"} – ${e ?? "?"}`;

/** Compare the CV with the candidate's profile export: name, every role, every school. */
export function compareProfiles(cv: CvParse, other: OtherProfile): ConsistencyItem[] {
  const out: ConsistencyItem[] = [];
  if (other.name || cv.contact.name) {
    const ok = plain(other.name) === plain(cv.contact.name);
    out.push({
      kind: "name", status: ok ? "match" : "mismatch", label: "Name", cv: cv.contact.name, other: other.name,
      why: ok ? "Same name on both." : "Use one legal name everywhere. Remote employers verify identity, and two spellings look like two people.",
    });
  }
  const used = new Set<number>();
  for (const r of cv.roles) {
    const i = other.roles.findIndex((o, k) => !used.has(k) && sameEmployer(o.employer, r.employer) && (sameTitle(o.title, r.title) || dateGap(o.start, r.start, false) === 0));
    const j = i >= 0 ? i : other.roles.findIndex((o, k) => !used.has(k) && sameEmployer(o.employer, r.employer));
    const label = `${r.title}${r.employer ? ` at ${r.employer}` : ""}`;
    if (j < 0) {
      out.push({ kind: "role", status: "only_cv", label, cv: range(r.start, r.end), other: null, why: "This job is on your CV but not on your profile. Recruiters check both; add it to your profile, or explain the gap if it's deliberate." });
      continue;
    }
    used.add(j);
    const o = other.roles[j];
    const problems: string[] = [];
    if (!sameTitle(o.title, r.title)) problems.push(`title "${o.title}"`);
    const gs = dateGap(r.start, o.start, false), ge = dateGap(r.end, o.end, true);
    if (gs != null && gs > 1) problems.push(`start ${o.start ?? "?"}`);
    if (ge != null && ge > 1) problems.push(`end ${o.end ?? "?"}`);
    out.push(problems.length
      ? { kind: "role", status: "mismatch", label, cv: `${r.title} · ${range(r.start, r.end)}`, other: `${o.title} · ${range(o.start, o.end)}`, why: `Your profile has a different ${problems.join(", ")}. Make them match; background checks compare titles and dates.` }
      : { kind: "role", status: "match", label, cv: range(r.start, r.end), other: range(o.start, o.end), why: "Same title and dates." });
  }
  other.roles.forEach((o, k) => {
    if (!used.has(k)) out.push({ kind: "role", status: "only_other", label: `${o.title} at ${o.employer}`, cv: null, other: range(o.start, o.end), why: "On your profile but not your CV. That's usually fine (CVs leave out old or short roles), but be ready to talk about it." });
  });
  const eduText = cv.education.map((e) => plain(e.text)).join(" | ");
  for (const e of other.education) {
    const school = plain(e.school);
    const found = school && eduText.includes(school);
    const label = [e.degree, e.school].filter(Boolean).join(", ");
    if (!found) out.push({ kind: "education", status: "only_other", label, cv: null, other: label, why: "This school is on your profile but not on your CV." });
    else {
      const line = cv.education.find((x) => plain(x.text).includes(school))!.text;
      const degreeOk = !e.degree || DEG_WORDS(e.degree).every((w) => DEG_WORDS(line).includes(w));
      out.push(degreeOk
        ? { kind: "education", status: "match", label, cv: line, other: label, why: "Same school and degree." }
        : { kind: "education", status: "mismatch", label, cv: line, other: label, why: "The degree differs. Degrees are verified; make both say exactly the same thing." });
    }
  }
  return out;
}

/** Degree level words in a line, normalised ("B.Sc." → bachelor). */
function DEG_WORDS(s: string): string[] {
  const t = s.toLowerCase();
  const out: string[] = [];
  if (/\b(ph\.?\s?d|doctor(ate)?)\b/.test(t)) out.push("phd");
  if (/\b(master'?s?|m\.?\s?sc|msc|mba|m\.?\s?a\b|m\.?\s?eng)\b/.test(t)) out.push("master");
  if (/\b(bachelor'?s?|b\.?\s?sc|bsc|b\.?\s?a\b|b\.?\s?eng|b\.?\s?tech|beng|btech)\b/.test(t)) out.push("bachelor");
  if (/\b(hnd|ond|diploma)\b/.test(t)) out.push("diploma");
  return out;
}

/**
 * The letter against the CV (DOC-13): the sign-off name must be the CV's name,
 * and every employer the letter names ("at Paystackish Ltd") must be in the CV
 * or be the employer you're applying to.
 */
export function letterConsistency(letter: string, cv: CvParse, company: string): Flag[] {
  const flags: Flag[] = [];
  const lines = letter.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  const last = lines.at(-1) ?? "";
  const name = cv.contact.name;
  if (name && /^[\p{Lu}][\p{L}'.-]+(\s[\p{Lu}][\p{L}'.-]+){1,4}$/u.test(last) && plain(last) !== plain(name) && !/^\[/.test(last))
    flags.push({ id: "signoff", severity: "block", title: `The letter is signed "${last}", but your CV says "${name}"`, why: "Use one name across every document. A mismatch can read as identity fraud.", quote: last });
  const employers = cv.roles.map((r) => r.employer).filter((x): x is string => !!x);
  // Per sentence, so "at University of Lagos. I'd…" stops at the full stop.
  const mentions = letter.split(/\n+/).flatMap((l) => sentences(l)).flatMap((s) => [...s.matchAll(/\bat ((?:[\p{Lu}][\p{L}\d&.'-]*)(?:\s(?:[\p{Lu}][\p{L}\d&.'-]*|&|of|and)){0,4})/gu)]);
  for (const m of mentions) {
    const named = m[1].replace(/[.,;:]+$/, "");
    if (sameEmployer(named, company) || employers.some((e) => sameEmployer(e, named))) continue;
    if (cv.education.some((e) => plain(e.text).includes(plain(named)))) continue; // "at University of Lagos"
    flags.push({ id: "employer", severity: "warn", title: `${named} isn't an employer on your CV`, why: "If this is an employer, use exactly the name on your CV; employers verify work history. Ignore this if it's a place or a school.", quote: m[0] });
  }
  return flags;
}
