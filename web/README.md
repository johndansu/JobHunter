# JobHunter v2 (web)

Remote jobs in every category, filtered to the ones open to your country, with the evidence behind every verdict.
Phases 1–4 of the v2 plan: jobs in and searchable, matched to your CV, turned into checked, tailored applications, and sent from your own Gmail when the posting asks for email.

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

## Applying (Phase 3, no-AI mode)

Open a job and choose **Start application** (needs a CV on `/profile`). Each application at `/applications/[id]` has:

1. **Pre-flight** (`src/server/applications.ts`, `lib/preflight.ts`): re-checks the job is open, reads the employer's Greenhouse form for knockout questions (residence, sponsorship, authorization), finds the employer's stated AI policy, shows Greenhouse's AI-screening notice and opt-out link (your choice is logged; never automatic), and spots postings that ask for applications by email.
2. **Evidence**: every requirement against the CV line that proves it: met, partly, or not met.
3. **Tailored CV and letter** (`lib/tailor.ts`): built only from your CV. Skills and bullets are re-ordered for the job; nothing is added. The letter is a template with one or two real proofs and `[blanks]` only you can fill. You edit both as plain text.
4. **Checks** (`lib/checks.ts`): the fact lock blocks numbers, tools, titles, employers, dates and degrees that aren't in your CV, tools used before they existed, unfilled blanks and hidden characters. Warnings cover vague bullets and recruiters' tells (overused wording, inflated verbs, copied posting text, generic praise, mixed spelling), each with the reason. There's no "AI score" and no humanizer.
5. **Read-back** (`lib/render.ts`): the PDF and Word files are generated from your text, then read back the way hiring software does (name, contact details, section order, titles and dates, every bullet, nothing hidden or extra).
6. **Approve, then download**: downloads exist only for approved text that passes read-back; any edit resets approval. You submit the employer's form yourself.

Also: a tracker (`/applications`) where "Applied" becomes "No response" after 28 days, with follow-up timing hints; a message checker (`/check-message`) for recruiter messages and offers (scam patterns, look-alike sender domains, whether the company has live jobs here); an identity-readiness checklist; and a consistency check (`lib/consistency.ts`) that compares your CV with your LinkedIn data export (name, titles, employers, dates, degrees) and checks the letter's sign-off and named employers against the CV. Sending email is Phase 4.

## Sending from Gmail (Phase 4)

Connect your Gmail in **Settings → Email** (`/settings/email`). Two ways (decision D-17):

- **Your own Google sign-in (recommended):** a Google Cloud OAuth client you create with your own account, asking only to send (`gmail.send`). Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`; the settings page walks you through it and shows the redirect URI to register.
- **An app password (fallback):** SMTP to Gmail; needs 2-Step Verification.

The credential is encrypted at rest (`src/server/secret.ts`; key from `MAIL_SECRET_KEY` or a generated, git-ignored `.secrets/mail.key`) and never logged or exported.

How an email goes out (`src/server/outbox.ts`):

1. **Draft:** for jobs that ask for applications by email, a short note from your CV with the approved CV attached, to the address the posting gives (subject from the posting if it names one). Same fact lock and authenticity checks as the letter, plus link rules.
2. **Recipient rules** (`lib/recipients.ts`): the address must appear in the posting (or, for speculative applications, on the company's own careers page); guessed and third-party addresses are blocked; free-mail and look-alike domains need your explicit confirmation; the domain must receive mail; no duplicates.
3. **Exact message:** the RFC 5322 message is built once (`lib/mime.ts`) and shown in full with its SHA-256. You approve those bytes; the worker re-checks the hash before sending. "Send a test to myself" sends the same message to you.
4. **Caps and gaps** (`lib/sendPolicy.ts`): at most 25 emails per 24 hours, 2–5 minutes apart, from a queue you can cancel; speculative applications at most 3 a day and one per company per 90 days.
5. **After sending:** the stage moves to Applied; a follow-up draft (same thread) appears after 7 business days and a final one 7 later, each needing your approval; "Got a reply" buttons set the stage and stop follow-ups. Optional reply detection reads only the headers of threads JobHunter sent (needs the `gmail.metadata` permission).

Also: speculative applications (`/speculative`), a provider-health panel, the send log, export (JSON/CSV) and delete-all-data in Settings → Email. Set `MAIL_WORKER=off` to stop all sending.

AI is optional (decision D-16): set `AI_MODE=on` and an API key once AI features ship; until then everything runs on rules on your machine, and your CV isn't sent anywhere. After changing matching rules, run `npm run backfill:requirements`.

Design decisions live in `docs/v2-decisions.md` (kept out of git).
