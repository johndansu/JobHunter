/**
 * Command-line ingest: `npm run ingest` (all sources) or `npm run ingest -- himalayas remoteok`.
 * Loads web/.env before importing the database module.
 */
import "dotenv/config";

const ids = process.argv.slice(2);
const { runAll } = await import("../src/server/ingest/run");
const { client } = await import("../src/server/db");
const results = await runAll(ids);
console.table(results.map(({ source, ok, requests, fetched, created, updated, closed, skipped, seconds, error }) => ({ source, ok, requests, fetched, created, updated, closed, skipped, seconds, error: error ?? "" })));
await client.end();
