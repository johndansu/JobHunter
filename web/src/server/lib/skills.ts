import { sentences } from "./text";

/**
 * Curated skills dictionary for every job category (no-AI mode, D-16).
 * Each entry: canonical name + aliases. Matching is case-insensitive on word
 * boundaries; ambiguous short names (Go, R, C) only match in clear contexts.
 * ESCO/O*NET normalisation can replace this once the ESCO data licence is confirmed (PROF-07).
 */
type Entry = [name: string, ...aliases: string[]];

const DICT: Record<string, Entry[]> = {
  "Software & IT": [
    ["JavaScript", "JS"], ["TypeScript"], ["Python"], ["Java"], ["C#", "C sharp", ".NET", "dotnet", "ASP.NET"], ["C++", "cpp"],
    ["Go", "Golang"], ["Rust"], ["Ruby", "Ruby on Rails", "Rails"], ["PHP", "Laravel"], ["Kotlin"], ["Swift", "SwiftUI"],
    ["Scala"], ["Elixir"], ["React", "React.js", "ReactJS"], ["Next.js", "NextJS"], ["Vue", "Vue.js"], ["Angular"],
    ["Svelte"], ["Node.js", "NodeJS", "Node"], ["Express", "Express.js"], ["Django"], ["Flask"], ["FastAPI"],
    ["Spring", "Spring Boot"], ["HTML", "HTML5"], ["CSS", "CSS3", "Sass", "SCSS"], ["Tailwind", "Tailwind CSS"],
    ["GraphQL"], ["REST APIs", "REST API", "RESTful"], ["gRPC"], ["React Native"], ["Flutter", "Dart"],
    ["iOS development", "iOS"], ["Android development", "Android"], ["WordPress"], ["Shopify"], ["Webflow"],
    ["Git", "GitHub", "GitLab"], ["Microservices"], ["System design"], ["Unit testing", "Jest", "pytest", "JUnit"],
    ["Linux"], ["Bash", "shell scripting"], ["PowerShell"], ["Salesforce development", "Apex"], ["SAP"], ["ServiceNow"],
    ["Blockchain", "Solidity", "Web3", "smart contracts"],
  ],
  "Data & AI": [
    ["SQL", "MySQL", "SQL Server", "T-SQL"], ["PostgreSQL", "Postgres"], ["MongoDB"], ["Redis"], ["Elasticsearch"],
    ["Snowflake"], ["BigQuery"], ["Redshift"], ["Databricks"], ["Apache Spark", "Spark", "PySpark"], ["Kafka"],
    ["Airflow"], ["dbt"], ["ETL", "ELT", "data pipelines"], ["Data modeling", "data modelling"], ["Data analysis", "data analytics"],
    ["Data visualization", "data visualisation"], ["Tableau"], ["Power BI", "PowerBI"], ["Looker", "Looker Studio"],
    ["Excel", "Microsoft Excel", "advanced Excel", "spreadsheets"], ["Google Sheets"], ["Statistics", "statistical analysis"],
    ["A/B testing", "experimentation"], ["Machine learning", "ML"], ["Deep learning"], ["NLP", "natural language processing"],
    ["Computer vision"], ["LLMs", "large language models", "generative AI", "GenAI"], ["Prompt engineering"], ["PyTorch"],
    ["TensorFlow"], ["scikit-learn", "sklearn"], ["pandas"], ["NumPy"], ["R programming", "RStudio", "R language"],
    ["MATLAB"], ["SPSS"], ["Stata"], ["Data labeling", "data annotation", "AI training"],
  ],
  "DevOps & Infrastructure": [
    ["AWS", "Amazon Web Services"], ["Azure", "Microsoft Azure"], ["GCP", "Google Cloud", "Google Cloud Platform"],
    ["Docker"], ["Kubernetes", "K8s"], ["Terraform"], ["Ansible"], ["CI/CD", "continuous integration"], ["Jenkins"],
    ["GitHub Actions"], ["Prometheus"], ["Grafana"], ["Datadog"], ["Networking", "TCP/IP", "DNS"], ["Site reliability", "SRE"],
    ["Helm"], ["Serverless", "AWS Lambda"],
  ],
  Security: [
    ["Cybersecurity", "information security", "infosec"], ["SOC 2"], ["ISO 27001"], ["SIEM", "Splunk"], ["Penetration testing", "pentesting"],
    ["Vulnerability management"], ["IAM", "identity and access management"], ["GDPR"], ["Threat modeling"], ["Incident response"],
  ],
  Product: [
    ["Product management"], ["Roadmapping", "product roadmap"], ["User research"], ["Product discovery"], ["PRDs", "product requirements"],
    ["Product analytics", "Amplitude", "Mixpanel"], ["Go-to-market", "GTM"],
  ],
  Design: [
    ["Figma"], ["Sketch"], ["Adobe XD"], ["Photoshop", "Adobe Photoshop"], ["Illustrator", "Adobe Illustrator"], ["InDesign"],
    ["After Effects"], ["Premiere Pro", "video editing"], ["Canva"], ["UI design"], ["UX design", "user experience"],
    ["Wireframing", "prototyping"], ["Design systems"], ["Graphic design"], ["Motion design", "motion graphics"], ["Branding", "brand identity"],
    ["Usability testing"], ["Accessibility", "WCAG"],
  ],
  Marketing: [
    ["SEO", "search engine optimization"], ["SEM", "search engine marketing"], ["Google Ads", "AdWords", "PPC"],
    ["Meta Ads", "Facebook Ads", "Instagram Ads"], ["LinkedIn Ads"], ["TikTok Ads"], ["Google Analytics", "GA4"],
    ["Email marketing", "Mailchimp", "Klaviyo"], ["Marketing automation", "Marketo", "Pardot"], ["HubSpot"],
    ["Content marketing"], ["Social media marketing", "social media management"], ["Community management"],
    ["Influencer marketing"], ["Affiliate marketing"], ["Performance marketing", "growth marketing"], ["Demand generation", "demand gen"],
    ["Product marketing"], ["Brand marketing"], ["Public relations", "PR"], ["Market research"], ["Copywriting"],
    ["Conversion rate optimization", "CRO"], ["Event marketing", "events"],
  ],
  "Sales & Business Development": [
    ["B2B sales"], ["B2C sales"], ["SaaS sales"], ["Enterprise sales"], ["Inside sales"], ["Cold calling", "outbound calling"],
    ["Cold emailing", "outbound prospecting", "prospecting"], ["Lead generation", "lead gen"], ["Lead qualification"],
    ["Account management"], ["Key account management"], ["Business development"], ["Partnerships", "channel partnerships"],
    ["Negotiation"], ["Closing", "deal closing"], ["Pipeline management"], ["Salesforce", "SFDC"], ["CRM", "CRM software"],
    ["Pipedrive"], ["Outreach.io", "Salesloft", "Apollo.io"], ["Sales forecasting"], ["MEDDIC", "MEDDPICC"], ["Solution selling"],
    ["Customer acquisition"], ["Upselling", "cross-selling"], ["Quota attainment"],
  ],
  "Customer Support & Success": [
    ["Customer support", "customer service", "customer care"], ["Customer success"], ["Technical support", "tech support"],
    ["Zendesk"], ["Intercom"], ["Freshdesk"], ["Help Scout"], ["Gorgias"], ["Ticketing systems", "ticketing"],
    ["Live chat support", "chat support"], ["Phone support", "call center", "call centre"], ["Email support"],
    ["Onboarding", "customer onboarding"], ["Churn reduction", "retention"], ["NPS", "CSAT"], ["Escalation management"],
    ["Knowledge base", "help center articles"], ["Troubleshooting"], ["SLA management", "SLAs"],
  ],
  "Operations & Admin": [
    ["Operations management"], ["Process improvement", "process optimization"], ["Supply chain"], ["Logistics"], ["Procurement", "purchasing"],
    ["Inventory management"], ["Vendor management"], ["Data entry"], ["Administrative support", "office administration"],
    ["Scheduling"], ["Microsoft Office", "MS Office", "Microsoft 365"], ["Google Workspace", "G Suite"], ["Documentation", "SOPs"],
    ["Notion"], ["Airtable"], ["Zapier"], ["Order management"], ["Dispatching", "dispatch"],
  ],
  "Virtual Assistance": [
    ["Calendar management"], ["Email management", "inbox management"], ["Travel arrangements", "travel booking"],
    ["Executive support", "executive assistance"], ["Minute taking", "meeting notes"], ["Personal assistance"],
    ["Research", "online research"], ["Transcription"],
  ],
  "Finance & Accounting": [
    ["Accounting"], ["Bookkeeping"], ["QuickBooks"], ["Xero"], ["Sage"], ["NetSuite"], ["Accounts payable", "AP"],
    ["Accounts receivable", "AR"], ["Payroll"], ["Bank reconciliation", "reconciliation", "reconciliations"], ["Month-end close", "month end close"],
    ["Financial reporting"], ["Financial modeling", "financial modelling"], ["FP&A", "financial planning and analysis"],
    ["Budgeting", "forecasting"], ["IFRS"], ["GAAP", "US GAAP"], ["Tax preparation", "tax compliance", "taxation"], ["Auditing", "audit"],
    ["Treasury"], ["Invoicing", "billing"], ["Expense management"], ["ACCA"], ["ICAN"], ["CPA"], ["CFA"], ["Credit analysis"],
    ["Risk management"], ["Compliance (financial)", "AML", "KYC"],
  ],
  "HR & Recruiting": [
    ["Recruiting", "recruitment"], ["Technical recruiting", "tech recruiting"], ["Sourcing", "talent sourcing"], ["Talent acquisition"],
    ["Interviewing", "candidate screening"], ["Applicant tracking systems", "ATS", "Greenhouse", "Lever", "Workday"],
    ["Onboarding (HR)", "employee onboarding"], ["HR operations", "people operations"], ["HRIS", "BambooHR"], ["Employee relations"],
    ["Compensation and benefits", "compensation", "benefits administration"], ["Performance management"], ["Learning and development", "L&D", "training"],
    ["Employer branding"], ["Labor law", "employment law"], ["DEI", "diversity and inclusion"],
  ],
  "Legal & Compliance": [
    ["Contract drafting", "contract review", "contracts"], ["Legal research"], ["Corporate law"], ["Intellectual property", "IP law"],
    ["Data privacy", "privacy law"], ["Regulatory compliance", "compliance"], ["Litigation"], ["Paralegal"], ["Commercial law"],
  ],
  "Writing, Content & Editing": [
    ["Content writing"], ["Technical writing"], ["Editing", "copyediting", "copy editing"], ["Proofreading"], ["Blogging", "blog writing"],
    ["Ghostwriting"], ["Grant writing"], ["Scriptwriting"], ["UX writing"], ["Journalism"], ["SEO writing"], ["Content strategy"],
    ["Storytelling"], ["AP style"],
  ],
  "Translation & Localization": [
    ["Translation"], ["Localization", "localisation"], ["Interpretation", "interpreting"], ["Subtitling"], ["CAT tools", "SDL Trados", "memoQ"],
  ],
  "Education & Tutoring": [
    ["Teaching"], ["Tutoring"], ["Curriculum development", "curriculum design"], ["Instructional design"], ["Lesson planning"],
    ["ESL", "TEFL", "TESOL", "English teaching"], ["E-learning", "eLearning"], ["LMS", "learning management systems", "Moodle", "Canvas LMS"],
    ["Classroom management"], ["Assessment design"], ["Coaching", "mentoring"],
  ],
  "Healthcare & Medical Admin": [
    ["Medical coding", "ICD-10", "CPT coding"], ["Medical billing"], ["EHR", "EMR", "Epic", "Cerner"], ["HIPAA"],
    ["Patient care", "patient support"], ["Nursing", "RN", "registered nurse"], ["Telehealth", "telemedicine"], ["Clinical research"],
    ["Pharmacovigilance"], ["Medical writing"], ["Care coordination"], ["Health insurance", "prior authorization"],
  ],
  "Project Management": [
    ["Project management"], ["Agile"], ["Scrum"], ["Kanban"], ["Jira"], ["Confluence"], ["Asana"], ["Trello"], ["Monday.com"],
    ["PMP"], ["PRINCE2"], ["Stakeholder management"], ["Risk assessment"], ["Program management"], ["Change management"],
  ],
  "QA & Testing": [
    ["Manual testing"], ["Test automation", "automated testing"], ["Selenium"], ["Cypress"], ["Playwright"], ["Appium"], ["Postman", "API testing"],
    ["Test planning", "test cases"], ["Regression testing"], ["Performance testing", "load testing", "JMeter"],
  ],
  General: [
    ["Communication", "communication skills"], ["Leadership", "team leadership", "people management"], ["Problem solving"],
    ["Time management"], ["Attention to detail"], ["Teamwork", "collaboration"], ["Presentation skills", "public speaking"],
    ["Customer focus"], ["Multitasking"], ["Critical thinking"],
  ],
};

// Short names that collide with ordinary words: only match in an explicit context.
const CONTEXT_ONLY: Record<string, RegExp> = {
  Go: /\b(golang|go (?:developer|engineer|programming|language|services?|backend|microservices)|in go\b|(?:python|java|rust|typescript|node(?:\.js)?|ruby|kotlin|c\+\+)\s*(?:,|\/|or|and)\s*go\b|\bgo\s*(?:,|\/|or|and)\s*(?:python|java|rust|typescript|kotlin))/i,
  Node: /\bnode(?:\.js|js)\b/i,
  Spring: /\bspring (?:boot|framework|mvc|cloud|data)\b|\bjava\b[^.]{0,40}\bspring\b|\bspring\b[^.]{0,40}\bjava\b/i,
  Lever: /\blever\s+(?:ats|applicant)/i,
  Greenhouse: /\bgreenhouse\s+(?:ats|applicant|recruiting)/i,
  Workday: /\bworkday\s+(?:hcm|hris|recruiting|ats)/i,
  events: /\bevent (?:planning|marketing|management)\b/i,
  training: /\b(?:delivering|deliver|design(?:ing)?) training\b/i,
  Research: /\b(?:online|desk|market) research\b/i,
  Closing: /\b(?:deal|sales) closing\b|\bclosing deals\b/i,
  AP: /\baccounts payable\b/i,
  AR: /\baccounts receivable\b/i,
  PR: /\bpublic relations\b/i,
  ML: /\bml\b(?!\s*(?:per|\/))/,
  RN: /\bRN\b/,
  IP: /\bintellectual property\b/i,
  ATS: /\bATS\b/,
  JS: /\bJS\b/,
  VA: /\bVA\b/,
};

// Brand names that are also everyday words ("excel at", "express interest", "Spring 2025",
// "the notion of", "an epic"): match only with their capitalisation.
const CASE_SENSITIVE = new Set([
  "Excel", "Express", "Spring", "Swift", "Notion", "Sage", "Epic", "Rust", "Ruby", "Dart", "Sketch", "Helm",
  "Spark", "Snowflake", "Looker", "Asana", "Canvas LMS", "Canva", "Lever", "Workday", "Greenhouse",
]);

export type SkillDef = { name: string; category: string; patterns: RegExp[]; needles: string[] };

// Cheap substring pre-check before running a regex (keeps 10k-job backfills fast).
const needleFor = (term: string) => {
  const ctx: Record<string, string> = { Go: "go", Node: "node", events: "event", training: "training", Research: "research", Closing: "clos", AP: "payable", AR: "receivable", PR: "public relations", IP: "intellectual" };
  return (ctx[term] ?? term).toLowerCase().split(/\s+/)[0];
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function patternFor(term: string): RegExp {
  if (CONTEXT_ONLY[term]) return CONTEXT_ONLY[term];
  const body = esc(term).replace(/\s+/g, "\\s+");
  // Word boundaries that also work for terms ending in symbols (C++, C#, .NET).
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}+#])`, CASE_SENSITIVE.has(term) ? "u" : "iu");
}

export const SKILLS: SkillDef[] = Object.entries(DICT).flatMap(([category, entries]) =>
  entries.map(([name, ...aliases]) => ({
    name,
    category,
    patterns: [name, ...aliases].map(patternFor),
    needles: [name, ...aliases].map(needleFor),
  })),
);
const matches = (s: SkillDef, sent: string, lower: string) => s.patterns.some((p, i) => lower.includes(s.needles[i]) && p.test(sent));
const BY_LOWER = new Map(SKILLS.map((s) => [s.name.toLowerCase(), s]));

export type SkillHit = { skill: string; quote: string };

/** Skills mentioned in text, each with the sentence it was found in. */
export function findSkills(text: string, opts: { includeGeneral?: boolean } = {}): SkillHit[] {
  const out: SkillHit[] = [];
  const sents = sentences(text).map((s) => [s, s.toLowerCase()] as const);
  for (const s of SKILLS) {
    if (!opts.includeGeneral && s.category === "General") continue;
    for (const [sent, lower] of sents) {
      if (matches(s, sent, lower)) {
        out.push({ skill: s.name, quote: sent.length > 200 ? sent.slice(0, 199) + "…" : sent });
        break;
      }
    }
  }
  return out;
}

/** Position of a skill's first match in a sentence, or -1. */
export function skillIndex(skill: string, sentence: string): number {
  const def = BY_LOWER.get(skill.toLowerCase());
  if (!def) return -1;
  let best = -1;
  for (const p of def.patterns) {
    const m = new RegExp(p.source, p.flags.replace("g", "")).exec(sentence);
    if (m && (best < 0 || m.index < best)) best = m.index;
  }
  return best;
}

/** Map a free-text skill (e.g. from a CV skills line) to a canonical name when we know it. */
export function canonicalSkill(raw: string): string {
  const t = raw.trim();
  const direct = BY_LOWER.get(t.toLowerCase());
  if (direct) return direct.name;
  const hit = SKILLS.find((s) => s.patterns.some((p) => p.test(t)) && t.length <= s.name.length + 12);
  return hit ? hit.name : t;
}

export const skillCategory = (name: string) => BY_LOWER.get(name.toLowerCase())?.category ?? null;
