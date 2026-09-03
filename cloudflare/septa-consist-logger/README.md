# SEPTA Consist Logger

Logs which railcars (the "consist") make up every SEPTA Regional Rail train,
all day, every day — building a searchable history that SEPTA's own API
doesn't provide (it only ever shows the current live snapshot, never the
past).

**Live at:** https://septa-consist-logger.cjjw.workers.dev

## How it works

This is a single Cloudflare Worker with three moving parts:

1. **A cron-triggered poller** — runs on Cloudflare's infrastructure every
   minute (`* * * * *`), completely independent of anyone visiting the site.
   It fetches SEPTA's public `TrainView` API, and for every train currently
   running, records its train number, line, origin, destination, and car
   consist into a D1 (SQLite) database. **This keeps logging 24/7 whether or
   not the website is ever opened** — the web UI is just a viewer on top of
   already-collected data, not part of the collection process.
2. **A small web UI** (`public/`) — browse a given day's trips, look up
   every train a specific car number has run in, or look up a specific
   train number's full consist history for the day.
3. **A daily email** — once a day at 11:59 PM America/New York, the same
   Worker builds an `.xlsx` of that day's trips and emails it via Resend.
   The 23:59 check is done from wall-clock local time (not a fixed UTC cron
   offset), so it stays correct across DST changes automatically.
4. **Daily pruning** — right after the export email, trips/observations
   older than `RETENTION_DAYS` (2, in `src/index.ts`) are deleted from D1.
   The daily email is the durable record; D1 only needs to hold enough
   history to serve the live web UI. This also keeps D1's `rows_read`
   usage bounded instead of growing without limit as history piles up.

```
SEPTA TrainView API
        │  polled every minute (Cron Trigger, server-side, always running)
        ▼
   D1 database (trips, observations)
        │                              │
        ▼                              ▼
   Web UI (public/)              Daily email (Resend, 23:59 ET)
   + /api/export (.xlsx)
```

## Data model

- `trips` — one row per (service_date, trainno) run. If a train number is
  reused later the same day (gap > 3h since last seen), that starts a new
  trip row rather than merging into the old one.
- `observations` — append-only; a new row is only written when a trip's
  consist actually changes, so storage stays small even with per-minute
  polling.

## Features

- **Live trip table** for any service date, showing train #, line, source,
  destination, current consist, and first/last seen times.
- **Search by car number** — every trip a given railcar has appeared in,
  across all logged days still in D1 (see Daily pruning above — currently
  the last `RETENTION_DAYS` days).
- **Search by train number** — a single trip's full consist-change history
  for the day.
- **`.xlsx` export** — `GET /api/export?date=YYYY-MM-DD` (also a button in
  the UI) downloads that day's trip table as a real Excel file.
- **Daily email** — the same export, sent automatically every night.

## API

- `GET /api/trips?date=YYYY-MM-DD` — all trips for a service date
- `GET /api/trains/:trainno?date=YYYY-MM-DD` — one trip + its full consist
  change history
- `GET /api/cars/:carno` — every trip a given car number has appeared in
- `GET /api/export?date=YYYY-MM-DD` — that day's trips as a downloadable
  `.xlsx`

## Environment

| Name | Type | Purpose |
| --- | --- | --- |
| `NOTIFY_EMAIL` | plain var (`wrangler.toml`) | Recipient for the daily export email |
| `RESEND_API_KEY` | secret (`wrangler secret put`) | [Resend](https://resend.com) API key used to send that email. Sent from Resend's sandbox sender (`onboarding@resend.dev`), which only allows sending to the account's own signup email — so `NOTIFY_EMAIL` must match the email the Resend account was created with, case included. |

## Local setup

```bash
npm install
wrangler login
wrangler d1 create septa-consists
```

Copy the `database_id` from the create command's output into
`wrangler.toml`, then run the migration:

```bash
npm run db:migrate:local   # for `wrangler dev`
npm run db:migrate:remote  # for the deployed Worker
```

## Dev / deploy

```bash
npm run dev       # local dev server (cron trigger won't fire automatically;
                   # trigger a poll manually — see below)
npm run deploy     # deploy Worker + cron trigger to Cloudflare
```

To trigger a poll manually while testing locally:

```bash
curl "http://localhost:8787/cdn-cgi/local/scheduled"
```

To send the daily email locally or in production ahead of the 23:59
schedule, add a temporary debug route that calls the same export/email
logic — see git history for an example (added and removed while testing
this feature).
