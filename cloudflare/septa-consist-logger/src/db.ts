import type { TrainViewEntry } from "./septa";
import { shiftServiceDate } from "./septa";

/** If a train number reappears more than this long after we last saw it,
 * treat it as a new trip rather than a continuation (SEPTA reuses train
 * numbers for different runs later the same service day). */
const GAP_MS = 3 * 60 * 60 * 1000;

/** Minimum time between "nothing changed, just bump last_seen_at" writes for
 * a trip. The cron polls every minute, but writing a no-op UPDATE for every
 * active train on every single poll is what was driving the daily D1
 * rows_written limit over — this only needs to be fresh enough for the
 * GAP_MS reuse check above, not minute-accurate. */
const TOUCH_THROTTLE_MS = 5 * 60 * 1000;

export interface TripRow {
  id: number;
  service_date: string;
  trainno: string;
  line: string | null;
  source: string | null;
  dest: string | null;
  last_consist: string;
  first_seen_at: string;
  last_seen_at: string;
}

export interface PollSummary {
  seen: number;
  newTrips: number;
  consistChanges: number;
  touched: number;
  skipped: number;
}

export async function ingestTrainView(
  db: D1Database,
  entries: TrainViewEntry[],
  serviceDate: string,
  nowIso: string
): Promise<PollSummary> {
  const summary: PollSummary = { seen: 0, newTrips: 0, consistChanges: 0, touched: 0, skipped: 0 };

  const existingRows = await db
    .prepare(
      `SELECT * FROM trips WHERE service_date = ? ORDER BY last_seen_at DESC`
    )
    .bind(serviceDate)
    .all<TripRow>();

  // Most recent trip per trainno (rows already ordered by last_seen_at desc).
  const latestByTrainno = new Map<string, TripRow>();
  for (const row of existingRows.results ?? []) {
    if (!latestByTrainno.has(row.trainno)) {
      latestByTrainno.set(row.trainno, row);
    }
  }

  const batchStatements: D1PreparedStatement[] = [];
  const nowMs = Date.parse(nowIso);

  for (const entry of entries) {
    const trainno = entry.trainno?.trim();
    if (!trainno) {
      summary.skipped++;
      continue;
    }
    summary.seen++;

    const consist = (entry.consist ?? "").trim();
    const line = entry.line || null;
    const source = entry.SOURCE || null;
    const dest = entry.dest || null;

    const existing = latestByTrainno.get(trainno);
    const gapExceeded =
      existing !== undefined && nowMs - Date.parse(existing.last_seen_at) > GAP_MS;

    if (!existing || gapExceeded) {
      const inserted = await db
        .prepare(
          `INSERT INTO trips (service_date, trainno, line, source, dest, last_consist, first_seen_at, last_seen_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(serviceDate, trainno, line, source, dest, consist, nowIso, nowIso)
        .run();
      const tripId = inserted.meta.last_row_id;
      batchStatements.push(
        db
          .prepare(
            `INSERT INTO observations (trip_id, consist, observed_at) VALUES (?, ?, ?)`
          )
          .bind(tripId, consist, nowIso)
      );
      latestByTrainno.set(trainno, {
        id: Number(tripId),
        service_date: serviceDate,
        trainno,
        line,
        source,
        dest,
        last_consist: consist,
        first_seen_at: nowIso,
        last_seen_at: nowIso,
      });
      summary.newTrips++;
      continue;
    }

    if (consist !== "" && consist !== existing.last_consist) {
      batchStatements.push(
        db
          .prepare(
            `UPDATE trips SET last_seen_at = ?, last_consist = ?, line = ?, source = ?, dest = ? WHERE id = ?`
          )
          .bind(nowIso, consist, line, source, dest, existing.id)
      );
      batchStatements.push(
        db
          .prepare(
            `INSERT INTO observations (trip_id, consist, observed_at) VALUES (?, ?, ?)`
          )
          .bind(existing.id, consist, nowIso)
      );
      existing.last_consist = consist;
      existing.last_seen_at = nowIso;
      summary.consistChanges++;
    } else {
      summary.touched++;
      if (nowMs - Date.parse(existing.last_seen_at) < TOUCH_THROTTLE_MS) {
        continue;
      }
      batchStatements.push(
        db
          .prepare(
            `UPDATE trips SET last_seen_at = ?, line = ?, source = ?, dest = ? WHERE id = ?`
          )
          .bind(nowIso, line, source, dest, existing.id)
      );
      existing.last_seen_at = nowIso;
    }
  }

  if (batchStatements.length > 0) {
    await db.batch(batchStatements);
  }

  return summary;
}

export interface PruneSummary {
  trips: number;
  observations: number;
}

/** Deletes trips (and their observations) more than `retentionDays` old,
 * keeping only the most recent `retentionDays` of service dates. Run once a
 * day, not per-poll, since it's date-bucketed and doesn't need finer
 * granularity than that. */
export async function pruneOldData(
  db: D1Database,
  currentServiceDate: string,
  retentionDays: number
): Promise<PruneSummary> {
  const cutoff = shiftServiceDate(currentServiceDate, -(retentionDays - 1));

  const deleteObservations = db
    .prepare(
      `DELETE FROM observations WHERE trip_id IN (SELECT id FROM trips WHERE service_date < ?)`
    )
    .bind(cutoff);
  const deleteTrips = db.prepare(`DELETE FROM trips WHERE service_date < ?`).bind(cutoff);

  const [obsResult, tripsResult] = await db.batch([deleteObservations, deleteTrips]);

  return {
    observations: obsResult.meta.changes ?? 0,
    trips: tripsResult.meta.changes ?? 0,
  };
}
