import { buildEligibility, verdictFor, type Eligibility, type Verdict } from "../lib/eligibility";
import { categorize, cleanTitle, employmentTypeOf, engagementOf, languageOf, seniorityOf } from "../lib/normalize";
import { cleanHtml, htmlToText } from "../lib/text";
import { extractRequirements, type Requirements } from "../lib/requirements";
import { trustLabels, type TrustLabel } from "../lib/trust";
import { isEmployerSource, sourceById } from "../sources";
import type { RawPosting } from "../sources/types";

export const DEFAULT_VIEWER = {
  country: process.env.DEFAULT_COUNTRY || "NG",
  timezone: process.env.DEFAULT_TIMEZONE || "Africa/Lagos",
  shiftHours: Number(process.env.DEFAULT_SHIFT_HOURS || 0),
};

export type Derived = {
  title: string;
  company: string;
  companyDomain: string | null;
  category: string;
  seniority: string | null;
  employmentType: string | null;
  engagement: string;
  language: string;
  descriptionHtml: string;
  descriptionText: string;
  locationText: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  eligibility: Eligibility;
  verdict: Verdict;
  trust: TrustLabel[];
  requirements: Requirements;
};

/** Everything the job card needs, computed from one source posting. */
export function derive(p: RawPosting): Derived {
  const descriptionText = htmlToText(p.descriptionHtml);
  const title = cleanTitle(p.title) || p.title;
  const employmentType = employmentTypeOf(p.employmentType);
  const eligibility = buildEligibility({
    fieldCountries: p.fieldCountries,
    fieldRegions: p.fieldRegions,
    fieldWorldwide: p.fieldWorldwide,
    fieldTzOffsetsHours: p.fieldTzOffsetsHours,
    fieldEvidence: p.fieldEvidence,
    label: p.locationText ?? null,
    description: `${descriptionText}`,
  });
  const src = sourceById(p.sourceId);
  return {
    title,
    company: p.company.trim(),
    companyDomain: p.companyDomain ?? null,
    category: categorize(title, p.categoryHints ?? []),
    seniority: seniorityOf(title, p.seniorityHints ?? []),
    employmentType,
    engagement: engagementOf(employmentType, descriptionText),
    language: languageOf(descriptionText),
    descriptionHtml: cleanHtml(p.descriptionHtml),
    descriptionText,
    locationText: p.locationText ?? null,
    salaryMin: p.salary?.min ?? null,
    salaryMax: p.salary?.max ?? null,
    salaryCurrency: p.salary?.currency ?? null,
    salaryPeriod: p.salary?.period ?? null,
    eligibility,
    verdict: verdictFor(eligibility, DEFAULT_VIEWER),
    requirements: extractRequirements(title, descriptionText),
    trust: trustLabels({
      text: descriptionText,
      isEmployerAts: isEmployerSource(p.sourceId),
      atsName: src?.atsName ?? null,
      hasSalary: p.salary != null,
    }),
  };
}

/** Columns written to `jobs` from a derived posting. */
export function jobColumns(d: Derived) {
  return {
    title: d.title,
    company: d.company,
    companyDomain: d.companyDomain,
    category: d.category,
    seniority: d.seniority,
    employmentType: d.employmentType,
    engagement: d.engagement,
    descriptionHtml: d.descriptionHtml,
    descriptionText: d.descriptionText,
    locationText: d.locationText,
    salaryMin: d.salaryMin,
    salaryMax: d.salaryMax,
    salaryCurrency: d.salaryCurrency,
    salaryPeriod: d.salaryPeriod,
    eligibility: d.eligibility,
    trust: d.trust,
    requirements: d.requirements,
    verdict: d.verdict.verdict,
    verdictReason: d.verdict.reason,
    verdictQuote: d.verdict.quote,
    verdictNote: d.verdict.note,
    overlap: d.verdict.overlap,
  };
}

const SCOPE_RANK = { restricted: 2, worldwide: 1, unknown: 0 } as const;
/** "Most restrictive statement wins" across a cluster's postings (ELIG-02). */
export const moreRestrictive = (a: Eligibility, b: Eligibility) => SCOPE_RANK[a.scope] > SCOPE_RANK[b.scope] || a.blockers.length > b.blockers.length;
