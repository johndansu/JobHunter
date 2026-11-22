import {
  COMMONLY_UNSUPPORTED,
  REGIONS,
  SANCTIONED_COMPREHENSIVE,
  countryName,
  expandRegions,
  findCountries,
  findRegions,
  toCountryCode,
} from "./geo";
import { sentences } from "./text";
import { overlapRange, standardOffsetMinutes, zoneFromWords } from "./timezone";

/**
 * Remote-job eligibility (decisions ELIG-01…13).
 * Evidence order: description text > structured source fields > board labels.
 * An empty location is "unknown", never worldwide. Every verdict carries a quote.
 */

export type TzConstraint =
  | { kind: "band"; anchor: string; plusMinusHours: number; quote: string }
  | { kind: "overlap"; anchor: string; hours: number; quote: string }
  | { kind: "offsets"; offsetsMinutes: number[]; quote: string };

export type Blocker = {
  kind: "citizenship" | "clearance" | "export" | "authorization";
  country: string;
  quote: string;
};

export type Eligibility = {
  scope: "worldwide" | "restricted" | "unknown";
  countries: string[];
  regions: string[];
  excluded: string[];
  timezone: TzConstraint | null;
  blockers: Blocker[];
  evidence: { from: "field" | "label" | "description"; quote: string }[];
};

export type EligibilityInput = {
  fieldCountries?: (string | null | undefined)[];
  fieldRegions?: string[];
  fieldWorldwide?: boolean;
  fieldTzOffsetsHours?: number[];
  fieldEvidence?: string; // human-readable summary of the structured field
  label?: string | null;
  description: string;
};

const WORLDWIDE_RE =
  /\b(worldwide|anywhere in the world|work from anywhere|from anywhere|anywhere|global(ly)?( remote)?|location[- ]independent|any (country|location)|all countries)\b/i;
const RESTRICT_RE =
  /\b(only|must (be|live|reside|work|be located)|reside|resides|resident|residents|residing|residence|located in|location\s*:|based (in|out of)|living in|live in|authori[sz](ed|ation) to work|eligible to work|right to work|work permit|citizens?|citizenship|(hire|hiring|employ|employing|recruit|recruiting) (in|from|across)|open to (candidates|applicants|residents|people|anyone|talent)|available (to|in)|time ?zones?|overlap)\b|-based\b/i;
// "US and internationally based", "as well as globally": the named places are inclusive, not limits.
const INCLUSIVE_RE = /\b(and|or|as well as|including|plus)\s+(international(ly)?|global(ly)?|worldwide|anywhere|other countries)\b|\binternationally based\b/i;
const CANDIDATE_CTX =
  /\b(you|your|candidates?|applicants?|must|should|need to|required?|requires|eligib\w*|open to|this (role|position|job|opportunity)|(role|position) is|we (can|only|are able to|currently) (hire|employ)|hiring (in|from)|residents?|reside|only)\b/i;
const COMPANY_CTX =
  /\b(headquarter\w*|hq\b|our (office|offices|team|teams|company|customers|clients|users)|we have (offices|teams|customers)|founded|offices in|customers in|clients in|serving|across \d+ countries|operat(e|es|ing) in)\b/i;
const LABEL_LINE_RE = /^\s*(location|locations|where|country|countries|region|based in|remote)\s*[:\-–(]/i;
const ONLY_INSIDE_RE = /\b(cannot|can't|can not|unable to|not able to|do not|don't|won't)\s+(hire|employ|consider|accept|sponsor)\b[^.]{0,60}\boutside\b/i;
const EXCLUDE_RE =
  /\b(excluding|except( for)?|with the exception of|not (available|open|eligible)( to| in| for)? (candidates |applicants |residents )?(in|from|of)?|cannot (hire|employ|accept) (candidates |applicants |people )?(in|from)|unable to (hire|employ) (in|from)|no applicants from)\b/i;
const NEGATION_RE = /\b(not|cannot|can't|unable|isn't|aren't|won't|never)\b/i;

const BLOCKERS: { kind: Blocker["kind"]; re: RegExp; country?: string }[] = [
  {
    kind: "citizenship",
    re: /\b(?:must be|requires?|required to be|only|be)\s+(?:an?\s+)?(U\.?S\.?|United States|American|Canadian|British|UK|Australian)\s+citizens?(?:hip)?\b|\b(U\.?S\.?|United States|Canadian|UK)\s+citizenship\s+(?:is\s+)?(?:required|needed|mandatory)\b/i,
  },
  { kind: "clearance", re: /\b(?:active\s+)?(?:secret|top secret|ts\/sci|public trust|security)\s+clearance\b/i, country: "US" },
  { kind: "clearance", re: /\b(?:SC|DV|BPSS|NPPV)\s+clearance\b/, country: "GB" },
  {
    kind: "export",
    // A requirement, not a skill ("working knowledge of ITAR" is not a restriction).
    re: /\b(must be an? U\.?S\.? person|(subject to|due to|because of|requires?|comply with)\s+(ITAR|EAR|U\.?S\.? export control\w*|export control\w*)|export[- ]controlled (role|position|information|data|technology))\b/i,
    country: "US",
  },
  {
    kind: "authorization",
    re: /\b(?:authori[sz]ed|eligible|legally (?:able|permitted|authori[sz]ed)|permitted|right)\s+to\s+work\s+in\s+(?:the\s+)?([^.,;()\n]{2,40})|\bwork authori[sz]ation\s+(?:in|for)\s+(?:the\s+)?([^.,;()\n]{2,40})/i,
  },
];

const CITIZEN_COUNTRY: Record<string, string> = {
  us: "US", "u.s": "US", "u.s.": "US", "united states": "US", american: "US",
  canadian: "CA", british: "GB", uk: "GB", australian: "AU",
};

function parseTimezone(text: string): TzConstraint | null {
  for (const s of sentences(text)) {
    const band = s.match(
      /\b(UTC|GMT|CET|CEST|EST|EDT|ET|PST|PDT|PT|CST|CDT|MST|BST|IST|EAT|WAT|SAST|AEST|SGT|BRT)\s*\(?\s*(?:\+\/-|±|\+-|\+\/−|\+\/–|plus or minus|plus\/minus)\s*(\d{1,2})\s*(?:h\b|hours?|hrs?)/i,
    );
    if (band) {
      const anchor = zoneFromWords(band[1]);
      if (anchor) return { kind: "band", anchor, plusMinusHours: Number(band[2]), quote: s };
    }
    const range = s.match(/\b(?:UTC|GMT)\s*([+\-−–]\s*\d{1,2})(?::\d{2})?\s*(?:to|-|–|—|and|through)\s*(?:UTC|GMT)?\s*([+\-−–]\s*\d{1,2})\b/i);
    if (range) {
      const a = Number(range[1].replace(/[−–\s]/g, (c) => (c.trim() ? "-" : "")));
      const b = Number(range[2].replace(/[−–\s]/g, (c) => (c.trim() ? "-" : "")));
      if (Number.isFinite(a) && Number.isFinite(b)) {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        const offs: number[] = [];
        for (let h = lo; h <= hi; h++) offs.push(h * 60);
        return { kind: "offsets", offsetsMinutes: offs, quote: s };
      }
    }
    const ov1 = s.match(/\b(\d{1,2})\+?\s*(?:-\s*\d{1,2}\s*)?(?:hours?|hrs?)\s+(?:of\s+)?(?:daily\s+|working\s+)?overlap(?:ping)?(?:\s+with)?\s+([^;\n]{2,50})/i);
    const ov2 = s.match(/\boverlap\w*\s+(?:with\s+)?([^;\n]{2,50}?)\s+(?:for\s+)?(?:at least\s+|a minimum of\s+)?(\d{1,2})\s*(?:hours?|hrs?)\b/i);
    const hours = ov1 ? Number(ov1[1]) : ov2 ? Number(ov2[2]) : null;
    const where = ov1 ? ov1[2] : ov2 ? ov2[1] : null;
    if (hours && where) {
      const anchor = zoneFromWords(where);
      if (anchor && hours > 0 && hours <= 12) return { kind: "overlap", anchor, hours, quote: s };
    }
  }
  return null;
}

function parseBlockers(text: string): Blocker[] {
  const out: Blocker[] = [];
  for (const s of sentences(text)) {
    for (const b of BLOCKERS) {
      const m = s.match(b.re);
      if (!m) continue;
      let country = b.country ?? null;
      if (b.kind === "citizenship") {
        const word = (m[1] ?? m[2] ?? "").toLowerCase().replace(/\.$/, "");
        country = CITIZEN_COUNTRY[word] ?? CITIZEN_COUNTRY[word.replace(/\./g, "")] ?? "US";
      }
      if (b.kind === "authorization") {
        if (/\bsponsor(ship)? (is )?(available|offered|provided)|\bwe (will|can|do) sponsor\b/i.test(s)) continue;
        const target = (m[1] ?? m[2] ?? "").trim();
        const found = findCountries(target);
        country = found[0] ?? toCountryCode(target);
        if (!country) continue;
      }
      if (country && !out.some((x) => x.kind === b.kind && x.country === country)) {
        out.push({ kind: b.kind, country, quote: s.length > 240 ? s.slice(0, 239) + "…" : s });
      }
    }
  }
  return out;
}

type Parsed = { countries: Set<string>; regions: Set<string>; excluded: Set<string>; worldwide: boolean; quotes: string[] };

function parseDescription(text: string): Parsed {
  const r: Parsed = { countries: new Set(), regions: new Set(), excluded: new Set(), worldwide: false, quotes: [] };
  const all = sentences(text);
  for (const s of all) {
    const countries = findCountries(s);
    const regions = findRegions(s);
    const hasPlace = countries.length > 0 || regions.length > 0;
    const isLabelLine = LABEL_LINE_RE.test(s);
    const looksRestrictive = isLabelLine || (RESTRICT_RE.test(s) && CANDIDATE_CTX.test(s) && !COMPANY_CTX.test(s));
    if (!hasPlace) {
      if (looksRestrictive && WORLDWIDE_RE.test(s) && !NEGATION_RE.test(s)) {
        r.worldwide = true;
        r.quotes.push(s);
      }
      continue;
    }
    if (!looksRestrictive) continue;
    if (INCLUSIVE_RE.test(s) && !NEGATION_RE.test(s)) {
      r.worldwide = true;
      r.quotes.push(s);
      continue;
    }
    // Overlap sentences are time-zone constraints (parsed separately), not residency rules.
    if (/\boverlap/i.test(s) && !/\b(reside|resident|based|located|live)\b/i.test(s)) continue;
    if (EXCLUDE_RE.test(s)) {
      // "EMEA, excluding France": places before the keyword are allowed, after are excluded.
      const idx = s.search(EXCLUDE_RE);
      const before = s.slice(0, idx);
      const after = s.slice(idx);
      findCountries(after).forEach((c) => r.excluded.add(c));
      findCountries(before).forEach((c) => r.countries.add(c));
      findRegions(before).forEach((g) => r.regions.add(g));
      r.quotes.push(s);
      continue;
    }
    if (NEGATION_RE.test(s) && !ONLY_INSIDE_RE.test(s)) continue; // ambiguous negation: don't guess
    countries.forEach((c) => r.countries.add(c));
    regions.forEach((g) => r.regions.add(g));
    r.quotes.push(s);
  }
  return r;
}

function parseLabel(label: string): Parsed {
  const r: Parsed = { countries: new Set(), regions: new Set(), excluded: new Set(), worldwide: false, quotes: [] };
  const countries = findCountries(label);
  const regions = findRegions(label);
  countries.forEach((c) => r.countries.add(c));
  regions.forEach((g) => r.regions.add(g));
  if (!countries.length && !regions.length && WORLDWIDE_RE.test(label)) r.worldwide = true;
  if (r.worldwide || countries.length || regions.length) r.quotes.push(label);
  return r;
}

export function buildEligibility(input: EligibilityInput): Eligibility {
  const desc = parseDescription(input.description);
  const label = input.label ? parseLabel(input.label) : null;
  const fieldCountries = new Set(
    (input.fieldCountries ?? []).map((c) => toCountryCode(c ?? "")).filter((c): c is string => !!c),
  );
  const fieldRegions = new Set(input.fieldRegions ?? []);
  const blockers = parseBlockers(input.description);
  let timezone = parseTimezone(input.description) ?? (input.label ? parseTimezone(input.label) : null);

  const e: Eligibility = { scope: "unknown", countries: [], regions: [], excluded: [...desc.excluded], timezone: null, blockers, evidence: [] };

  if (desc.countries.size || desc.regions.size) {
    e.scope = "restricted";
    e.countries = [...desc.countries];
    e.regions = [...desc.regions];
    desc.quotes.slice(0, 3).forEach((q) => e.evidence.push({ from: "description", quote: q }));
  } else if (desc.worldwide) {
    // The description explicitly opens the role ("US and internationally based"), overriding labels and fields.
    e.scope = "worldwide";
    e.evidence.push({ from: "description", quote: desc.quotes[0] });
  } else if (fieldCountries.size || fieldRegions.size) {
    e.scope = "restricted";
    e.countries = [...fieldCountries];
    e.regions = [...fieldRegions];
    e.evidence.push({ from: "field", quote: input.fieldEvidence ?? summarize(e.countries, e.regions) });
  } else if (label && (label.countries.size || label.regions.size)) {
    e.scope = "restricted";
    e.countries = [...label.countries];
    e.regions = [...label.regions];
    e.evidence.push({ from: "label", quote: label.quotes[0] });
  } else if (input.fieldWorldwide || label?.worldwide || desc.worldwide) {
    e.scope = "worldwide";
    if (desc.worldwide) e.evidence.push({ from: "description", quote: desc.quotes[0] });
    else if (label?.worldwide) e.evidence.push({ from: "label", quote: label.quotes[0] });
    else e.evidence.push({ from: "field", quote: input.fieldEvidence ?? "No location restriction listed by the source" });
  }

  // Himalayas-style offset lists only matter when no country restriction decides it.
  if (!timezone && e.scope === "worldwide" && input.fieldTzOffsetsHours?.length) {
    let offs = input.fieldTzOffsetsHours.filter((h) => Number.isFinite(h));
    if (!offs.includes(12)) offs = offs.filter((h) => h < 13); // drop spurious +13/+14
    if (offs.length && offs.length < 24) {
      timezone = { kind: "offsets", offsetsMinutes: offs.map((h) => Math.round(h * 60)), quote: `Time zones allowed (UTC offsets): ${offs.map(fmtOffsetH).join(", ")}` };
    }
  }
  e.timezone = timezone;
  return e;
}

function summarize(countries: string[], regions: string[]): string {
  const parts = [...regions.map((r) => REGIONS[r]?.label ?? r), ...countries.slice(0, 8).map(countryName)];
  const more = countries.length > 8 ? ` and ${countries.length - 8} more` : "";
  return `Open to: ${parts.join(", ")}${more}`;
}

const fmtOffsetH = (h: number) => `UTC${h >= 0 ? "+" : "−"}${Math.abs(h)}`;
const fmtOffsetMin = (m: number) => fmtOffsetH(m / 60);

export type VerdictKind = "eligible" | "region_match" | "unclear" | "not_eligible";
export type Verdict = {
  verdict: VerdictKind;
  reason: string;
  quote: string | null;
  overlap: { min: number; max: number; anchor: string } | null;
  note: string | null;
};

const ZONE_LABEL: Record<string, string> = {
  "America/New_York": "US Eastern", "America/Chicago": "US Central", "America/Denver": "US Mountain",
  "America/Los_Angeles": "US Pacific", "Europe/Berlin": "Central European", "Europe/London": "UK",
  UTC: "UTC", "Asia/Kolkata": "India", "Africa/Nairobi": "East Africa", "Africa/Lagos": "West Africa",
  "Africa/Johannesburg": "South Africa", "Australia/Sydney": "Sydney", "Asia/Singapore": "Singapore",
  "America/Sao_Paulo": "Brazil",
};
export const zoneLabel = (z: string) => ZONE_LABEL[z] ?? z;

export function verdictFor(
  e: Eligibility,
  viewer: { country: string; timezone: string; shiftHours?: number },
): Verdict {
  const c = viewer.country;
  const name = countryName(c);
  const firstQuote = e.evidence[0]?.quote ?? null;
  const note = COMMONLY_UNSUPPORTED.has(c) ? `Many hiring platforms don't support ${name}; check before applying.` : null;
  const no = (reason: string, quote: string | null = firstQuote): Verdict => ({ verdict: "not_eligible", reason, quote, overlap: null, note });

  if (SANCTIONED_COMPREHENSIVE.has(c)) return no(`Most employers can't hire in ${name} because of sanctions (not legal advice).`, null);

  for (const b of e.blockers) {
    if (b.country === c) continue;
    const where = countryName(b.country);
    const reason =
      b.kind === "citizenship" ? `Requires ${where} citizenship`
      : b.kind === "clearance" ? `Requires a ${where} security clearance`
      : b.kind === "export" ? `Export-controlled: limited to ${where} persons`
      : `Requires the right to work in ${where}`;
    return no(reason, b.quote);
  }
  if (e.excluded.includes(c)) return no(`Excludes ${name}`);

  let v: Verdict;
  if (e.scope === "restricted") {
    if (e.countries.includes(c)) v = { verdict: "eligible", reason: `Open to ${name}`, quote: firstQuote, overlap: null, note };
    else if (expandRegions(e.regions).has(c)) {
      const r = e.regions.find((g) => REGIONS[g]?.countries.includes(c))!;
      v = { verdict: "region_match", reason: `Open to ${REGIONS[r].label}, which includes ${name}. Check the employer can hire there.`, quote: firstQuote, overlap: null, note };
    } else return no(`Open only to ${summarize(e.countries, e.regions).replace(/^Open to: /, "")}`);
  } else if (e.scope === "worldwide") {
    v = { verdict: "eligible", reason: "Open worldwide", quote: firstQuote, overlap: null, note };
  } else {
    v = { verdict: "unclear", reason: "The posting doesn't say where applicants can live", quote: null, overlap: null, note };
  }

  const tz = e.timezone;
  if (tz) {
    const mine = standardOffsetMinutes(viewer.timezone);
    if (tz.kind === "band") {
      const anchor = standardOffsetMinutes(tz.anchor);
      if (Math.abs(mine - anchor) > tz.plusMinusHours * 60)
        return no(`Needs ${zoneLabel(tz.anchor)} time ±${tz.plusMinusHours} h; you're on ${fmtOffsetMin(mine)}`, tz.quote);
      v.overlap = { ...overlapRange(viewer.timezone, tz.anchor, viewer.shiftHours ?? 0), anchor: tz.anchor };
    } else if (tz.kind === "offsets") {
      if (!tz.offsetsMinutes.includes(mine)) return no(`Limited to time zones ${tz.offsetsMinutes.map(fmtOffsetMin).join(", ")}; you're on ${fmtOffsetMin(mine)}`, tz.quote);
    } else {
      const r = overlapRange(viewer.timezone, tz.anchor, viewer.shiftHours ?? 0);
      v.overlap = { ...r, anchor: tz.anchor };
      if (r.max < tz.hours) return no(`Needs ${tz.hours} h overlap with ${zoneLabel(tz.anchor)}; your workday gives ${fmtRange(r)}`, tz.quote);
      if (r.min < tz.hours) {
        v.note = `Overlap with ${zoneLabel(tz.anchor)} is ${fmtRange(r)} depending on the season; they want ${tz.hours} h.`;
        if (v.verdict === "eligible") v.verdict = "region_match";
      }
    }
  }
  return v;
}

const fmtRange = (r: { min: number; max: number }) => (r.min === r.max ? `${r.min} h` : `${r.min}–${r.max} h`);
