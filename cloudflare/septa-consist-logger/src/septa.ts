export interface TrainViewEntry {
  lat: string;
  lon: string;
  trainno: string;
  service: string;
  dest: string;
  currentstop: string;
  nextstop: string;
  line: string;
  consist: string;
  heading: string;
  late: string;
  SOURCE: string;
  TRACK: string;
  TRACK_CHANGE: string;
}

const TRAINVIEW_URL = "https://www3.septa.org/api/TrainView/index.php";

export async function fetchTrainView(): Promise<TrainViewEntry[]> {
  const res = await fetch(TRAINVIEW_URL, {
    headers: { "User-Agent": "septa-consist-logger/0.1 (personal project)" },
  });
  if (!res.ok) {
    throw new Error(`TrainView fetch failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("TrainView response was not an array");
  }
  return data as TrainViewEntry[];
}

/** Service date in America/New_York, as YYYY-MM-DD, so a late-night poll near
 * midnight UTC doesn't get bucketed into the wrong day. */
export function serviceDateFor(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Shifts a YYYY-MM-DD service date by a number of calendar days (negative
 * to go backward). Pure date-string arithmetic, so it doesn't care about
 * timezones — the caller already resolved the date via serviceDateFor. */
export function shiftServiceDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function splitConsist(consist: string): string[] {
  return consist
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}
