/**
 * Time-zone overlap computed on real dates with the runtime's IANA tz data
 * (ELIG-04). Never a fixed offset table: DST and 2026's permanent-time changes
 * (BC, Alberta, Morocco, Manitoba) move overlaps.
 */

/** UTC offset of `zone` at `date`, in minutes (e.g. Africa/Lagos → 60). */
export function offsetMinutes(zone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    timeZoneName: "longOffset",
  }).formatToParts(date);
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = name.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** The zone's standard (non-DST) offset: the smaller of January and July. */
export function standardOffsetMinutes(zone: string, year = new Date().getUTCFullYear()): number {
  const jan = offsetMinutes(zone, new Date(Date.UTC(year, 0, 15)));
  const jul = offsetMinutes(zone, new Date(Date.UTC(year, 6, 15)));
  return Math.min(jan, jul);
}

/**
 * Hours of overlap between a 9–17 working day in each zone on `date`.
 * `shiftHours` lets the candidate move their own day earlier or later.
 */
export function overlapHours(
  candidateZone: string,
  employerZone: string,
  date: Date,
  shiftHours = 0,
  workStart = 9,
  workEnd = 17,
): number {
  const oc = offsetMinutes(candidateZone, date) / 60;
  const oe = offsetMinutes(employerZone, date) / 60;
  const cs = workStart - oc;
  const ce = workEnd - oc;
  const es = workStart - oe;
  const ee = workEnd - oe;
  let best = 0;
  for (let s = -shiftHours; s <= shiftHours + 1e-9; s += 0.5)
    for (const k of [-24, 0, 24]) {
      const ov = Math.min(ce + s, ee + k) - Math.max(cs + s, es + k);
      if (ov > best) best = ov;
    }
  return Math.round(best * 2) / 2;
}

/** Min/max overlap across the next 12 months (sampled twice a month). */
export function overlapRange(
  candidateZone: string,
  employerZone: string,
  shiftHours = 0,
  from = new Date(),
): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < 24; i++) {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + Math.floor(i / 2), i % 2 ? 15 : 1, 12));
    const h = overlapHours(candidateZone, employerZone, d, shiftHours);
    min = Math.min(min, h);
    max = Math.max(max, h);
  }
  return { min, max };
}

/** Words used in postings → IANA anchor zone. Raw text is always kept alongside. */
export const ZONE_WORDS: [RegExp, string][] = [
  [/\b(central europe(an)?|cet|cest)\b/i, "Europe/Berlin"],
  [/\b(u\.?s\.?\s*)?(pacific|pst|pdt|pt)\b/i, "America/Los_Angeles"],
  [/\b(u\.?s\.?\s*)?(mountain|mst|mdt)\b/i, "America/Denver"],
  [/\b(u\.?s\.?\s*)?(central|cst|cdt|ct)\b/i, "America/Chicago"],
  [/\b(u\.?s\.?\s*)?(eastern|est|edt|et)\b/i, "America/New_York"],
  [/\b(uk|bst|london|gmt)\b/i, "Europe/London"],
  [/\b(utc)\b/i, "UTC"],
  [/\b(ist|india)\b/i, "Asia/Kolkata"],
  [/\b(eat|east africa)\b/i, "Africa/Nairobi"],
  [/\b(wat|west africa)\b/i, "Africa/Lagos"],
  [/\b(sast|south africa)\b/i, "Africa/Johannesburg"],
  [/\b(aest|aedt|sydney)\b/i, "Australia/Sydney"],
  [/\b(sgt|singapore)\b/i, "Asia/Singapore"],
  [/\b(brt|brazil|são paulo|sao paulo)\b/i, "America/Sao_Paulo"],
];

export function zoneFromWords(text: string): string | null {
  for (const [re, zone] of ZONE_WORDS) if (re.test(text)) return zone;
  return null;
}
