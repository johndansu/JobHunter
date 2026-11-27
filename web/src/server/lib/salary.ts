export type Salary = {
  min: number | null;
  max: number | null;
  currency: string | null;
  period: "year" | "month" | "week" | "day" | "hour" | null;
};

/** Normalise a period word from any source ("annual", "1 YEAR", "hourly"…). */
export function normalizePeriod(p: string | null | undefined): Salary["period"] {
  if (!p) return null;
  const s = p.toLowerCase();
  if (/year|annual|yr/.test(s)) return "year";
  if (/month|mo\b/.test(s)) return "month";
  if (/week|wk/.test(s)) return "week";
  if (/day|daily/.test(s)) return "day";
  if (/hour|hr/.test(s)) return "hour";
  return null;
}

/**
 * Only structured pay fields or an explicit range count as "salary listed" (REC-10).
 * Amounts are never annualised or converted here; the original is kept.
 */
export function makeSalary(
  min: unknown,
  max: unknown,
  currency: unknown,
  period: unknown,
): Salary | null {
  const n = (v: unknown) => {
    const x = typeof v === "string" ? Number(v.replace(/[^0-9.]/g, "")) : typeof v === "number" ? v : NaN;
    return Number.isFinite(x) && x > 0 ? Math.round(x) : null;
  };
  const lo = n(min);
  const hi = n(max);
  if (lo == null && hi == null) return null;
  const cur = typeof currency === "string" && /^[A-Za-z]{3}$/.test(currency.trim()) ? currency.trim().toUpperCase() : null;
  return {
    min: lo,
    max: hi != null && lo != null && hi < lo ? lo : hi,
    currency: cur,
    period: normalizePeriod(typeof period === "string" ? period : null),
  };
}

const SYMBOL: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$", NGN: "₦" };

export function formatSalary(s: Pick<Salary, "min" | "max" | "currency" | "period">): string | null {
  if (s.min == null && s.max == null) return null;
  const sym = s.currency ? (SYMBOL[s.currency] ?? `${s.currency} `) : "";
  const f = (v: number) => (v >= 10000 ? `${Math.round(v / 1000)}k` : v.toLocaleString("en-US"));
  const range = s.min != null && s.max != null && s.max !== s.min ? `${sym}${f(s.min)}–${sym}${f(s.max)}` : `${sym}${f((s.min ?? s.max)!)}`;
  const per = s.period ? ` / ${s.period}` : "";
  return range + per;
}
