export async function register() {
  // Background job ingestion for local use; off unless INGEST_SCHEDULER=on.
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.INGEST_SCHEDULER !== "on") return;
  const { startScheduler } = await import("./server/ingest/scheduler");
  await startScheduler();
}
