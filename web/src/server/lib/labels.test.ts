import { describe, expect, it } from "vitest";
import { buildEligibility, verdictFor } from "./eligibility";
import fixture from "./fixtures/location-labels.json";

// Regression guard: real board labels, parses reviewed by hand (Phase 1 done-criterion: 200+ real phrases).
describe("real location labels", () => {
  it.each(fixture.cases.map((c) => [c.label, c] as const))("%s", (_label, c) => {
    const e = buildEligibility({ label: c.label, description: "" });
    expect(e.scope).toBe(c.scope);
    expect([...e.regions, ...e.countries].sort()).toEqual(c.places);
    expect(verdictFor(e, { country: "NG", timezone: "Africa/Lagos" }).verdict).toBe(c.verdict);
  });
});
