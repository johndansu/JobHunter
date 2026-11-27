import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  real,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { CvParse } from "../lib/cv";
import type { OtherProfile } from "../lib/consistency";
import type { Eligibility } from "../lib/eligibility";
import type { Checklist } from "../lib/match";
import type { Profile } from "../lib/profile";
import type { Requirements } from "../lib/requirements";
import type { TrustLabel } from "../lib/trust";
import type { Evidence } from "../lib/tailor";
import type { DocChecks, Preflight } from "../applications";

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
    requirements: jsonb("requirements").$type<Requirements>(), // RANK-01, extracted at ingest
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

/** The owner's private profile (single row, id = 1). Versioned so matches know what they were computed from. */
export const profiles = pgTable("profiles", {
  id: integer("id").primaryKey(),
  version: integer("version").notNull().default(1),
  data: jsonb("data").$type<Profile>().notNull(),
  cv: jsonb("cv").$type<(CvParse & { fileName: string; uploadedAt: string; text: string }) | null>(),
  // The candidate's own profile export (e.g. LinkedIn data export) for the consistency check (DOC-13). Name, roles, education only.
  otherProfile: jsonb("other_profile").$type<(OtherProfile & { uploadedAt: string }) | null>(),
  updatedAt: tz("updated_at").notNull().defaultNow(),
});

/** Scored matches for the current profile (recomputed after profile edits and ingest runs). */
export const matches = pgTable(
  "matches",
  {
    jobId: integer("job_id").primaryKey(),
    profileVersion: integer("profile_version").notNull(),
    fit: real("fit").notNull(),
    band: text("band").notNull(), // strong|good|stretch|unlikely
    bandScore: real("band_score").notNull(),
    halfLife: integer("half_life").notNull(),
    verdict: text("verdict").notNull(), // for the profile's country/time zone/shift
    verdictReason: text("verdict_reason"),
    checklist: jsonb("checklist").$type<Checklist>().notNull(),
    computedAt: tz("computed_at").notNull().defaultNow(),
  },
  (t) => [index("matches_band_idx").on(t.band), index("matches_verdict_idx").on(t.verdict)],
);

/** Jobs the owner said "not interested" to. */
export const dismissals = pgTable("dismissals", {
  jobId: integer("job_id").primaryKey(),
  createdAt: tz("created_at").notNull().defaultNow(),
});

/**
 * One application per job (AFT-01). Stage history and the candidate's choices
 * (e.g. AI opt-out, AUTH-08) go to application_events.
 */
export const applications = pgTable(
  "applications",
  {
    id: serial("id").primaryKey(),
    jobId: integer("job_id"), // null for speculative applications (no posting)
    // Speculative applications (MAIL-19): the company, the role area, and the page that publishes the address.
    specCompany: text("spec_company"),
    specRole: text("spec_role"),
    specDomain: text("spec_domain"),
    specSourceUrl: text("spec_source_url"),
    specSourceText: text("spec_source_text"),
    // saved|applied|screening|interviewing|offer|accepted|declined|rejected|withdrawn|no_response
    stage: text("stage").notNull().default("saved"),
    stageAt: tz("stage_at").notNull().defaultNow(),
    channel: text("channel").notNull().default("web_form"), // web_form|email|speculative
    appliedAt: tz("applied_at"),
    notes: text("notes").notNull().default(""),
    preflight: jsonb("preflight").$type<Preflight>(),
    evidence: jsonb("evidence").$type<Evidence[]>().notNull().default([]),
    aiOptOut: text("ai_opt_out"), // null (not decided) | opted_out | stayed_in
    createdAt: tz("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("applications_job_uq").on(t.jobId), index("applications_stage_idx").on(t.stage)],
);

/** The tailored documents for an application. One row per kind; edits bump the version and reset approval. */
export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id").notNull(),
    kind: text("kind").notNull(), // cv|letter
    version: integer("version").notNull().default(1),
    content: text("content").notNull(),
    generated: text("generated").notNull(), // the app's draft, before the candidate's edits
    checks: jsonb("checks").$type<DocChecks>(),
    approvedAt: tz("approved_at"),
    approvedHash: text("approved_hash"),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("documents_app_kind_uq").on(t.applicationId, t.kind)],
);

export const applicationEvents = pgTable(
  "application_events",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id").notNull(),
    at: tz("at").notNull().defaultNow(),
    kind: text("kind").notNull(), // created|stage|edit|approve|download|preflight|ai_opt_out|note
    detail: text("detail").notNull().default(""),
  },
  (t) => [index("application_events_app_idx").on(t.applicationId)],
);

/** The connected Gmail account (single row, id = 1). The credential is encrypted at rest (MAIL-05). */
export const mailAccount = pgTable("mail_account", {
  id: integer("id").primaryKey(),
  method: text("method").$type<"gmail_oauth" | "gmail_app_password">().notNull(),
  email: text("email").notNull(),
  name: text("name"),
  secret: text("secret").notNull(), // encrypted refresh token or app password
  scopes: text("scopes").notNull().default(""),
  replyDetection: boolean("reply_detection").notNull().default(false),
  connectedAt: tz("connected_at").notNull().defaultNow(),
  lastOkAt: tz("last_ok_at"),
  lastError: text("last_error"),
  lastErrorAt: tz("last_error_at"),
});

/**
 * Every email: draft → queued → sent (or failed/cancelled). The MIME message is
 * built and hashed at approval; the worker sends only if the hash still matches
 * (MAIL-07, MAIL-15).
 */
export const outbox = pgTable(
  "outbox",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id"), // null for a test to yourself
    kind: text("kind").notNull(), // application | speculative | follow_up | test
    status: text("status").notNull().default("draft"), // draft | queued | sending | sent | failed | cancelled
    toAddr: text("to_addr").notNull().default(""),
    toSource: jsonb("to_source").$type<{ kind: "posting" | "company_site" | "self" | "thread"; url: string | null; quote: string | null; capturedAt: string }>(),
    overrides: jsonb("overrides").$type<string[]>().notNull().default([]),
    subject: text("subject").notNull().default(""),
    body: text("body").notNull().default(""),
    attach: jsonb("attach").$type<{ cv: "pdf" | "docx" | null; letter: "pdf" | "docx" | null }>().notNull().default({ cv: "pdf", letter: null }),
    mime: text("mime"),
    mimeHash: text("mime_hash"),
    cvHash: text("cv_hash"),
    messageId: text("message_id"),
    inReplyTo: text("in_reply_to"),
    threadId: text("thread_id"), // Gmail thread id
    providerId: text("provider_id"), // Gmail message id
    approvedAt: tz("approved_at"),
    sendAt: tz("send_at"),
    sentAt: tz("sent_at"),
    error: text("error"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: tz("created_at").notNull().defaultNow(),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [index("outbox_app_idx").on(t.applicationId), index("outbox_status_idx").on(t.status)],
);

/** Replies noticed in threads JobHunter sent (MAIL-16): sender domain, time and a category only; never bodies. */
export const replyEvents = pgTable(
  "reply_events",
  {
    id: serial("id").primaryKey(),
    applicationId: integer("application_id").notNull(),
    outboxId: integer("outbox_id"),
    providerMessageId: text("provider_message_id"),
    at: tz("at").notNull().defaultNow(),
    senderDomain: text("sender_domain"),
    category: text("category").notNull(), // auto_reply | reply | interview | rejection | info | other
    source: text("source").notNull().default("manual"), // manual | detected
    status: text("status").notNull().default("proposed"), // proposed | confirmed | dismissed
  },
  (t) => [uniqueIndex("reply_events_msg_uq").on(t.providerMessageId), index("reply_events_app_idx").on(t.applicationId)],
);

export type Job = typeof jobs.$inferSelect;
export type OutboxRow = typeof outbox.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type DocRow = typeof documents.$inferSelect;
export type Posting = typeof postings.$inferSelect;
