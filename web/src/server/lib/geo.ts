/**
 * Countries (ISO 3166-1 alpha-2) and macro-regions.
 * Country names come from Intl so we don't ship a hand-typed list; aliases cover
 * the spellings job feeds actually use. Regions never expand to uninhabited
 * territories (Himalayas' long lists included Antarctica).
 */

const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

const UNINHABITED = new Set(["AQ", "BV", "HM", "TF", "UM", "GS", "IO"]);
// Codes Intl names that aren't countries (FX is "France" and would shadow FR).
const NOT_COUNTRIES = new Set(["FX", "EU", "EZ", "UN", "QO", "XA", "XB", "ZZ", "AC", "CP", "DG", "EA", "IC", "TA", "UK", "CQ", "SU", "YU", "CS", "DD", "BU", "TP", "ZR", "AN", "NT", "QU"]);

export const COUNTRY_CODES: string[] = (() => {
  const out: string[] = [];
  const A = "A".charCodeAt(0);
  for (let i = 0; i < 26; i++)
    for (let j = 0; j < 26; j++) {
      const code = String.fromCharCode(A + i, A + j);
      if (UNINHABITED.has(code) || NOT_COUNTRIES.has(code) || code === "XK") continue;
      let name: string | undefined;
      try {
        name = displayNames.of(code);
      } catch {
        name = undefined;
      }
      if (name && name !== code && !/unknown/i.test(name)) out.push(code);
    }
  out.push("XK");
  return out;
})();

export function countryName(code: string): string {
  try {
    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}

// Spellings seen in feeds → ISO code. Case-insensitive unless listed in SHORT_ALIASES.
const EXTRA_ALIASES: Record<string, string> = {
  "united states of america": "US",
  "united states": "US",
  usa: "US",
  "u.s.a.": "US",
  "u.s.": "US",
  "united kingdom": "GB",
  "great britain": "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  "northern ireland": "GB",
  "ivory coast": "CI",
  "cote d'ivoire": "CI",
  "côte d'ivoire": "CI",
  "democratic republic of the congo": "CD",
  "congo, the democratic republic of the": "CD",
  "dr congo": "CD",
  "republic of the congo": "CG",
  "south korea": "KR",
  "korea, republic of": "KR",
  "north korea": "KP",
  russia: "RU",
  "russian federation": "RU",
  vietnam: "VN",
  "viet nam": "VN",
  turkey: "TR",
  türkiye: "TR",
  turkiye: "TR",
  "czech republic": "CZ",
  czechia: "CZ",
  "united arab emirates": "AE",
  holland: "NL",
  "the netherlands": "NL",
  "palestine, state of": "PS",
  palestine: "PS",
  "syrian arab republic": "SY",
  "iran, islamic republic of": "IR",
  macedonia: "MK",
  "north macedonia": "MK",
  "hong kong": "HK",
  "hong kong sar": "HK",
  macau: "MO",
  taiwan: "TW",
  "moldova, republic of": "MD",
  "tanzania, united republic of": "TZ",
  bolivia: "BO",
  "bolivia, plurinational state of": "BO",
  venezuela: "VE",
  "venezuela, bolivarian republic of": "VE",
  laos: "LA",
  "lao people's democratic republic": "LA",
  eswatini: "SZ",
  swaziland: "SZ",
  "cape verde": "CV",
  "cabo verde": "CV",
  burma: "MM",
  "east timor": "TL",
  "timor-leste": "TL",
  "the bahamas": "BS",
  "the gambia": "GM",
  "puerto rico": "PR",
  kosovo: "XK",
  "vatican city": "VA",
  "holy see (vatican city state)": "VA",
  curacao: "CW",
  "curaçao": "CW",
  "saint martin (french part)": "MF",
  "sint maarten (dutch part)": "SX",
  "micronesia, federated states of": "FM",
  "virgin islands, u.s.": "VI",
  "virgin islands, british": "VG",
  "saint helena, ascension and tristan da cunha": "SH",
  "brunei darussalam": "BN",
};

// Case-sensitive short forms (so the pronoun "us" never matches).
const SHORT_ALIASES: Record<string, string> = {
  US: "US",
  USA: "US",
  "U.S.": "US",
  "U.S.A.": "US",
  UK: "GB",
  "U.K.": "GB",
  UAE: "AE",
  DRC: "CD",
  KSA: "SA",
  CAN: "CA",
  MEX: "MX",
  NYC: "US",
  SF: "US",
};

// States, provinces and big cities that pin a country (common in ATS location fields).
// "Georgia" is left out: it is also a country.
const PLACES: Record<string, string[]> = {
  US: [
    "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut", "delaware", "florida", "hawaii",
    "idaho", "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana", "maine", "maryland", "massachusetts",
    "michigan", "minnesota", "mississippi", "missouri", "montana", "nebraska", "nevada", "new hampshire", "new jersey",
    "new mexico", "new york", "north carolina", "north dakota", "ohio", "oklahoma", "oregon", "pennsylvania",
    "rhode island", "south carolina", "south dakota", "tennessee", "texas", "utah", "vermont", "virginia", "washington",
    "west virginia", "wisconsin", "wyoming", "district of columbia", "washington d.c.", "san francisco", "bay area",
    "los angeles", "seattle", "chicago", "boston", "austin", "atlanta", "denver", "miami", "dallas", "houston",
    "philadelphia", "pittsburgh", "san diego", "portland", "salt lake city", "raleigh", "charlotte", "ann arbor",
    "boulder", "scottsdale", "nashville", "phoenix", "minneapolis", "detroit",
  ],
  CA: [
    "ontario", "quebec", "québec", "british columbia", "alberta", "manitoba", "saskatchewan", "nova scotia",
    "new brunswick", "newfoundland", "toronto", "montreal", "montréal", "vancouver", "calgary", "ottawa", "waterloo",
    "edmonton", "victoria (canada)", "winnipeg",
  ],
  GB: ["london", "manchester", "edinburgh", "glasgow", "cambridge", "oxford", "bristol", "leeds", "birmingham", "cardiff", "belfast"],
  IE: ["dublin", "cork"],
  DE: ["berlin", "munich", "münchen", "hamburg", "frankfurt", "cologne", "stuttgart"],
  FR: ["paris", "lyon"],
  NL: ["amsterdam", "rotterdam"],
  SE: ["stockholm", "gothenburg"],
  ES: ["madrid", "barcelona"],
  PT: ["lisbon", "porto"],
  IN: ["bangalore", "bengaluru", "hyderabad", "mumbai", "pune", "chennai", "new delhi", "gurgaon", "gurugram", "noida"],
  AU: ["sydney", "melbourne", "brisbane", "perth"],
  BR: ["são paulo", "sao paulo", "rio de janeiro"],
  JP: ["tokyo", "osaka"],
  IL: ["tel aviv"],
  NG: ["lagos", "abuja"],
  KE: ["nairobi"],
  ZA: ["cape town", "johannesburg"],
  MX: ["mexico city", "guadalajara"],
  AR: ["buenos aires"],
  CO: ["bogotá", "bogota", "medellín", "medellin"],
};

const NAME_TO_CODE = new Map<string, string>();
for (const [code, places] of Object.entries(PLACES)) for (const p of places) NAME_TO_CODE.set(p, code);
for (const code of COUNTRY_CODES) NAME_TO_CODE.set(countryName(code).toLowerCase(), code);
for (const [k, v] of Object.entries(EXTRA_ALIASES)) NAME_TO_CODE.set(k, v);

/** Resolve a country name, alias or ISO code to ISO alpha-2, or null. */
export function toCountryCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim();
  if (/^[A-Z]{2}$/.test(s) && COUNTRY_CODES.includes(s)) return s;
  if (SHORT_ALIASES[s]) return SHORT_ALIASES[s];
  return NAME_TO_CODE.get(s.toLowerCase()) ?? null;
}

// ---------- Regions ----------
const AFRICA = "DZ AO BJ BW BF BI CV CM CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU YT MA MZ NA NE NG RE RW SH ST SN SC SL SO ZA SS SD TZ TG TN UG EH ZM ZW".split(" ");
const EU = "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split(" ");
const EUROPE = [...EU, ..."AL AD BY BA FO GI GG IS IM JE XK LI MD MC ME MK NO RU SM RS CH UA GB VA AX".split(" ")];
const MIDDLE_EAST = "AE BH IL IQ IR JO KW LB OM PS QA SA SY TR YE".split(" ");
const NORTH_AMERICA = "US CA MX".split(" ");
const LATAM = "MX GT BZ SV HN NI CR PA CU DO HT JM TT BS BB PR CO VE EC PE BO CL AR UY PY BR GY SR".split(" ");
const OCEANIA = "AU NZ PG FJ SB VU WS TO KI FM MH PW NR TV".split(" ");
const ASIA = "CN JP KR KP TW HK MO MN IN PK BD LK NP BT MV AF SG MY ID TH VN PH KH LA MM BN TL KZ KG TJ TM UZ".split(" ");

export const REGIONS: Record<string, { label: string; countries: string[] }> = {
  AFRICA: { label: "Africa", countries: AFRICA },
  EU: { label: "European Union", countries: EU },
  EUROPE: { label: "Europe", countries: EUROPE },
  MIDDLE_EAST: { label: "Middle East", countries: MIDDLE_EAST },
  EMEA: { label: "EMEA", countries: [...new Set([...EUROPE, ...MIDDLE_EAST, ...AFRICA])] },
  NORTH_AMERICA: { label: "North America", countries: NORTH_AMERICA },
  LATAM: { label: "Latin America", countries: LATAM },
  AMERICAS: { label: "Americas", countries: [...new Set([...NORTH_AMERICA, ...LATAM])] },
  ASIA: { label: "Asia", countries: ASIA },
  OCEANIA: { label: "Oceania", countries: OCEANIA },
  APAC: { label: "APAC", countries: [...new Set([...ASIA.filter((c) => !["KZ", "KG", "TJ", "TM", "UZ", "AF"].includes(c)), ...OCEANIA])] },
};

/** Phrases → region code. Order matters: longer phrases first. */
export const REGION_PHRASES: [RegExp, string][] = [
  [/\bsub[- ]saharan africa\b/i, "AFRICA"],
  [/\bafrica(n)?\b/i, "AFRICA"],
  [/\bemea\b/i, "EMEA"],
  [/\b(european union|\bEU\b|eu[- ]based)\b/i, "EU"],
  [/\beurope(an)?\b(?!\s+union)/i, "EUROPE"],
  [/\bmiddle east\b|\bmena\b/i, "MIDDLE_EAST"],
  [/\blatin america\b|\blatam\b|\bsouth america\b|\bcentral america\b/i, "LATAM"],
  [/\bnorth america(n)?\b|\bnamer\b|\bnoram\b/i, "NORTH_AMERICA"],
  [/\bthe americas\b|\bamericas\b|\bamer\b/i, "AMERICAS"],
  [/\bapac\b|\basia[- ]pacific\b/i, "APAC"],
  [/\basia\b/i, "ASIA"],
  [/\boceania\b|\banz\b/i, "OCEANIA"],
];

export function regionsOf(country: string): string[] {
  return Object.entries(REGIONS)
    .filter(([, r]) => r.countries.includes(country))
    .map(([k]) => k);
}

export function expandRegions(regions: string[]): Set<string> {
  const s = new Set<string>();
  for (const r of regions) for (const c of REGIONS[r]?.countries ?? []) s.add(c);
  return s;
}

// ---------- Sanctions overlay (ELIG-06). Not legal advice. ----------
export const SANCTIONED_COMPREHENSIVE = new Set(["CU", "IR", "KP"]); // + Crimea/DNR/LNR (subdivisions)
export const COMMONLY_UNSUPPORTED = new Set(["RU", "BY", "VE", "AF", "MM", "IQ", "HN", "SY"]);

// ---------- Text matching ----------
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const longNames = [...NAME_TO_CODE.keys()].filter((n) => n.length >= 4).sort((a, b) => b.length - a.length);
const LONG_RE = new RegExp(`(?<![\\p{L}])(${longNames.map(escapeRe).join("|")})(?![\\p{L}])`, "giu");
const SHORT_RE = /(?<![A-Za-z.])(U\.S\.A\.|U\.S\.|U\.K\.|USA|UAE|DRC|KSA|CAN|MEX|NYC|SF|US|UK)(?![A-Za-z])/g;

/** Find country codes mentioned in free text. */
export function findCountries(text: string): string[] {
  const found = new Set<string>();
  // Region phrases like "Latin America" / "North America" must not yield "America".
  // US time-zone names ("U.S. Pacific Time") are time zones, not a country restriction.
  const masked = text
    .replace(/\b(north|south|central|latin)\s+america\b|\bamericas\b/gi, " ")
    .replace(/(U\.S\.|US|USA)\s+(pacific|eastern|central|mountain)\b/gi, " ");
  for (const m of masked.matchAll(LONG_RE)) {
    const code = NAME_TO_CODE.get(m[1].toLowerCase());
    if (code) found.add(code);
  }
  for (const m of masked.matchAll(SHORT_RE)) {
    const code = SHORT_ALIASES[m[1]];
    if (code) found.add(code);
  }
  // "Georgia" and "Jersey" are usually US states / New Jersey in job posts.
  if (/\b(atlanta|savannah),?\s+georgia\b|\bgeorgia,?\s+(usa|us)\b/i.test(text)) found.delete("GE");
  if (/\bnew jersey\b/i.test(text)) found.delete("JE");
  return [...found];
}

export function findRegions(text: string): string[] {
  const out = new Set<string>();
  for (const [re, code] of REGION_PHRASES) if (re.test(text)) out.add(code);
  // "Europe" inside "EMEA" etc. is fine; drop ASIA if APAC present.
  if (out.has("APAC")) out.delete("ASIA");
  if (out.has("EMEA")) {
    out.delete("EUROPE");
    out.delete("MIDDLE_EAST");
    out.delete("AFRICA");
  }
  return [...out];
}
