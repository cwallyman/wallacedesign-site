import * as XLSX from "xlsx";
import type { TripRow } from "./db";

export function buildTripsWorkbook(date: string, trips: TripRow[]): Uint8Array {
  const rows = trips.map((t) => ({
    "Train #": t.trainno,
    Line: t.line ?? "",
    Source: t.source ?? "",
    Dest: t.dest ?? "",
    Consist: t.last_consist ?? "",
    "First seen": t.first_seen_at,
    "Last seen": t.last_seen_at,
    "Total delay (min)": t.max_late ?? 0,
    "Delay started at": t.delay_start_stop ?? "",
    "Delay started time": t.delay_start_at ?? "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 10 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 32 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 24 },
    { wch: 22 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, date);

  // SheetJS's "array" output type is a raw ArrayBuffer in this runtime, not a
  // Uint8Array — wrap it so callers get a real typed array with working
  // .length/.subarray() (Response() tolerates either, but manual byte
  // handling like base64 encoding does not).
  const output = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new Uint8Array(output as ArrayBuffer);
}
