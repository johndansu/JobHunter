# JobHunter v2 (web)

Remote jobs in every category, filtered to the ones open to your country, with the evidence behind every verdict.
Phase 1 of the v2 plan: jobs in, cleaned, de-duplicated, labelled and searchable.

## Run it locally

Needs Node 22+ and Docker Desktop.

```bash
cp .env.example .env      # defaults: Nigeria / Africa/Lagos, database on port 5440
npm install
npm run db:up             # Postgres 17 (+pgvector) in Docker
npm run db:push           # create tables
npm run ingest            # pull every source once (Himalayas and RemoteJobs.org are paced, so ~30–60 min)
npm run dev               # http://localhost:3000
```

With `INGEST_SCHEDULER=on` in `.env`, the running app keeps pulling sources on their own cadence. Don't run `npm run ingest` at the same time.

Other commands: `npm test` (engine + 260 real location labels), `npm run typecheck`, `npm run ingest -- greenhouse remoteok` (selected sources), `npm run retrust` (recompute trust labels after a rule change).

## Where jobs come from

| Source | How | Terms we follow |
|---|---|---|
| Himalayas | Public API: every job open to your country, plus the 2,000 most recently updated | Apply uses `applicationLink` unchanged; visible credit; no onward syndication or JobPosting markup; expired jobs removed |
| RemoteJobs.org | Public API (country-eligible + newest) | "Powered by RemoteJobs.org" link; apply link intact; under 200 requests/hour |
| Jobicy | Public API | Credit with a link; Apply goes to the original URL; at most hourly |
| Remote OK | Public API (latest ~100) | Followed link back to the job on Remote OK; name "Remote OK"; no logo |
| Greenhouse, Lever, Ashby | Employers' own public job boards (`src/server/sources/ats.ts`) | Apply on the employer's page; respect unlisted jobs |

No scraping. Requests send `USER_AGENT` (default `JobHunter/2.0`) and no personal details.

## How it decides

- **Eligibility** (`src/server/lib/eligibility.ts`): description text overrides structured fields, which override board labels; an empty location is "unclear", never worldwide. Time-zone overlap is computed on real dates (`timezone.ts`). Every verdict carries the sentence it rests on.
- **Duplicates** (`src/server/ingest/run.ts`): the same company + title from several feeds becomes one card; the employer's own board wins; different ATS requisitions are never merged.
- **Closed jobs**: missing from two consecutive successful board fetches, a 404/410 on re-check, or past expiry. Timeouts and server errors never close a job.
- **Trust labels** (`trust.ts`): facts only ("Open 74 days", "Employer says: talent pool"). "Possible scam" only on hard triggers with the quote, ignoring employers' own anti-fraud warnings.

Design decisions live in `docs/v2-decisions.md` (kept out of git).
