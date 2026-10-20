import type { TripRow } from "./db";
import { escapeXml, tripRows } from "./export";
import { shiftServiceDate } from "./septa";

/** The service date the feed currently publishes: today once it's 23:59
 * America/New_York (the same moment the daily email goes out), otherwise
 * yesterday. A day only appears once it's final, like the email. */
export function publishedFeedDate(now: Date, today: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = parts.find((p) => p.type === "hour")?.value;
  const minute = parts.find((p) => p.type === "minute")?.value;
  return hour === "23" && minute === "59" ? today : shiftServiceDate(today, -1);
}

/** 23:59 America/New_York on `date`, as a UTC Date. DST changes happen at
 * 2 AM, so the offset at 23:59 is never ambiguous. */
function easternEndOfDay(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const naiveUtc = Date.UTC(y, m - 1, d, 23, 59);
  const offset = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
  })
    .formatToParts(new Date(naiveUtc + 5 * 3600_000))
    .find((p) => p.type === "timeZoneName")?.value; // e.g. "GMT-4"
  const hours = Number(offset?.replace("GMT", "") || -5);
  return new Date(naiveUtc - hours * 3600_000);
}

/** RSS 2.0 feed of one finished service day: one item per trip, carrying the
 * same fields as the daily .xlsx. Each item's description is that row as
 * JSON, so a Power Automate "Parse JSON" step can map it into SharePoint. */
export function buildDailyFeed(origin: string, date: string, trips: TripRow[]): string {
  const pubDate = easternEndOfDay(date).toUTCString();
  const rows = tripRows(trips);
  const items = trips
    .map((t, i) => {
      const r = rows[i];
      return (
        `<item>` +
        `<title>${escapeXml(`Train ${t.trainno} — ${t.line ?? ""} — ${date}`)}</title>` +
        `<guid isPermaLink="false">consist-${date}-${t.id}</guid>` +
        `<pubDate>${pubDate}</pubDate>` +
        `<description>${escapeXml(JSON.stringify({ "Service date": date, ...r }))}</description>` +
        `</item>`
      );
    })
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0"><channel>` +
    `<title>SEPTA Consist Logger — daily trips</title>` +
    `<link>${escapeXml(origin)}/</link>` +
    `<description>Every trip logged on ${date}, same fields as the daily .xlsx. Updated nightly at 11:59 PM ET.</description>` +
    `<lastBuildDate>${pubDate}</lastBuildDate>\n` +
    items +
    `\n</channel></rss>`
  );
}
