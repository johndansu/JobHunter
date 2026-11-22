/** Field cleanup shared by every source (REC-09, REC-11). */

export const CATEGORIES = [
  "Software & IT",
  "Data & AI",
  "Product",
  "Design",
  "Marketing",
  "Sales & Business Development",
  "Customer Support & Success",
  "Operations & Admin",
  "Virtual Assistance",
  "Finance & Accounting",
  "HR & Recruiting",
  "Legal & Compliance",
  "Writing, Content & Editing",
  "Translation & Localization",
  "Education & Tutoring",
  "Healthcare & Medical Admin",
  "Project Management",
  "QA & Testing",
  "DevOps & Infrastructure",
  "Security",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

// Checked in order against the title first, then source category hints.
const CATEGORY_RULES: [RegExp, Category][] = [
  [/\b(virtual assistant|executive assistant|personal assistant|\bva\b)/i, "Virtual Assistance"],
  [/\b(translat|locali[sz]|interpret(er|ing))/i, "Translation & Localization"],
  [/\b(security|secops|soc analyst|penetration|appsec|infosec|cyber)/i, "Security"],
  [/\b(qa|quality assurance|test(er|ing)? (engineer|analyst|automation)|sdet)\b/i, "QA & Testing"],
  [/\b(devops|sre|site reliability|platform engineer|infrastructure|cloud engineer|network engineer|sysadmin|system administrator)/i, "DevOps & Infrastructure"],
  [/\b(data (scien|analy|engineer)|machine learning|\bml\b|\bai\b|artificial intelligence|analytics|bi (analyst|developer)|llm|research scientist|statistic)/i, "Data & AI"],
  [/\b(product manager|product owner|head of product|vp,? product|product lead|product operations)/i, "Product"],
  [/\b(designer|design lead|ux|ui\b|user experience|visual design|graphic|illustrat|motion design|brand design)/i, "Design"],
  [/\b(customer (success|support|service|experience|care)|support (specialist|engineer|agent|representative)|help ?desk|technical support|account manager|client success|community manager)/i, "Customer Support & Success"],
  [/\b(sales|account executive|business development|\bbdr\b|\bsdr\b|partnerships?|revenue|closer|lead generation)/i, "Sales & Business Development"],
  [/\b(marketing|seo|growth|social media|demand gen|brand|communications|\bpr\b|public relations|campaign|lifecycle)/i, "Marketing"],
  [/\b(writer|copywrit|editor|content|journalis|proofread|technical writer|documentation)/i, "Writing, Content & Editing"],
  [/\b(accountant|accounting|finance|financial|bookkeep|payroll|controller|tax|audit|fp&a|treasury|billing)/i, "Finance & Accounting"],
  [/\b(recruit|talent acquisition|sourcer|\bhr\b|human resources|people (partner|operations|ops)|hrbp)/i, "HR & Recruiting"],
  [/\b(legal|counsel|attorney|lawyer|paralegal|compliance|regulatory|privacy officer)/i, "Legal & Compliance"],
  [/\b(teacher|tutor|instructor|curriculum|education|teaching|lecturer|coach)\b/i, "Education & Tutoring"],
  [/\b(nurse|medical|clinical|health|physician|therap|pharma|coding specialist|dental|care coordinator|psychiatr|psycholog)/i, "Healthcare & Medical Admin"],
  [/\b(project manager|program manager|scrum master|delivery manager|pmo)/i, "Project Management"],
  [/\b(operations|admin(istrative|istrator)?|office manager|data entry|coordinator|logistics|procurement|supply chain)/i, "Operations & Admin"],
  [/\b(engineer|developer|programmer|software|frontend|front-end|backend|back-end|full[- ]?stack|mobile|ios|android|web|architect|tech lead|cto)/i, "Software & IT"],
];

export function categorize(title: string, hints: string[] = []): Category {
  for (const [re, cat] of CATEGORY_RULES) if (re.test(title)) return cat;
  const h = hints.join(" ").replace(/-/g, " ");
  for (const [re, cat] of CATEGORY_RULES) if (re.test(h)) return cat;
  return "Other";
}

export function seniorityOf(title: string, hints: string[] = []): string | null {
  const t = `${title} ${hints.join(" ")}`.toLowerCase();
  if (/\b(intern|internship|trainee|apprentice)\b/.test(t)) return "Intern";
  if (/\b(chief|vp|vice president|head of|director)\b/.test(t)) return "Director+";
  if (/\b(principal|staff|distinguished)\b/.test(t)) return "Principal/Staff";
  if (/\b(lead|manager|management)\b/.test(t)) return "Lead/Manager";
  if (/\b(senior|sr\.?|iii|expert)\b/.test(t)) return "Senior";
  if (/\b(junior|jr\.?|entry[- ]level|graduate|associate)\b/.test(t)) return "Junior";
  if (/\b(mid[- ]level|intermediate|ii)\b/.test(t)) return "Mid";
  return null;
}

export function employmentTypeOf(raw: string | string[] | null | undefined): string | null {
  const s = (Array.isArray(raw) ? raw.join(" ") : (raw ?? "")).toLowerCase();
  if (!s) return null;
  if (/intern/.test(s)) return "Internship";
  if (/part[- _]?time/.test(s)) return "Part-time";
  if (/contract|freelance|contractor|temporary|temp\b/.test(s)) return "Contract";
  if (/full[- _]?time|permanent|fulltime/.test(s)) return "Full-time";
  return null;
}

/** employee | contractor | eor | unknown. EOR only from explicit wording (keywords misfire). */
export function engagementOf(employmentType: string | null, text: string): "employee" | "contractor" | "eor" | "unknown" {
  if (/\b(employer of record|\beor\b)\b/i.test(text) || /\b(hired|employed|engaged) (through|via) (deel|remote\.com|oyster|rippling|multiplier|papaya)/i.test(text)) return "eor";
  if (employmentType === "Contract" || /\b(independent contractor|contractor (role|position|agreement)|freelance (role|basis))\b/i.test(text)) return "contractor";
  if (employmentType === "Full-time" || employmentType === "Part-time") return "employee";
  return "unknown";
}

/** Rough language guess from stop-words; only English vs common European languages. */
export function languageOf(text: string): string {
  const sample = ` ${text.slice(0, 3000).toLowerCase()} `;
  const score = (words: string[]) => words.reduce((n, w) => n + (sample.split(` ${w} `).length - 1), 0);
  const scores: [string, number][] = [
    ["en", score(["the", "and", "you", "with", "for", "our", "will"])],
    ["de", score(["und", "die", "der", "mit", "für", "wir", "sie"])],
    ["fr", score(["et", "les", "des", "vous", "pour", "nous", "une"])],
    ["es", score(["y", "los", "las", "para", "con", "una", "nuestro"])],
    ["pt", score(["e", "os", "para", "com", "uma", "você", "nosso"])],
    ["nl", score(["en", "het", "van", "voor", "met", "wij", "jij"])],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  return scores[0][1] > 0 ? scores[0][0] : "en";
}

const EMOJI = /[\p{Extended_Pictographic}️]/gu;

/** Display title: strip emojis and noise like "(Remote)" while keeping meaning. */
export function cleanTitle(t: string): string {
  return t
    .replace(EMOJI, "")
    .replace(/\s*[([]\s*(100%\s*)?remote[^)\]]*[)\]]\s*/gi, " ")
    .replace(/^\s*remote\s*[-–:|]\s*/i, "")
    .replace(/\s*[-–|]\s*(100%\s*)?remote\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function normCompany(c: string): string {
  return c
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\b(inc|llc|ltd|limited|gmbh|corp|corporation|co|company|sa|s a|bv|b v|plc|ag|pty|srl|oy|ab|as)\b/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normTitle(t: string): string {
  return cleanTitle(t)
    .toLowerCase()
    .replace(/\b(remote|hybrid|full[- ]?time|part[- ]?time|contract|m\/f\/d|m\/w\/d|f\/m\/x|m\/f\/x)\b/g, " ")
    .replace(/\bsr\b\.?/g, "senior")
    .replace(/\bjr\b\.?/g, "junior")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export const matchKeyOf = (company: string, title: string) => `${normCompany(company)}|${normTitle(title)}`;

export function domainOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
