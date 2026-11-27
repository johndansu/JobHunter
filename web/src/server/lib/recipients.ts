import { domainOf, domainRelation } from "./preflight";
import { sentences } from "./text";

/**
 * Recipient rules (MAIL-09, MAIL-19, TRUST-08). Applications go only to an
 * address the employer itself publishes for applications: the posting's address,
 * or for a speculative application, a careers/jobs address on the company's own
 * site. Guessed, scraped, free-mail and look-alike addresses are stopped.
 */

export type RecipientIssue = {
  id: string;
  /** block: can't send. override: can send only after you confirm. warn: shown, doesn't stop you. */
  severity: "block" | "override" | "warn";
  title: string;
  why: string;
};

export const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

/** Job boards, aggregators and social sites: an address found only there isn't "published by the company". */
const THIRD_PARTY = /(^|\.)(linkedin\.com|indeed\.\w+|glassdoor\.\w+|himalayas\.app|remoteok\.com|remotive\.com|jobicy\.com|remotejobs\.org|weworkremotely\.com|wellfound\.com|angel\.co|ziprecruiter\.com|monster\.\w+|jobberman\.com|myjobmag\.com|hotnigerianjobs\.com|facebook\.com|x\.com|twitter\.com|instagram\.com|tiktok\.com|crunchbase\.com|rocketreach\.co|apollo\.io|hunter\.io|zoominfo\.com|github\.com|medium\.com|substack\.com)$/i;

const NO_UNSOLICITED = /\b(do not|don't|does not|doesn't|will not|won't|cannot|can't|we no longer)\b[^.]{0,40}\b(accept|consider|review|respond to|process)\b[^.]{0,30}\b(unsolicited|speculative|open|spontaneous)\b|\bno (unsolicited|speculative|spontaneous) (applications|cvs|resumes|résumés)\b/i;
const NOT_BY_EMAIL = /\b(do not|don't|please don't|please do not)\b[^.]{0,40}\b(email|send|apply)\b/i;

export function checkRecipient(o: {
  email: string;
  kind: "application" | "speculative" | "follow_up";
  /** Text where the address must appear: the posting (application) or the company page (speculative). */
  sourceText: string | null;
  sourceUrl: string | null;
  company: string;
  companyDomain: string | null;
  alreadySent: boolean;
}): RecipientIssue[] {
  const out: RecipientIssue[] = [];
  const email = o.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return [{ id: "syntax", severity: "block", title: "That isn't a valid email address", why: "Check for typos." }];
  if (o.kind === "follow_up") return out; // goes to the address already used for this application

  const src = o.sourceText ?? "";
  const quote = sentences(src).find((s) => s.toLowerCase().includes(email));
  if (!quote) {
    out.push(o.kind === "speculative"
      ? { id: "not_published", severity: "block", title: "That address isn't on the page you gave", why: "Speculative applications may only go to an address the company publishes on its own site for jobs or CVs. Guessed addresses (like firstname@company.com) are never allowed." }
      : { id: "not_published", severity: "block", title: "That address isn't in the job posting", why: "Applications go only to the address the employer gives for applying. Guessed or scraped addresses are never allowed." });
  } else if (NOT_BY_EMAIL.test(quote) && /\b(application|apply|cv|resume)\b/i.test(quote)) {
    out.push({ id: "not_by_email", severity: "block", title: "The posting says not to apply by email", why: `It says: "${quote.slice(0, 160)}". Use the employer's form instead.` });
  }

  if (o.kind === "speculative") {
    const host = o.sourceUrl ? domainOf(o.sourceUrl) : null;
    if (!host) out.push({ id: "no_source", severity: "block", title: "Add the page where the company publishes this address", why: "It must be the company's own website, so we can show where the address came from." });
    else if (THIRD_PARTY.test(host)) out.push({ id: "third_party", severity: "block", title: `${host} isn't the company's own site`, why: "Addresses found only on job boards, social media or contact-finder sites don't count. Find the careers address on the company's own website." });
    else {
      const emailDomain = email.split("@")[1];
      const pageRel = domainRelation(host, emailDomain, o.company);
      const knownRel = o.companyDomain ? domainRelation(host, o.companyDomain, o.company) : null;
      if (pageRel !== "same" && knownRel !== "same" && !host.endsWith(emailDomain) && !emailDomain.endsWith(host.replace(/^www\./, "")))
        out.push({ id: "site_mismatch", severity: "override", title: `The page (${host}) and the address (${emailDomain}) are on different domains`, why: "The address should be on the company's own site and domain. Confirm the page really is the company's." });
    }
    if (NO_UNSOLICITED.test(src)) out.push({ id: "no_unsolicited", severity: "block", title: "The company says it doesn't accept unsolicited applications", why: "Respect it: watch their careers page for openings instead." });
  }

  const d = email.split("@")[1];
  const rel = domainRelation(d, o.companyDomain, o.company);
  if (rel === "freemail") out.push({ id: "freemail", severity: "override", title: `${d} is a free email service`, why: "Employers normally use their own domain. A free address is a common scam sign; send only if you've confirmed it's genuine." });
  else if (rel === "lookalike") out.push({ id: "lookalike", severity: "override", title: `${d} looks like ${o.company}'s domain but may not be`, why: "Scammers register look-alike domains. Check the address on the company's own website." });
  else if (rel === "other") out.push({ id: "other_domain", severity: "warn", title: `${d} isn't ${o.company}'s usual domain`, why: "It may be a recruiting agency or a parent company. Make sure the posting really asks you to use it." });

  if (o.alreadySent) out.push({ id: "duplicate", severity: "block", title: "You've already sent this application to that address", why: "Use a follow-up instead of sending it again." });
  return out;
}

/** Recipient problems that still stop sending, given the issues you've confirmed. */
export const unresolved = (issues: RecipientIssue[], overrides: string[]) =>
  issues.filter((i) => i.severity === "block" || (i.severity === "override" && !overrides.includes(i.id)));
