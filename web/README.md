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

## Your matches (Phase 2, no-AI mode)

1. **Profile** (`/profile`): upload a CV (PDF, .docx or text). Rules read your roles, dates, skills and languages, each with the CV line they came from (`src/server/lib/cv.ts`), and pre-fill a form you confirm. It also holds what only you can say: target roles, country, time zone, hours you'd shift, citizenships and permits.
2. **Requirements**: every job gets a requirement record at ingest (`requirements.ts`). Skills come from a curated all-category dictionary (`skills.ts`) and are classed must / nice by section and wording, plus years, languages (including ones named in the title) and degree.
3. **Matching** (`match.ts`, `src/server/matching.ts`): title similarity, must-have coverage, seniority and years, shown as **Strong / Good / Stretch** bands with a quoted "why" checklist, never a percentage. Ranking multiplies the band by freshness with a floor. Matches recompute after you save your profile and after every ingest run.
4. **Pages**: `/matches` (with "New since yesterday"), `/why-not` (good-fit jobs closed to you, grouped by the rule that shuts you out, with how many open if you shift your hours), and a "Why this match" panel on each job.

AI is optional (decision D-16): set `AI_MODE=on` and an API key once AI features ship; until then everything runs on rules on your machine, and your CV isn't sent anywhere. After changing matching rules, run `npm run backfill:requirements`.

Design decisions live in `docs/v2-decisions.md` (kept out of git).
