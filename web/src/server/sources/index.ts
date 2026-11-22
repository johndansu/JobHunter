import { ashby, greenhouse, lever } from "./ats";
import { himalayas, jobicy, remotejobs, remoteok } from "./feeds";
import type { SourceAdapter } from "./types";

/** Tier-1 sources (decisions §6.1). USAJOBS is omitted: the owner isn't US-authorized. */
export const SOURCES: SourceAdapter[] = [greenhouse, lever, ashby, himalayas, remotejobs, jobicy, remoteok];

export const sourceById = (id: string) => SOURCES.find((s) => s.id === id);

/** When the same job comes from several sources, the card prefers this order (employer ATS first). */
export const PRECEDENCE = ["greenhouse", "lever", "ashby", "remotejobs", "himalayas", "jobicy", "remoteok"];
export const isEmployerSource = (id: string) => ["greenhouse", "lever", "ashby"].includes(id);
