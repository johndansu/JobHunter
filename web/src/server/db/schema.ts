import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { Eligibility } from "../lib/eligibility";
import type { TrustLabel } from "../lib/trust";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

const tz = (name: string) => timestamp(name, { withTimezone: true });

/** One row per job source (feed or employer ATS board family). */
export const sources = pgTable("sources", {
  id: text("id").primaryKey(), // e.g. "himalayas", "greenhouse"
  name: text("name").notNull(),
  homepage: text("homepage").notNull(),
  lastRunAt: tz("last_run_at"),
  lastOk: boolean("last_ok"),
  lastFetched: integer("last_fetched"),
  lastError: text("last_error"),
});

/** Every ingest run per source, for the source-health panel. */
export const ingestRuns = pgTable("ingest_runs", {
  id: serial("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  startedAt: tz("started_at").notNull().defaultNow(),
  finishedAt: tz("finished_at"),
  ok: boolean("ok"),
  requests: integer("requests").notNull().default(0),
  fetched: integer("fetched").notNull().default(0),
  created: integer("created").notNull().default(0),
  updated: integer("updated").notNull().default(0),
  closed: integer("closed").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  error: text("error"),
});

/**
 * Canonical job = one duplicate cluster. Postings from several sources can
 * point at the same job; the card prefers the employer's own ATS posting.
 */
export const jobs = pgTable(
  "jobs",
  {
    id: serial("id").primaryKey(),
    clusterKey: text("cluster_key").notNull(),
    matchKey: text("match_key").notNull(), // normalised company|title
    title: text("title").notNull(),
    company: text("company").notNull(),
    companyDomain: text("company_domain"),
    category: text("category").notNull(),
    seniority: text("seniority"),
    employmentType: text("employment_type"),
    engagement: text("engagement").notNull().default("unknown"), // employee|contractor|unknown
    descriptionHtml: text("description_html").notNull().default(""),
    descriptionText: text("description_text").notNull().default(""),
    locationText: text("location_text"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    salaryCurrency: text("salary_currency"),
    salaryPeriod: text("salary_period"),
    eligibility: jsonb("eligibility").$type<Eligibility>().notNull(),
    trust: jsonb("trust").$type<TrustLabel[]>().notNull().default([]),
    // Verdict for the default viewer (DEFAULT_COUNTRY / DEFAULT_TIMEZONE), precomputed for fast filtering.
    verdict: text("verdict").notNull().default("unclear"),
    verdictReason: text("verdict_reason"),
    verdictQuote: text("verdict_quote"),
    verdictNote: text("verdict_note"),
    overlap: jsonb("overlap").$type<{ min: number; max: number; anchor: string } | null>(),
    canonicalPostingId: integer("canonical_posting_id"),
    canonicalSource: text("canonical_source").notNull(),
    applyUrl: text("apply_url").notNull(),
    sourcePostedAt: tz("source_posted_at"),
    firstSeen: tz("first_seen").notNull().defaultNow(),
    lastSeen: tz("last_seen").notNull().defaultNow(),
    lastChecked: tz("last_checked"),
    expiresAt: tz("expires_at"),
    closedAt: tz("closed_at"),
    status: text("status").notNull().default("live"), // live|closed
    repostCount: integer("repost_count").notNull().default(0), // same source re-posted the role under a new id
    reopenedAt: tz("reopened_at"), // came back >14 days after a confirmed closure
    search: tsvector("search").generatedAlwaysAs(
      sql`setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(company, '')), 'B') || setweight(to_tsvector('english', coalesce(left(description_text, 20000), '')), 'C')`,
    ),
  },
  (t) => [
    uniqueIndex("jobs_cluster_key_uq").on(t.clusterKey),
    index("jobs_match_key_idx").on(t.matchKey),
    index("jobs_status_idx").on(t.status),
    index("jobs_category_idx").on(t.category),
    index("jobs_verdict_idx").on(t.verdict),
    index("jobs_search_idx").using("gin", t.search),
  ],
);

/** Raw record from one source. Apply URL is stored exactly as the source gave it. */
export const postings = pgTable(
  "postings",
  {
    id: serial("id").primaryKey(),
    sourceId: text("source_id").notNull(),
    board: text("board").notNull().default(""), // ATS board token; "" for feeds (NULLs would defeat the unique index)
    sourceJobId: text("source_job_id").notNull(),
    jobId: integer("job_id").notNull(),
    url: text("url").notNull(), // listing page on the source
    applyUrl: text("apply_url").notNull(), // unchanged, per source terms
    title: text("title").notNull(),
    company: text("company").notNull(),
    raw: jsonb("raw").notNull(),
    sourcePostedAt: tz("source_posted_at"),
    expiresAt: tz("expires_at"),
    firstSeen: tz("first_seen").notNull().defaultNow(),
    lastSeen: tz("last_seen").notNull().defaultNow(),
    missedFetches: integer("missed_fetches").notNull().default(0),
    closedAt: tz("closed_at"),
  },
  (t) => [
    uniqueIndex("postings_source_job_uq").on(t.sourceId, t.board, t.sourceJobId),
    index("postings_job_idx").on(t.jobId),
  ],
);

/** Employer ATS boards we poll: hand-checked seeds plus ones discovered and validated (§6.2). */
export const atsBoards = pgTable(
  "ats_boards",
  {
    id: serial("id").primaryKey(),
    ats: text("ats").notNull(), // greenhouse|lever|ashby
    token: text("token").notNull(),
    name: text("name").notNull(),
    origin: text("origin").notNull(), // seed|discovered
    evidence: text("evidence"), // why we believe the board belongs to this company
    active: boolean("active").notNull().default(true),
    jobs: integer("jobs"),
    validatedAt: tz("validated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ats_boards_uq").on(t.ats, t.token)],
);

/** Company names we already tried to match to a board (so discovery doesn't repeat itself). */
export const boardProbes = pgTable("board_probes", {
  nameKey: text("name_key").primaryKey(),
  triedAt: tz("tried_at").notNull().defaultNow(),
  found: boolean("found").notNull().default(false),
});

export type Job = typeof jobs.$inferSelect;
export type Posting = typeof postings.$inferSelect;
