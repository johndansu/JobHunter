import { sentences } from "./text";

// Employers' own anti-fraud warnings ("We will never ask for payment or crypto") must not trip scam rules.
const DISCLAIMER_RE =
  /\b(never|will not|won't|do not|don't|does not|doesn't|would not|no legitimate|beware|fraud\w*|scam\w*|phishing|impersonat\w*|be aware|be cautious|be wary|report (it|this|any))\b/i;

/** First sentence matching `re` that isn't a disclaimer. */
function firstHit(text: string, re: RegExp): string | null {
  for (const s of sentences(text)) if (re.test(s) && !DISCLAIMER_RE.test(s)) return s.length > 240 ? s.slice(0, 239) + "…" : s;
  return null;
}

/**
 * Trust labels (TRUST-01…06, REC-05…07). Facts only; never "ghost" or "fake".
 * "Possible scam" only on hard triggers, always with the quoted evidence.
 * Age, liveness and "also on" are computed at render time from dates and postings.
 */
export type TrustLabel =
  | { kind: "employer_ats"; text: string }
  | { kind: "salary_listed"; text: string }
  | { kind: "possible_scam"; text: string; quote: string }
  | { kind: "use_caution"; text: string; quote: string }
  | { kind: "employer_says"; text: string; quote: string }
  | { kind: "thin_description"; text: string };

const HARD: [RegExp, string][] = [
  [/\b(pay|paying|payment of|purchase|buy)\s+(?:an?\s+)?(registration|training|application|processing|starter|onboarding|equipment|visa|certification)\s+(fee|kit|package)s?\b|\bupfront (fee|payment|deposit)\b|\byou (must|will need to|are required to) (pay|purchase|buy)\b/i, "Asks you to pay"],
  // The applicant pays in crypto (not a crypto company describing its product).
  [/\b(you|your|applicants?|candidates?)\b[^.\n]{0,60}\b(deposit|pay|send|transfer|top[- ]?up|fund)\b[^.\n]{0,40}\b(usdt|bitcoin|btc|crypto(currency)?|ethereum|tether)\b|\b(deposit|top[- ]?up)\b[^.\n]{0,30}\b(usdt|bitcoin|btc|crypto(currency)?|tether)\b[^.\n]{0,50}\b(to (start|activate|unlock|begin|receive|withdraw|qualify))\b/i, "Asks you to pay in crypto"],
  [/\b(deposit|cash)\b[^.\n]{0,30}\b(cheque|check)\b[^.\n]{0,60}\b(send|forward|wire|purchase|buy)\b/i, "Deposit a cheque and forward money"],
  [/\b(re-?ship(ping)?|package forwarding|receive and (forward|re-?ship) (packages|parcels))\b/i, "Reshipping packages"],
  [/\b(product boosting|order (optimi[sz]ation|grabbing)|app optimi[sz]ation tasks?|data optimi[sz]ation tasks?|(rate|review) (products|apps|hotels) (and|to) earn|complete (sets of )?tasks to (unlock|earn|withdraw))\b/i, "Task scam pattern"],
  [/\b(interview|contact|message|text|reach|chat)\b[^.\n]{0,40}\b(on|via|through|over|using)\s+(telegram|whatsapp|signal|wechat)\b/i, "Hiring through a messaging app"],
  [/\b(payment processing (agent|representative)|money transfer (agent|duties)|process (payments|funds|transactions) (for|through) (your|personal)|receive (funds|payments|money) (into|in|through) your (personal )?(bank )?account)\b/i, "Moves money through your account"],
  [/\b(send|provide|submit|share)\b[^.\n]{0,30}\b(copy of (your )?(passport|national id|id card|driver'?s licen[cs]e)|bank (account )?details|ssn|social security number|\bbvn\b|\bnin\b)\b[^.\n]{0,40}\b(before|to (apply|be considered|proceed|secure))\b/i, "Asks for ID or bank details before an offer"],
];

const SOFT: [RegExp, string][] = [
  [/[a-z0-9._%+-]+@(gmail|yahoo|hotmail|outlook|aol|protonmail|proton|icloud|yandex|mail)\.(com|me|ru)\b/i, "Contact uses a free email address"],
  [/(\$|usd|£|€)\s?\d{3,5}\s*(per|\/|a)\s*(day|week)\b[^.\n]{0,80}\b(no experience|entry level|data entry|from home)\b|\b(no experience|data entry)\b[^.\n]{0,80}(\$|usd|£|€)\s?\d{3,5}\s*(per|\/|a)\s*(day|week)\b/i, "Pay looks too good for no-experience work"],
  [/\b(apply (immediately|asap|urgently)|limited (spots|slots)|immediate start|start today|hiring urgently)\b/i, "Urgency pressure"],
];

const DECLARATIONS: RegExp =
  /\b(talent (pool|community|pipeline|network)|general application|evergreen|future (openings?|opportunit\w+|roles?)|not (a )?current(ly)? (open|vacanc\w*)|no current vacanc\w*|pipeline (role|requisition|position)|no sooner than)\b/i;

export function trustLabels(input: {
  text: string;
  isEmployerAts: boolean;
  atsName?: string | null;
  hasSalary: boolean;
}): TrustLabel[] {
  const out: TrustLabel[] = [];
  const { text } = input;
  if (input.isEmployerAts) out.push({ kind: "employer_ats", text: `Posted on the employer's own ${input.atsName ?? "hiring"} board` });
  if (input.hasSalary) out.push({ kind: "salary_listed", text: "Salary listed" });
  for (const [re, label] of HARD) {
    const q = firstHit(text, re);
    if (q) out.push({ kind: "possible_scam", text: `Possible scam: ${label.toLowerCase()}`, quote: q });
  }
  if (!out.some((l) => l.kind === "possible_scam"))
    for (const [re, label] of SOFT) {
      const q = firstHit(text, re);
      if (q) out.push({ kind: "use_caution", text: `Use caution: ${label.toLowerCase()}`, quote: q });
    }
  const d = firstHit(text, DECLARATIONS);
  if (d) out.push({ kind: "employer_says", text: `Employer says: ${(d.match(DECLARATIONS)?.[0] ?? "").toLowerCase()}`, quote: d });
  if (text.length < 400) out.push({ kind: "thin_description", text: "Very short description" });
  return out;
}
