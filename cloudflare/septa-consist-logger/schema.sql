CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_date TEXT NOT NULL,
  trainno TEXT NOT NULL,
  line TEXT,
  source TEXT,
  dest TEXT,
  last_consist TEXT NOT NULL DEFAULT '',
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL REFERENCES trips(id),
  consist TEXT NOT NULL DEFAULT '',
  observed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trips_trainno_date ON trips(trainno, service_date);
CREATE INDEX IF NOT EXISTS idx_trips_service_date ON trips(service_date);
CREATE INDEX IF NOT EXISTS idx_trips_last_seen ON trips(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_obs_trip ON observations(trip_id);
