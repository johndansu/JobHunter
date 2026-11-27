import { db } from "../db";
import { sources } from "../db/schema";
import { SOURCES } from "../sources";
import { isRunning, runSource } from "./run";

const g = globalThis as unknown as { __jhScheduler?: boolean };

/**
 * In-process scheduler for local use (§17.3). Each source runs on its own cadence
 * with ±10% jitter; a source that ran recently waits until it's due. Never overlaps
 * runs of the same source. When deployed, use a cron job calling POST /api/ingest instead.
 */
export async function startScheduler() {
  if (g.__jhScheduler) return;
  g.__jhScheduler = true;
  const last = new Map((await db.select({ id: sources.id, at: sources.lastRunAt }).from(sources)).map((r) => [r.id, r.at]));
  SOURCES.forEach((s, i) => {
    const every = s.everyHours * 3600_000;
    const jitter = () => every * (0.9 + Math.random() * 0.2);
    const tick = async () => {
      if (!isRunning(s.id)) {
        try {
          const r = await runSource(s, (m) => console.log(`[scheduler] ${m}`));
          console.log(`[scheduler] ${s.id}: ${r.ok ? "ok" : "failed"} · ${r.fetched} fetched, ${r.created} new, ${r.closed} closed`);
        } catch (e) {
          console.error(`[scheduler] ${s.id}:`, e);
        }
      }
      setTimeout(tick, jitter());
    };
    const lastAt = last.get(s.id)?.getTime() ?? 0;
    const due = Math.max(0, lastAt + every - Date.now());
    // Stagger first runs so sources don't all start at once.
    setTimeout(tick, due + 60_000 * (i + 1));
  });
  console.log(`[scheduler] started for ${SOURCES.length} sources`);
}
