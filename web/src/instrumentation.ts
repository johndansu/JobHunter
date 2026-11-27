export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // The mail worker sends approved, queued emails at their slot; off only with MAIL_WORKER=off.
  if (process.env.MAIL_WORKER !== "off") {
    const { startMailWorker } = await import("./server/outbox");
    startMailWorker();
  }
  // Background job ingestion for local use; off unless INGEST_SCHEDULER=on.
  if (process.env.INGEST_SCHEDULER !== "on") return;
  const { startScheduler } = await import("./server/ingest/scheduler");
  await startScheduler();
}
