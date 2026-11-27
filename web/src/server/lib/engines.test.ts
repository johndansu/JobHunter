import { describe, expect, it } from "vitest";
import { buildEligibility, verdictFor } from "./eligibility";
import { findCountries, findRegions, toCountryCode } from "./geo";
import { categorize, matchKeyOf, seniorityOf } from "./normalize";
import { formatSalary, makeSalary } from "./salary";
import { htmlToText } from "./text";
import { overlapHours, overlapRange, standardOffsetMinutes } from "./timezone";
import { trustLabels } from "./trust";

const NG = { country: "NG", timezone: "Africa/Lagos" };
const v = (input: Parameters<typeof buildEligibility>[0], viewer = NG) => verdictFor(buildEligibility(input), viewer);

describe("geo", () => {
  it("resolves feed spellings", () => {
    expect(toCountryCode("Nigeria")).toBe("NG");
    expect(toCountryCode("Congo, The Democratic Republic of the")).toBe("CD");
    expect(toCountryCode("Côte d'Ivoire")).toBe("CI");
    expect(toCountryCode("United States")).toBe("US");
    expect(toCountryCode("NG")).toBe("NG");
  });
  it("never reads the pronoun 'us' or Latin America as a country", () => {
    expect(findCountries("Join us and help us grow")).toEqual([]);
    expect(findCountries("Candidates in Latin America")).toEqual([]);
    expect(findRegions("Candidates in Latin America")).toEqual(["LATAM"]);
    expect(findCountries("US Only")).toEqual(["US"]);
  });
});

describe("timezone", () => {
  it("Lagos is UTC+1 with no DST", () => {
    expect(standardOffsetMinutes("Africa/Lagos")).toBe(60);
  });
  it("Lagos vs New York: 2 h in northern winter, 3 h in summer", () => {
    expect(overlapHours("Africa/Lagos", "America/New_York", new Date(Date.UTC(2027, 0, 15, 12)))).toBe(2);
    expect(overlapHours("Africa/Lagos", "America/New_York", new Date(Date.UTC(2027, 6, 15, 12)))).toBe(3);
    expect(overlapRange("Africa/Lagos", "America/New_York")).toEqual({ min: 2, max: 3 });
  });
  it("Lagos vs US Pacific: no overlap unless hours shift", () => {
    expect(overlapRange("Africa/Lagos", "America/Los_Angeles").max).toBe(0);
    expect(overlapRange("Africa/Lagos", "America/Los_Angeles", 4).max).toBeGreaterThan(0);
  });
});

describe("eligibility", () => {
  it("board label 'US Only' is not eligible for Nigeria", () => {
    const r = v({ label: "US Only", description: "We build tools." });
    expect(r.verdict).toBe("not_eligible");
    expect(r.reason).toMatch(/United States/);
  });
  it("description overrides a 'Worldwide' label (WWR / Remote OK pattern)", () => {
    const r = v({
      label: "Anywhere in the World",
      description: "Great role. You must be authorized to work in the United States without sponsorship.",
    });
    expect(r.verdict).toBe("not_eligible");
    expect(r.quote).toMatch(/authorized to work/);
  });
  it("Himalayas-style country list including Nigeria is eligible", () => {
    const r = v({ fieldCountries: ["Nigeria", "Kenya", "Ghana"], description: "Join our support team." });
    expect(r.verdict).toBe("eligible");
  });
  it("EMEA region is a region match for Nigeria", () => {
    const r = v({ description: "This role is open to candidates based in EMEA." });
    expect(r.verdict).toBe("region_match");
  });
  it("empty location is unclear, never worldwide", () => {
    expect(v({ description: "We are a fast-growing startup." }).verdict).toBe("unclear");
  });
  it("company office sentences are not restrictions", () => {
    expect(v({ label: "Worldwide", description: "We are headquartered in Berlin with offices in London and New York." }).verdict).toBe("eligible");
  });
  it("CET ±3 hours admits Lagos", () => {
    const r = v({ label: "Worldwide", description: "Time zone: CET (+/- 3 hours). We are unable to consider applications from other time zones." });
    expect(r.verdict).toBe("eligible");
  });
  it("6 hours overlap with US Pacific excludes Lagos", () => {
    const r = v({ label: "Worldwide", description: "You need at least 6 hours of overlap with U.S. Pacific Time." });
    expect(r.verdict).toBe("not_eligible");
    expect(r.reason).toMatch(/overlap/);
  });
  it("US citizenship requirement blocks", () => {
    const r = v({ label: "Worldwide", description: "Applicants must be a U.S. citizen due to contract requirements." });
    expect(r.verdict).toBe("not_eligible");
  });
  it("exclusions inside a region", () => {
    const r = verdictFor(buildEligibility({ description: "Open to candidates in EMEA, excluding France." }), { country: "FR", timezone: "Europe/Paris" });
    expect(r.verdict).toBe("not_eligible");
  });
  it("inclusive wording opens a country-labelled job (real Jobicy posting)", () => {
    const r = v({ label: "USA", description: "This opportunity is available to both US and internationally based interpreters." });
    expect(r.verdict).toBe("eligible");
  });
  it("ITAR as a skill is not an export restriction", () => {
    const e = buildEligibility({ label: "Worldwide", description: "Working knowledge of ITAR and EAR, DFARS and NIST SP 800-171." });
    expect(e.blockers).toEqual([]);
    expect(buildEligibility({ description: "This position is subject to ITAR and requires a U.S. person." }).blockers.length).toBeGreaterThan(0);
  });
  it("a section heading mentioning a country is not a restriction", () => {
    const e = buildEligibility({ label: "Worldwide", description: "Contributing to the US Sales Strategy: You strongly believe that a team wins together." });
    expect(e.scope).toBe("worldwide");
  });
  it("sanctioned country is not eligible", () => {
    expect(v({ label: "Worldwide", description: "x" }, { country: "IR", timezone: "Asia/Tehran" }).verdict).toBe("not_eligible");
  });
});

describe("salary", () => {
  it("keeps original currency and period", () => {
    const s = makeSalary(150000, 250000, "eur", "1 YEAR")!;
    expect(s).toEqual({ min: 150000, max: 250000, currency: "EUR", period: "year" });
    expect(formatSalary(s)).toBe("€150k–€250k / year");
  });
  it("ignores zeros", () => {
    expect(makeSalary(0, 0, "USD", null)).toBeNull();
  });
});

describe("normalize", () => {
  it("categorizes non-tech roles", () => {
    expect(categorize("Customer Support Specialist")).toBe("Customer Support & Success");
    expect(categorize("Executive Assistant to CEO")).toBe("Virtual Assistance");
    expect(categorize("Senior Accountant")).toBe("Finance & Accounting");
    expect(categorize("Spanish Translator")).toBe("Translation & Localization");
    expect(categorize("Frontend Engineer")).toBe("Software & IT");
  });
  it("seniority and match keys", () => {
    expect(seniorityOf("Sr. Product Designer")).toBe("Senior");
    expect(matchKeyOf("Acme, Inc.", "Senior Engineer (Remote)")).toBe(matchKeyOf("ACME", "Sr Engineer - Remote"));
  });
  it("html to text", () => {
    expect(htmlToText("<p>Hello&nbsp;<b>world</b></p><ul><li>One</li></ul>")).toBe("Hello world\n\n• One");
  });
});

describe("trust", () => {
  it("flags crypto deposits with a quote", () => {
    const l = trustLabels({ text: "Great job. To start you must deposit 50 USDT to activate your account.", isEmployerAts: false, hasSalary: false });
    const scam = l.find((x) => x.kind === "possible_scam");
    expect(scam).toBeTruthy();
    expect(scam && "quote" in scam ? scam.quote : "").toMatch(/USDT/);
  });
  it("ignores employers' anti-fraud disclaimers (real Greenhouse text)", () => {
    const l = trustLabels({
      text: "We will never ask for payment, gift cards, cryptocurrency, or banking information during the hiring process. Recruiters will never contact you via WhatsApp or Telegram.",
      isEmployerAts: true,
      hasSalary: false,
    });
    expect(l.some((x) => x.kind === "possible_scam" || x.kind === "use_caution")).toBe(false);
  });
  it("labels employer declarations neutrally", () => {
    const l = trustLabels({ text: "Join our talent pool for future openings. ".repeat(20), isEmployerAts: true, atsName: "Greenhouse", hasSalary: true });
    expect(l.map((x) => x.kind)).toEqual(expect.arrayContaining(["employer_ats", "salary_listed", "employer_says"]));
    expect(l.some((x) => x.kind === "possible_scam")).toBe(false);
  });
});
