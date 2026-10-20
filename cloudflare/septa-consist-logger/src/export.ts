import * as XLSX from "xlsx";
import type { TripRow } from "./db";

const TABLE_NAME = "consists";

const HEADERS = [
  "Train #",
  "Line",
  "Source",
  "Dest",
  "Consist",
  "First seen",
  "Last seen",
  "Total delay (min)",
  "Delay started at",
  "Delay started time",
];

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

  // Explicit header list so an empty day still gets a header row for the table.
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: HEADERS });
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
  return addExcelTable(new Uint8Array(output as ArrayBuffer), trips.length);
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** SheetJS (community) can't write Excel tables, so patch one into the
 * finished .xlsx zip: a table part covering the data, plus the sheet
 * relationship and content-type entries Excel needs to find it. A named
 * table is what Power Automate's Excel actions read from. */
function addExcelTable(xlsx: Uint8Array, dataRowCount: number): Uint8Array {
  const zip = XLSX.CFB.read(xlsx, { type: "array" });
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const readText = (path: string): string | null => {
    const entry = XLSX.CFB.find(zip, path);
    return entry?.content ? decoder.decode(entry.content as Uint8Array) : null;
  };
  const writeText = (path: string, text: string) => {
    const bytes = encoder.encode(text);
    const entry = XLSX.CFB.find(zip, path);
    if (entry) entry.content = bytes;
    else XLSX.CFB.utils.cfb_add(zip, path, bytes);
  };

  // A table needs at least one data row, so an empty day gets one blank row.
  const lastCol = XLSX.utils.encode_col(HEADERS.length - 1);
  const ref = `A1:${lastCol}${Math.max(dataRowCount, 1) + 1}`;
  const columns = HEADERS.map((h, i) => `<tableColumn id="${i + 1}" name="${escapeXml(h)}"/>`).join("");
  writeText(
    "/xl/tables/table1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="${TABLE_NAME}" displayName="${TABLE_NAME}" ref="${ref}" totalsRowShown="0">` +
      `<autoFilter ref="${ref}"/>` +
      `<tableColumns count="${HEADERS.length}">${columns}</tableColumns>` +
      `<tableStyleInfo name="TableStyleMedium2" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/>` +
      `</table>`
  );

  writeText(
    "/xl/worksheets/_rels/sheet1.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rIdTable1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/>` +
      `</Relationships>`
  );

  const sheet = readText("/xl/worksheets/sheet1.xml");
  if (!sheet) throw new Error("xlsx export: sheet1.xml missing");
  writeText(
    "/xl/worksheets/sheet1.xml",
    sheet.replace("</worksheet>", `<tableParts count="1"><tablePart r:id="rIdTable1"/></tableParts></worksheet>`)
  );

  const types = readText("/[Content_Types].xml");
  if (!types) throw new Error("xlsx export: [Content_Types].xml missing");
  writeText(
    "/[Content_Types].xml",
    types.replace(
      "</Types>",
      `<Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/></Types>`
    )
  );

  return new Uint8Array(XLSX.CFB.write(zip, { type: "array", fileType: "zip" }) as ArrayBuffer);
}
