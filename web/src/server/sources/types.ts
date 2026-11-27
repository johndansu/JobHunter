import type { Salary } from "../lib/salary";

/** A job as one source describes it, before cleanup and clustering. */
export type RawPosting = {
  sourceId: string;
  board: string | null; // ATS board token, or null for feeds
  sourceJobId: string;
  url: string; // listing page on the source (the "via" link)
  applyUrl: string; // exactly as the source gave it
  title: string;
  company: string;
  companyDomain?: string | null;
  descriptionHtml: string;
  locationText?: string | null; // board label, e.g. "US Only"
  fieldCountries?: (string | null | undefined)[];
  fieldRegions?: string[];
  fieldWorldwide?: boolean;
  fieldTzOffsetsHours?: number[];
  fieldEvidence?: string;
  categoryHints?: string[];
  seniorityHints?: string[];
  employmentType?: string | string[] | null;
  salary?: Salary | null;
  postedAt?: Date | null;
  expiresAt?: Date | null;
  raw: unknown;
};

export type Batch = {
  board: string | null;
  postings: RawPosting[];
  /** True when this batch is the complete list of live jobs for the board (enables closure-by-absence). */
  complete: boolean;
  /** Jobs the source returned that aren't remote (skipped, counted for health stats). */
  skipped?: number;
};

export type FetchContext = { log: (msg: string) => void; country: string; stats: { requests: number } };

export type SourceAdapter = {
  id: string;
  name: string;
  homepage: string;
  /** Visible credit shown on every job from this source (compliance profile, §6.3). */
  attribution: { text: string; url: string };
  isEmployerAts: boolean;
  atsName?: string;
  /** Default hours between runs for the in-process scheduler. */
  everyHours: number;
  fetch(ctx: FetchContext): AsyncGenerator<Batch>;
  /**
   * For feeds that aren't complete lists: ask the source about stored postings
   * we didn't see this run. Returns the sourceJobIds it confirms are closed.
   * Unknown or failed checks must not be returned (REC-02).
   */
  closeCheck?(ctx: FetchContext, postings: { sourceJobId: string; url: string }[]): Promise<string[]>;
};
