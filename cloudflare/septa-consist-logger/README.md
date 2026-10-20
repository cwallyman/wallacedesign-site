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
   older than `RETENTION_DAYS` (365, in `src/index.ts`) are deleted from D1,
   so the web UI and `.xlsx` download cover the past year (~40 MB of D1).
   Per-day queries use `idx_trips_service_date`. Car searches scan the whole
   retained year (no index can help a match inside the consist text), so
   the UI runs them only on demand, never on its 60s refresh.

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
- `trips.max_late` / `delay_start_stop` / `delay_start_at` — the trip's
  total delay (highest minutes-late TrainView reported) and the stop
  (`currentstop`) and time when it first reported 1+ minutes late. These
  are written only when the delay reaches a new high, so a train holding
  steady at the same lateness adds no extra writes. TrainView's `999`
  placeholder is ignored.
- `observations` — append-only; a new row is only written when a trip's
  consist actually changes, so storage stays small even with per-minute
  polling.

Unchanged trips update their `last_seen_at` heartbeat every 30 minutes;
new trips and consist changes are still recorded on the one-minute polls.
This reduces routine heartbeat updates by about 83% compared with five-minute
updates. Last-seen timestamps can lag by up to 30 minutes, and the three-hour
trip reuse check therefore has the same timing uncertainty. Actual D1 usage
also includes new trips, observations, indexes, pruning, and other account activity.

## Features

- **Live trip table** for any service date, showing train #, line, source,
  destination, current consist, first/last seen times, total delay, and
  the station where the delay started.
- **Search by car number** — every trip a given railcar has appeared in,
  over the past year (`RETENTION_DAYS`).
- **Search by train number** — a single trip's full consist-change history
  for the day.
- **`.xlsx` export** — `GET /api/export?date=YYYY-MM-DD` (also a button in
  the UI) downloads that day's trip table as a real Excel file. The data is
  an Excel table named `consists` (so Power Automate's "List rows present in
  a table" can read it).
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
| `NOTIFY_EMAIL` | plain var (`wrangler.toml`) | Recipient(s) for the daily export email, comma-separated. Each gets its own send, so one rejected address doesn't block the rest. |
| `NOTIFY_FROM` | plain var (`wrangler.toml`), optional | Sender address, e.g. `SEPTA Consist Logger <logger@wallacedesign.org>`. Must be on a domain verified in Resend. Defaults to the sandbox sender below. |
| `RESEND_API_KEY` | secret (`wrangler secret put`) | [Resend](https://resend.com) API key used to send that email. Without `NOTIFY_FROM`, mail is sent from Resend's sandbox sender (`onboarding@resend.dev`), which only delivers to the account's own signup email — any other recipient is rejected until a domain is verified and `NOTIFY_FROM` is set. |

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

Existing databases created before delay tracking also need the one-time
column migration (run it **before** deploying the delay-tracking Worker):

```bash
npm run db:migrate:delays:local
npm run db:migrate:delays:remote
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
