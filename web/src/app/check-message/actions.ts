"use server";

import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { jobs } from "@/server/db/schema";
import { normCompany } from "@/server/lib/normalize";
import { classifyMessage, domainOf, type MessageCheck } from "@/server/lib/preflight";

export type CheckResult = (MessageCheck & { company: string | null; companyDomain: string | null; liveJobs: { id: number; title: string }[]; searched: boolean }) | null;

/** Inbound message checker (TRUST-07). Runs locally; nothing is sent anywhere. */
export async function checkMessageAction(_prev: CheckResult, formData: FormData): Promise<CheckResult> {
  const text = String(formData.get("text") ?? "").slice(0, 20000);
  const sender = String(formData.get("sender") ?? "").trim() || null;
  const company = String(formData.get("company") ?? "").trim() || null;
  let companyDomain = domainOf(String(formData.get("website") ?? "")) ?? null;
  let liveJobs: { id: number; title: string }[] = [];
  if (company) {
    const key = normCompany(company);
    const byCompany = sql`split_part(${jobs.matchKey}, '|', 1) = ${key}`;
    if (!companyDomain) {
      const [d] = await db.select({ d: jobs.companyDomain }).from(jobs).where(and(byCompany, isNotNull(jobs.companyDomain))).limit(1);
      companyDomain = d?.d ?? null;
    }
    liveJobs = await db.select({ id: jobs.id, title: jobs.title }).from(jobs).where(and(byCompany, eq(jobs.status, "live"))).limit(8);
  }
  if (!text.trim()) return null;
  return { ...classifyMessage({ text, sender, company, companyDomain }), company, companyDomain, liveJobs, searched: !!company };
}
