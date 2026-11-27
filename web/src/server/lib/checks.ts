import { hiddenContent, type CvParse } from "./cv";
import type { Profile } from "./profile";
import { findSkills } from "./skills";
import { parseCvDocText, type CvDoc } from "./tailor";
import { sentences } from "./text";

/**
 * Document checks (DOC-03, DOC-06, AUTH-01…03). Blocking flags stop approval and
 * download; warnings explain themselves and leave the choice to the candidate.
 * Nothing here scores "AI-ness" (P-07): the aim is a true, specific application
 * in the candidate's own voice.
 */
export type Flag = { id: string; severity: "block" | "warn"; title: string; why: string; quote?: string };

const n = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Number tokens, normalised: "2,000+" → "2000", "40%" → "40". Skips digits glued to letters (C2, Q3, B1). */
export function numbersIn(text: string): string[] {
  return [...text.matchAll(/(?<![\p{L}\d.,])\d+(?:[.,]\d+)*/gu)].map((m) => {
    const t = m[0];
    return /^\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g, "") : t.replace(/,/g, ".");
  });
}

/**
 * Release years for tools in the skills dictionary, used to catch claims that a
 * tool was used before it existed (DOC-03). Approximate public-launch years.
 */
export const RELEASED: Record<string, number> = {
  TypeScript: 2012, Go: 2009, Rust: 2015, Kotlin: 2016, Swift: 2014, Elixir: 2012, React: 2013, "Next.js": 2016, Vue: 2014,
  Svelte: 2016, "Node.js": 2009, Express: 2010, Flask: 2010, FastAPI: 2018, Tailwind: 2017, GraphQL: 2015, gRPC: 2016,
  "React Native": 2015, Flutter: 2017, Webflow: 2013, MongoDB: 2009, Redis: 2009, Elasticsearch: 2010, Snowflake: 2014,
  BigQuery: 2011, Redshift: 2012, Databricks: 2013, "Apache Spark": 2010, Kafka: 2011, Airflow: 2015, dbt: 2016,
  "Power BI": 2015, Looker: 2012, PyTorch: 2016, TensorFlow: 2015, Docker: 2013, Kubernetes: 2014, Terraform: 2014,
  Ansible: 2012, "GitHub Actions": 2018, Prometheus: 2012, Grafana: 2014, Datadog: 2010, Helm: 2016, Serverless: 2014,
  Figma: 2016, Sketch: 2010, "Adobe XD": 2016, Canva: 2013, "TikTok Ads": 2019, HubSpot: 2006, Pipedrive: 2010,
  "Outreach.io": 2014, Zendesk: 2007, Intercom: 2011, Freshdesk: 2010, "Help Scout": 2011, Gorgias: 2015, Notion: 2016,
  Airtable: 2012, Zapier: 2011, "Google Sheets": 2006, "Google Workspace": 2006, "Prompt engineering": 2020, LLMs: 2018,
};

function yearOf(d: string | null): number | null {
  if (!d) return null;
  if (/present|current|now|date|ongoing/i.test(d)) return new Date().getUTCFullYear();
  const m = d.match(/(\d{4})/);
  return m ? Number(m[1]) : null;
}

const PLACEHOLDER = /\[[^\]\n]{3,}\]/;

/**
 * Fact lock (DOC-03, AUTH-01). Every number, tool, title, employer, date and
 * degree must trace to the master CV (or to facts the candidate declared in the
 * profile). `allowed` holds app-provided text, e.g. the computed time-zone overlap.
 */
export function factLock(opts: { kind: "cv" | "letter"; text: string; cv: CvParse & { text: string }; profile: Profile; allowed?: string[] }): Flag[] {
  const { kind, text, cv, profile } = opts;
  const flags: Flag[] = [];
  const ph = text.match(PLACEHOLDER);
  if (ph) flags.push({ id: "blank", severity: "block", title: "A blank is still unfilled", why: "Text in [square brackets] is a prompt for you to write. It can't go to an employer as is.", quote: ph[0] });

  for (const h of hiddenContent(text)) flags.push({ id: "hidden", severity: "block", title: "Hidden characters in the text", why: "Invisible or look-alike characters read as keyword stuffing or tampering when a hiring system or recruiter finds them.", quote: h });

  // Numbers: each must appear in the master CV or in facts the app supplied.
  const known = new Set([
    ...numbersIn(cv.text),
    ...numbersIn((opts.allowed ?? []).join(" ")),
    ...numbersIn(profile.skills.join(", ")),
    ...(profile.years != null ? [String(profile.years)] : []),
  ]);
  const body = kind === "cv" ? text.split("\n").slice(2).join("\n") : text; // the CV's first two lines are name and contact
  const bodyNoDates = body
    .replace(/^.*\|.*\d{4}.*$/gm, "") // role headers are checked separately below
    .replace(/\b(GMT|UTC)\s?[+-]\s?\d{1,2}(:\d{2})?\b/g, ""); // time-zone labels, not claims
  const unknownNums = [...new Set(numbersIn(bodyNoDates.replace(new RegExp(PLACEHOLDER.source, "g"), "")))].filter((x) => !known.has(x));
  for (const num of unknownNums) {
    const quote = sentences(bodyNoDates).find((s) => numbersIn(s).includes(num));
    flags.push({ id: "number", severity: "block", title: `The number ${num} isn't in your CV`, why: "Every figure must come from your own CV. Recruiters ask about numbers, and an unsupported one is the claim most often caught.", quote });
  }

  // Tools and skills: must be in the CV or the confirmed profile.
  const mine = new Set([...cv.skills.map((s) => s.skill.toLowerCase()), ...profile.skills.map((s) => s.toLowerCase())]);
  // The job title and company name (e.g. "Salesforce Administrator" at "Intercom") aren't claims.
  const scrubbed = (opts.allowed ?? []).filter((a) => a.length >= 2).reduce((t, a) => t.split(a).join(" "), text.replace(new RegExp(PLACEHOLDER.source, "g"), " "));
  for (const h of findSkills(scrubbed)) {
    if (!mine.has(h.skill.toLowerCase())) flags.push({ id: "skill", severity: "block", title: `${h.skill} isn't in your CV or profile`, why: "Claimed-but-missing skills are what employers most often catch. Add it to your profile only if you really have it.", quote: h.quote });
  }

  if (kind === "cv") {
    const doc = parseCvDocText(text);
    for (const r of doc.experience) {
      const m = cv.roles.find((x) => n(x.title) === n(r.title) && n(x.employer ?? "") === n(r.employer ?? ""));
      const header = [r.title, r.employer, r.start || r.end ? `${r.start ?? ""} – ${r.end ?? ""}` : null].filter(Boolean).join(" | ");
      if (!m) flags.push({ id: "role", severity: "block", title: "A job title or employer differs from your CV", why: "Titles and employers must match your CV exactly. Background checks compare them, and a mismatch can read as fraud.", quote: header });
      else if (n(m.start ?? "") !== n(r.start ?? "") || n(m.end ?? "") !== n(r.end ?? "")) flags.push({ id: "dates", severity: "block", title: "Dates differ from your CV", why: "Employment dates must match your CV exactly; employers verify them.", quote: header });
      // Anachronisms: a tool used in a role that ended before the tool existed.
      const end = yearOf(r.end);
      for (const b of r.bullets) for (const h of findSkills(b)) {
        const rel = RELEASED[h.skill];
        if (rel && end && rel > end) flags.push({ id: "anachronism", severity: "block", title: `${h.skill} came out in ${rel}, after this role ended (${end})`, why: "A tool that didn't exist yet is a common sign of an invented claim.", quote: b });
      }
    }
    const masterEdu = cv.education.map((e) => n(e.text));
    for (const e of doc.education) if (!masterEdu.includes(n(e))) flags.push({ id: "degree", severity: "block", title: "An education line differs from your CV", why: "Degrees and institutions must match your CV exactly; they're verified.", quote: e });
  } else {
    const DEG = /\b(ph\.?d|doctorate|master'?s|msc|m\.sc|mba|bachelor'?s|b\.?sc|b\.?a\b|b\.?eng|hnd|diploma)\b/i;
    const masterEdu = cv.education.map((e) => e.text).join(" ");
    for (const s of sentences(text)) {
      const m = s.match(DEG);
      if (m && !new RegExp(m[1].replace(/\./g, "\\.?").replace(/'/g, "'?"), "i").test(masterEdu)) flags.push({ id: "degree", severity: "block", title: `Your CV doesn't list a ${m[1]}`, why: "Degrees are verified; claim only what your CV shows.", quote: s });
    }
  }
  return flags;
}

/** Specificity (AUTH-02): each bullet needs a concrete anchor: a tool, number, scope or timeframe. */
export function specificity(doc: CvDoc): Flag[] {
  const ANCHOR = /\d|\b(team of|across|per (day|week|month)|daily|weekly|monthly|Q[1-4]|within|end[- ]to[- ]end|from scratch)\b/i;
  const flags: Flag[] = [];
  for (const r of doc.experience)
    for (const b of r.bullets)
      if (!ANCHOR.test(b) && !findSkills(b).length)
        flags.push({ id: "vague", severity: "warn", title: "A bullet has no concrete detail", why: "Vague achievements are a recruiter tell. Add a tool, number, scope or timeframe from your own experience.", quote: b });
  return flags;
}

const OVERUSED = [
  "delve", "delving", "showcasing", "showcase", "underscores", "underscore", "tapestry", "testament", "realm", "navigate the complexities",
  "leverage", "leveraging", "leveraged", "seamless", "seamlessly", "cutting-edge", "passionate about", "thrilled", "i am writing to express my interest",
  "i am excited to apply", "pivotal", "meticulous", "fast-paced environment", "dynamic environment", "ever-evolving", "unwavering", "resonate", "resonates",
  "embark", "foster", "fostering", "synergy", "spearheaded", "elevate", "harness", "robust", "holistic", "in today's",
];
const OPENERS = /^(furthermore|additionally|moreover|in addition|notably|ultimately|overall)\b/i;
const BUZZ = ["results-driven", "detail-oriented", "team player", "self-starter", "go-getter", "hard-working", "hardworking", "proactive", "dynamic", "innovative", "strategic thinker", "think outside the box", "best-in-class", "world-class", "motivated", "passionate", "dedicated", "synergy", "value-add", "thought leader", "rockstar", "ninja", "guru"];
const INFLATED_VERBS = /^(spearheaded|orchestrated|leveraged|championed|pioneered|revolutionized|revolutionised|catalyzed|galvanized|harnessed|elevated|empowered|cultivated|fostered|architected|transformed|accelerated|streamlined|supercharged|amplified)\b/i;
const PRAISE = /\b(i('ve| have) (long )?admired|industry leader|leading (company|organi[sz]ation|provider|player)|innovative (company|organi[sz]ation)|your mission (deeply )?resonates|i am (deeply |truly )?inspired by|world[- ]class (company|team|organi[sz]ation)|esteemed (company|organi[sz]ation|team)|reputable (company|organi[sz]ation)|dynamic (company|organi[sz]ation)|commitment to excellence|at the forefront of)\b/i;

const SPELL: [string, string][] = [
  ["organize", "organise"], ["organization", "organisation"], ["prioritize", "prioritise"], ["optimize", "optimise"], ["analyze", "analyse"],
  ["color", "colour"], ["behavior", "behaviour"], ["center", "centre"], ["favor", "favour"], ["labor", "labour"], ["catalog", "catalogue"],
  ["defense", "defence"], ["license", "licence"], ["traveled", "travelled"], ["modeling", "modelling"], ["utilize", "utilise"], ["recognize", "recognise"],
  ["minimize", "minimise"], ["maximize", "maximise"], ["customize", "customise"], ["standardize", "standardise"], ["specialize", "specialise"],
];

function wordsOf(s: string): string[] {
  return s.toLowerCase().replace(/[^\p{L}\p{N}' -]+/gu, " ").split(/\s+/).filter(Boolean);
}

/**
 * Authenticity lint (AUTH-03, Appendix B5). Every flag says why it matters. These
 * are recruiters' own tells for generic, inflated or copied writing; none is a
 * detector score and none is a reason to "humanize" text.
 */
export function authenticityLint(opts: { cvText?: string; letterText?: string; jobText: string; locale: "us" | "uk" | null; ownWriting?: string | null; allowed?: string[] }): Flag[] {
  const flags: Flag[] = [];
  const docs: [string, string][] = [];
  if (opts.cvText) docs.push(["CV", opts.cvText.split("\n").filter((l) => !/\|.*\d{4}/.test(l)).join("\n")]);
  if (opts.letterText) docs.push(["letter", opts.letterText]);

  for (const [name, raw] of docs) {
    // The job title and company name are quoted from the posting, not the candidate's writing.
    const text = (opts.allowed ?? []).filter((a) => a.length >= 2).reduce((t, a) => t.split(a).join(" "), raw.replace(new RegExp(PLACEHOLDER.source, "g"), " "));
    const lower = text.toLowerCase();
    const sents = sentences(text.replace(/^- /gm, ""));

    const over = OVERUSED.filter((w) => new RegExp(`\\b${w.replace(/[-']/g, "[-' ]?")}\\b`, "i").test(lower));
    if (over.length) flags.push({ id: `overused-${name}`, severity: "warn", title: `Overused wording in the ${name}: ${over.slice(0, 5).map((w) => `"${w}"`).join(", ")}`, why: "These words are the ones recruiters associate with generic, machine-polished applications. Say the same thing in your own plain words.", quote: sents.find((s) => over.some((w) => s.toLowerCase().includes(w.split(" ")[0]))) });

    const openers = sents.filter((s) => OPENERS.test(s));
    if (openers.length >= (name === "letter" ? 1 : 2)) flags.push({ id: `openers-${name}`, severity: "warn", title: `"Furthermore / Additionally"-style openers in the ${name}`, why: "Chains of connective openers read as formulaic. People rarely write them in short applications.", quote: openers[0] });

    const words = wordsOf(text).length;
    // Dashes used as punctuation mid-sentence (not bullet markers or date ranges).
    const dashes = (text.replace(/^\s*[-•*]\s+/gm, "").match(/—|(?<=\S) [–-] (?=\S)/g) ?? []).length;
    if (words >= 40 && dashes >= 3 && dashes / words > 0.012) flags.push({ id: `dashes-${name}`, severity: "warn", title: `Lots of dashes in the ${name} (${dashes})`, why: "Frequent dashes are one of the most cited tells of machine-written text. Use full stops or commas instead." });

    const buzz = BUZZ.filter((b) => lower.includes(b));
    if (buzz.length >= 3) flags.push({ id: `buzz-${name}`, severity: "warn", title: `Buzzwords in the ${name}: ${buzz.slice(0, 5).join(", ")}`, why: "Recruiters skip self-descriptions like these. A concrete example says more than the adjective." });

    if (name === "CV") {
      const bullets = raw.split("\n").filter((l) => /^- /.test(l)).map((l) => l.slice(2));
      const inflated = bullets.filter((b) => INFLATED_VERBS.test(b));
      if (bullets.length >= 3 && inflated.length / bullets.length >= 0.5) flags.push({ id: "verbs", severity: "warn", title: `${inflated.length} of ${bullets.length} bullets open with an inflated verb`, why: "\"Spearheaded / Orchestrated / Leveraged\" on every line is a well-known tell. Plain verbs (led, built, ran, fixed) read as more credible.", quote: inflated[0] });
    }

    if (name === "letter" && sents.length >= 5) {
      const lens = sents.map((s) => wordsOf(s).length);
      const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
      const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length);
      if (mean > 0 && sd / mean < 0.2) flags.push({ id: "uniform", severity: "warn", title: "Every sentence in the letter is about the same length", why: "Uniform rhythm is a sign of templated or generated text. Natural writing mixes short and long sentences." });
    }
    const praise = sents.find((s) => PRAISE.test(s));
    if (praise) flags.push({ id: `praise-${name}`, severity: "warn", title: `Generic praise for the employer in the ${name}`, why: "Praise that would fit any company tells the reader nothing. Name something specific: a product, a customer, a fact from the posting.", quote: praise });

    // Echoing the posting: 8+ consecutive words copied from the job description.
    const job = wordsOf(opts.jobText);
    const shingles = new Set<string>();
    for (let i = 0; i + 8 <= job.length; i++) shingles.add(job.slice(i, i + 8).join(" "));
    const mine = wordsOf(text);
    for (let i = 0; i + 8 <= mine.length; i++) {
      if (shingles.has(mine.slice(i, i + 8).join(" "))) {
        flags.push({ id: `echo-${name}`, severity: "warn", title: `The ${name} copies the job description word for word`, why: "Recruiters notice their own posting pasted back. Hiring software also matches meaning, not only exact phrases. Use the posting's key terms where you have the experience, in your own sentences.", quote: mine.slice(i, i + 12).join(" ") + "…" });
        break;
      }
    }

    // Spelling locale. Product names keep their own spelling ("Help Center", "Data Center").
    const spell = text.replace(/\b(help|data|contact|call|admin|resource) center\b/gi, " ");
    const us = SPELL.filter(([a]) => new RegExp(`\\b${a}(s|d|r|rs|ing|ed)?\\b`, "i").test(spell)).map(([a]) => a);
    const uk = SPELL.filter(([, b]) => new RegExp(`\\b${b}(s|d|r|rs|ing|ed)?\\b`, "i").test(spell)).map(([, b]) => b);
    if (us.length && uk.length) flags.push({ id: `spelling-mixed-${name}`, severity: "warn", title: `Mixed US and UK spelling in the ${name}`, why: "Inconsistent spelling looks careless and can suggest pasted text.", quote: `${us[0]} / ${uk[0]}` });
    else if (opts.locale === "us" && uk.length) flags.push({ id: `spelling-${name}`, severity: "warn", title: `UK spelling for a US employer (${uk.slice(0, 3).join(", ")})`, why: "Matching the employer's spelling is a small signal of care. Optional: UK spelling is correct English." });
    else if (opts.locale === "uk" && us.length) flags.push({ id: `spelling-${name}`, severity: "warn", title: `US spelling for a UK employer (${us.slice(0, 3).join(", ")})`, why: "Matching the employer's spelling is a small signal of care." });
  }

  // Voice: the letter vs the candidate's own writing (their CV summary).
  if (opts.letterText && opts.ownWriting) {
    const own = sentences(opts.ownWriting);
    const lt = sentences(opts.letterText.replace(PLACEHOLDER, " ")).filter((s) => wordsOf(s).length > 3);
    if (own.length >= 2 && lt.length >= 3) {
      const avg = (xs: string[]) => xs.reduce((a, s) => a + wordsOf(s).length, 0) / xs.length;
      const ratio = avg(lt) / avg(own);
      if (ratio > 1.8 || ratio < 0.5) flags.push({ id: "voice", severity: "warn", title: "The letter doesn't sound like your CV", why: "A different voice in the CV and letter is a recruiter tell. Keep sentence length and tone close to how you normally write." });
    }
  }
  return flags;
}

export const blocking = (flags: Flag[]) => flags.filter((f) => f.severity === "block");
