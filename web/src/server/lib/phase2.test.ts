import { describe, expect, it } from "vitest";
import { parseCvText, totalYears } from "./cv";
import { freshness, halfLifeDays, relatedTitles, scoreMatch, titleSimilarity } from "./match";
import { extractRequirements } from "./requirements";
import { findSkills } from "./skills";

// Fictional CV in a common single-column layout.
const CV = `Sample Candidate
Lagos, Nigeria · sample@example.com

Professional Summary
Customer support lead with 6 years in SaaS and fintech support.

Work Experience
Customer Support Lead | Paystackish Ltd
Jan 2022 – Present
• Led a team of 8 agents on Zendesk and Intercom, cutting first-response time by 40%.
• Built the help center articles and SLA reporting in Google Sheets.

Customer Support Specialist at FinCo
Mar 2019 - Dec 2021
• Handled live chat support and email support for 2,000+ merchants.

Sales Assistant, Retail Hub
2018 – 2019

Education
B.Sc. Business Administration, University of Lagos, 2017

Skills
Zendesk, Intercom, Excel, SQL, Salesforce, Troubleshooting

Languages
English (Native), French (B1)`;

const JOB = `About the role
You'll lead our customer support team across EMEA.

Requirements
• 4+ years of experience in customer support, ideally in SaaS.
• Hands-on experience with Zendesk or Intercom.
• Strong written English.
• Experience with Salesforce.

Nice to have
• SQL or Looker experience is a plus.
• Fluency in Portuguese.

Benefits
• Remote-first, flexible hours.`;

describe("CV reader", () => {
  const cv = parseCvText(CV);
  it("finds roles with dates, titles and employers, each with its source line", () => {
    expect(cv.roles.map((r) => [r.title, r.employer, r.current])).toEqual([
      ["Customer Support Lead", "Paystackish Ltd", true],
      ["Customer Support Specialist", "FinCo", false],
      ["Sales Assistant", "Retail Hub", false],
    ]);
    expect(cv.roles[0].quote).toContain("Jan 2022");
  });
  it("computes years in code, merging overlapping or adjacent roles", () => {
    expect(cv.totalYears).toBeGreaterThanOrEqual(7.5);
    expect(totalYears([[2020 * 12, 2020 * 12 + 11], [2020 * 12 + 6, 2021 * 12 + 5]])).toBe(1.5);
  });
  it("finds skills with quotes, education and languages with levels", () => {
    const names = cv.skills.map((s) => s.skill);
    expect(names).toEqual(expect.arrayContaining(["Zendesk", "Intercom", "Excel", "SQL", "Salesforce", "Troubleshooting", "Live chat support", "Email support"]));
    expect(cv.education[0].text).toMatch(/B\.Sc\. Business Administration/);
    expect(cv.languages).toEqual(expect.arrayContaining([expect.objectContaining({ language: "English", level: "C2" }), expect.objectContaining({ language: "French", level: "B1" })]));
    expect(cv.seniorityGuess).toBe("Lead/Manager");
  });
  it("warns when no dates are found", () => {
    expect(parseCvText("Just a paragraph about me.").warnings.length).toBeGreaterThan(0);
  });
});

describe("skills dictionary", () => {
  it("does not read everyday words as tools", () => {
    expect(findSkills("You will excel at helping customers and express ideas clearly in Spring.").map((s) => s.skill)).toEqual([]);
    expect(findSkills("Let's go to the next step.").map((s) => s.skill)).toEqual([]);
  });
  it("matches symbol-ending names and context-only ones", () => {
    expect(findSkills("Experience with C# and C++ services written in Golang.").map((s) => s.skill)).toEqual(expect.arrayContaining(["C#", "C++", "Go"]));
  });
});

describe("requirements", () => {
  const r = extractRequirements("Customer Support Lead", JOB);
  it("splits must-haves from nice-to-haves by section and wording", () => {
    const lv = Object.fromEntries(r.skills.map((s) => [s.skill, s.level]));
    expect(lv).toMatchObject({ Zendesk: "must", Intercom: "must", Salesforce: "must", SQL: "nice", Looker: "nice" });
    expect(lv["Customer support"]).toBe("must");
  });
  it("finds years and required languages, ignoring nice-to-have languages", () => {
    expect(r.years?.min).toBe(4);
    expect(r.languages.map((l) => l.language)).toEqual(["English"]);
  });
});

describe("matching", () => {
  const profile = { targetTitles: ["Customer Support Lead"], categories: ["Customer Support & Success"], seniority: "Lead/Manager", years: 7.5, skills: ["Zendesk", "Intercom", "Salesforce", "SQL", "Customer support"], languages: [{ language: "English", level: "C2" }] };
  const job = { title: "Customer Support Team Lead", category: "Customer Support & Success", seniority: "Lead/Manager", requirements: extractRequirements("Customer Support Team Lead", JOB) };
  it("a close match is Strong, with quoted evidence", () => {
    const m = scoreMatch(profile, job);
    expect(m.band).toBe("strong");
    expect(m.checklist.matched.find((x) => x.skill === "Zendesk")?.quote).toMatch(/Zendesk/);
    expect(m.checklist.years?.ok).toBe(true);
  });
  it("missing must-haves and a far-off title drop the band", () => {
    const m = scoreMatch({ ...profile, skills: [], targetTitles: ["Accountant"], categories: [] }, job);
    expect(m.band).toBe("unlikely");
  });
  it("a required language you don't speak caps the band", () => {
    const jobDe = { ...job, requirements: extractRequirements("Support Lead", "Requirements\n• Fluent German is required.\n• Zendesk experience.") };
    expect(scoreMatch(profile, jobDe).band).toBe("unlikely");
  });
  it("a language named in the title counts as required", () => {
    const r = extractRequirements("Customer Success Manager (Arabic speaking)", "Requirements\n• Zendesk experience.");
    expect(r.languages.map((l) => l.language)).toEqual(["Arabic"]);
    expect(scoreMatch(profile, { title: "Customer Success Manager (Arabic speaking)", category: "Customer Support & Success", seniority: null, requirements: r }).band).toBe("unlikely");
  });
  it("skills alone can't make an unrelated role a good match", () => {
    const eng = { title: "Director of Engineering", category: "Software & IT", seniority: "Director+", requirements: extractRequirements("Director of Engineering", "Requirements\n• Strong Excel and SQL skills.") };
    expect(["stretch", "unlikely"]).toContain(scoreMatch(profile, eng).band);
    const partner = { title: "Senior Manager, Partner Funding Support", category: "Other", seniority: "Lead/Manager", requirements: extractRequirements("x", JOB) };
    expect(scoreMatch(profile, partner).band).not.toBe("strong");
  });
  it("title similarity treats developer/engineer and support/service as the same", () => {
    expect(titleSimilarity("Senior Frontend Developer", ["Front-end Engineer"]).score).toBeGreaterThan(0.8);
    expect(titleSimilarity("Customer Service Representative", ["Customer Support Representative"]).score).toBeGreaterThan(0.8);
  });
  it("freshness multiplies with a floor and longer half-life for senior roles", () => {
    expect(freshness(0, 4)).toBeCloseTo(1);
    expect(freshness(4, 4)).toBeCloseTo(0.65);
    expect(freshness(365, 4)).toBeCloseTo(0.3);
    expect(halfLifeDays("Director+")).toBe(12);
  });
  it("suggests related titles", () => {
    expect(relatedTitles(["Customer Support Specialist"])).toEqual(expect.arrayContaining(["Customer Success Manager", "Technical Support Specialist"]));
  });
});
