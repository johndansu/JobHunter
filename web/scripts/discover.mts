/**
 * Find employers' own Greenhouse / Lever / Ashby boards for companies seen in the feeds.
 * `npm run discover` (100 companies) or `npm run discover -- 300`.
 */
import "dotenv/config";

const limit = Number(process.argv[2]) || 100;
const { discoverBoards } = await import("../src/server/ingest/discover");
const { client } = await import("../src/server/db");
const r = await discoverBoards({ limit });
console.log(`tried ${r.tried} companies, found ${r.found.length} new boards`);
await client.end();
