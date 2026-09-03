import { fetchTrainView, serviceDateFor } from "./septa";
import { ingestTrainView, pruneOldData, type TripRow } from "./db";
import { buildTripsWorkbook } from "./export";
import { sendDailyExportEmail } from "./email";

/** How many days of trips/observations to keep. Data older than this is
 * deleted once a day — the nightly export email is the durable record, so
 * there's no need to keep it in D1 (and keeping it unbounded is what was
 * driving the daily D1 rows_read limit over). */
const RETENTION_DAYS = 2;

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  RESEND_API_KEY?: string;
  NOTIFY_EMAIL?: string;
}

/** True once a minute a day, at 23:59 America/New_York — computed from local
 * wall-clock time rather than a fixed UTC cron offset so it stays correct
 * across the DST transition without needing separate winter/summer crons. */
function isDailyExportMinute(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = parts.find((p) => p.type === "hour")?.value;
  const minute = parts.find((p) => p.type === "minute")?.value;
  return hour === "23" && minute === "59";
}

async function sendTodaysExport(env: Env, date: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL) {
    console.log("skipping daily export email: RESEND_API_KEY or NOTIFY_EMAIL not set");
    return;
  }
  const { results } = await env.DB.prepare(
    `SELECT * FROM trips WHERE service_date = ? ORDER BY trainno`
  )
    .bind(date)
    .all<TripRow>();
  const trips = results ?? [];
  const bytes = buildTripsWorkbook(date, trips);
  await sendDailyExportEmail(
    { RESEND_API_KEY: env.RESEND_API_KEY, NOTIFY_EMAIL: env.NOTIFY_EMAIL },
    date,
    bytes,
    trips.length
  );
}

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

async function handleTrips(env: Env, url: URL): Promise<Response> {
  const date = url.searchParams.get("date") ?? serviceDateFor(new Date());
  const { results } = await env.DB.prepare(
    `SELECT * FROM trips WHERE service_date = ? ORDER BY trainno`
  )
    .bind(date)
    .all<TripRow>();
  return json({ date, trips: results ?? [] });
}

async function handleTrain(env: Env, trainno: string, url: URL): Promise<Response> {
  const date = url.searchParams.get("date") ?? serviceDateFor(new Date());
  const trip = await env.DB.prepare(
    `SELECT * FROM trips WHERE service_date = ? AND trainno = ? ORDER BY first_seen_at DESC LIMIT 1`
  )
    .bind(date, trainno)
    .first<TripRow>();

  if (!trip) {
    return json({ error: "not found" }, { status: 404 });
  }

  const { results: observations } = await env.DB.prepare(
    `SELECT consist, observed_at FROM observations WHERE trip_id = ? ORDER BY observed_at ASC`
  )
    .bind(trip.id)
    .all();

  return json({ trip, observations: observations ?? [] });
}

async function handleExport(env: Env, url: URL): Promise<Response> {
  const date = url.searchParams.get("date") ?? serviceDateFor(new Date());
  const { results } = await env.DB.prepare(
    `SELECT * FROM trips WHERE service_date = ? ORDER BY trainno`
  )
    .bind(date)
    .all<TripRow>();

  const bytes = buildTripsWorkbook(date, results ?? []);

  return new Response(bytes, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="septa-consists-${date}.xlsx"`,
    },
  });
}

async function handleCar(env: Env, carno: string): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT t.service_date, t.trainno, t.line, t.source, t.dest, o.consist, o.observed_at
     FROM observations o
     JOIN trips t ON t.id = o.trip_id
     WHERE (',' || o.consist || ',') LIKE ('%,' || ? || ',%')
     ORDER BY o.observed_at DESC
     LIMIT 200`
  )
    .bind(carno)
    .all();
  return json({ carno, sightings: results ?? [] });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/trips") {
      return handleTrips(env, url);
    }
    if (url.pathname === "/api/export") {
      return handleExport(env, url);
    }
    const trainMatch = url.pathname.match(/^\/api\/trains\/([^/]+)$/);
    if (trainMatch) {
      return handleTrain(env, decodeURIComponent(trainMatch[1]), url);
    }
    const carMatch = url.pathname.match(/^\/api\/cars\/([^/]+)$/);
    if (carMatch) {
      return handleCar(env, decodeURIComponent(carMatch[1]));
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        const now = new Date();
        const nowIso = now.toISOString();
        const serviceDate = serviceDateFor(now);
        try {
          const entries = await fetchTrainView();
          const summary = await ingestTrainView(env.DB, entries, serviceDate, nowIso);
          console.log(
            `[poll ${nowIso}] seen=${summary.seen} new=${summary.newTrips} changed=${summary.consistChanges} touched=${summary.touched} skipped=${summary.skipped}`
          );
        } catch (err) {
          console.error("poll failed", err);
        }

        if (isDailyExportMinute(now)) {
          try {
            await sendTodaysExport(env, serviceDate);
            console.log(`[daily export ${nowIso}] sent for ${serviceDate}`);
          } catch (err) {
            console.error("daily export email failed", err);
          }

          try {
            const pruned = await pruneOldData(env.DB, serviceDate, RETENTION_DAYS);
            console.log(
              `[prune ${nowIso}] deleted trips=${pruned.trips} observations=${pruned.observations}`
            );
          } catch (err) {
            console.error("prune failed", err);
          }
        }
      })()
    );
  },
};
