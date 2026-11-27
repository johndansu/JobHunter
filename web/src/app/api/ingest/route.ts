import { runSource, isRunning } from "@/server/ingest/run";
import { sourceById } from "@/server/sources";

/**
 * Start an ingest run for one source. Allowed from localhost, or with
 * `Authorization: Bearer $INGEST_SECRET` (for a cron job when deployed).
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const host = url.hostname;
  const secret = process.env.INGEST_SECRET;
  const local = host === "localhost" || host === "127.0.0.1";
  if (!local && (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)) {
    return new Response("Forbidden", { status: 403 });
  }
  const adapter = sourceById(url.searchParams.get("source") ?? "");
  if (!adapter) return new Response("Unknown source", { status: 400 });
  if (!isRunning(adapter.id)) {
    // Fire and forget; progress shows on /sources.
    void runSource(adapter).catch((e) => console.error(e));
  }
  return Response.redirect(new URL("/sources", url), 303);
}
