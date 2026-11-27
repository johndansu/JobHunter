import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { compareProfiles, letterConsistency, parseCsv, readLinkedInExport, readProfileDocument } from "./consistency";
import { parseCvText } from "./cv";

// Fictional candidate.
const CV = parseCvText(`Ada Sample
Lagos, Nigeria · ada.sample@example.com

Work Experience
Customer Support Lead | Paystackish Ltd
Jan 2022 – Present
• Led a team of 8 agents.

Customer Support Specialist at FinCo
Mar 2019 - Dec 2021
• Handled live chat for 2,000+ merchants.

Sales Assistant, Retail Hub
2018 – 2019

Education
B.Sc. Business Administration, University of Lagos, 2017`);

// Shaped like LinkedIn's data export files.
const POSITIONS = `Company Name,Title,Description,Location,Started On,Finished On
Paystackish Ltd,Customer Support Lead,"Led a team, of 8 agents.
Second line.","Lagos, Nigeria",Jan 2022,
FinCo,Senior Customer Support Specialist,,,Mar 2019,Aug 2021
Old Shop,Cashier,,,2016,2017`;
const EDUCATION = `School Name,Start Date,End Date,Notes,Degree Name,Activities
University of Lagos,2013,2017,,Bachelor of Science - BS,
`;
const PROFILE = `First Name,Last Name,Maiden Name,Address,Birth Date,Headline
Adá,Sample,,"1 Private Street, Lagos",1 Jan 1995,Support lead`;

describe("reading a LinkedIn export", () => {
  it("parses quoted CSV fields with commas, quotes and newlines", () => {
    expect(parseCsv('a,"b, c","d ""e""\nf"\n1,2,3')).toEqual([["a", "b, c", 'd "e"\nf'], ["1", "2", "3"]]);
  });
  it("reads the ZIP, keeps only name, roles and education", () => {
    const zip = zipSync({ "Positions.csv": strToU8(POSITIONS), "Education.csv": strToU8(EDUCATION), "Profile.csv": strToU8(PROFILE), "messages.csv": strToU8("x") });
    const p = readLinkedInExport([{ name: "Basic_LinkedInDataExport.zip", bytes: zip }])!;
    expect(p.name).toBe("Adá Sample");
    expect(p.roles).toHaveLength(3);
    expect(p.roles[0]).toEqual({ title: "Customer Support Lead", employer: "Paystackish Ltd", start: "Jan 2022", end: "Present" });
    expect(JSON.stringify(p)).not.toMatch(/Private Street|1995/); // address and birth date are dropped
  });
  it("accepts loose CSVs and rejects unrelated files", () => {
    expect(readLinkedInExport([{ name: "Positions.csv", bytes: strToU8(POSITIONS) }])?.roles).toHaveLength(3);
    expect(readLinkedInExport([{ name: "photo.zip", bytes: zipSync({ "a.txt": strToU8("x") }) }])).toBeNull();
  });
});

describe("comparing the CV with the profile", () => {
  const other = readLinkedInExport([
    { name: "Positions.csv", bytes: strToU8(POSITIONS) },
    { name: "Education.csv", bytes: strToU8(EDUCATION) },
    { name: "Profile.csv", bytes: strToU8(PROFILE) },
  ])!;
  const items = compareProfiles(CV, other);
  const byLabel = (l: RegExp) => items.find((i) => l.test(i.label))!;
  it("treats accents as the same name", () => {
    expect(items.find((i) => i.kind === "name")?.status).toBe("match");
  });
  it("matches same title and dates, including a current role", () => {
    expect(byLabel(/^Customer Support Lead/).status).toBe("match");
  });
  it("flags a different end date even when the title only differs by seniority", () => {
    const fin = byLabel(/Specialist at FinCo/);
    expect(fin.status).toBe("mismatch");
    expect(fin.why).toMatch(/end Aug 2021/);
  });
  it("lists roles on only one side", () => {
    expect(byLabel(/Sales Assistant/).status).toBe("only_cv");
    expect(byLabel(/Cashier at Old Shop/).status).toBe("only_other");
  });
  it("matches a degree written two ways (B.Sc. and Bachelor of Science)", () => {
    expect(items.find((i) => i.kind === "education")?.status).toBe("match");
    const msc = compareProfiles(CV, { ...other, education: [{ school: "University of Lagos", degree: "Master of Science - MSc" }] });
    expect(msc.find((i) => i.kind === "education")?.status).toBe("mismatch");
  });
  it("reads a profile saved as text with the CV rules", () => {
    const doc = readProfileDocument("Ada Sample\n\nExperience\nCustomer Support Lead | Paystackish Ltd\nJan 2022 – Present\n", "profile.pdf");
    expect(compareProfiles(CV, doc).find((i) => /Paystackish/.test(i.label))?.status).toBe("match");
  });
});

describe("letter consistency", () => {
  it("blocks a sign-off name that differs from the CV", () => {
    const f = letterConsistency("Dear team,\n\nHello.\n\nKind regards,\nAda Sampel", CV, "Acme");
    expect(f.map((x) => [x.id, x.severity])).toEqual([["signoff", "block"]]);
    expect(letterConsistency("Dear team,\n\nKind regards,\nAda Sample", CV, "Acme")).toEqual([]);
  });
  it("warns about employers that aren't on the CV, but not the target company or a school", () => {
    const text = "As Customer Support Lead at Paystackish Ltd, I led a team. I studied at University of Lagos. I'd love to work at Acme. I also worked at Globex Corp.\n\nAda Sample";
    expect(letterConsistency(text, CV, "Acme").map((x) => x.title)).toEqual(["Globex Corp isn't an employer on your CV"]);
  });
});
