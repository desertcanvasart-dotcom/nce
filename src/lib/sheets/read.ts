import type { SheetRow } from "./map";

/**
 * ADR-099, Part B: reading a spreadsheet's cells. A sheet laid out as a plain table (a ship, a date, a cabin type and the
 * number free, in columns with recognisable headings) is read directly, with no AI. Anything else (a calendar grid, a
 * PDF, a photo) goes to the AI reader with the cells as text.
 */
export type Grid = (string | number | Date | null)[][];
export const PARSER_VERSION = "sheets-v1";

const HEAD = {
  ship: /^(ship|vessel|boat|cruise ship|dahabiya|name)$/,
  date: /^(date|departure|departs?|embark(ation)?( date)?|sailing( date)?|check ?in)$/,
  cabin: /^(cabin|cabin type|category|room|room type|type)$/,
  available: /^(free|available|availability|vacan(cy|cies|t)|left|cabins free|cabins available|qty|count)$/,
} as const;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const iso = (y: number, m: number, d: number) =>
  y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null;

/** 2026-11-02, 02/11/2026 (day first, as in Egypt), 2 Nov 2026, Nov 2 2026, an Excel date or serial number. */
export function readDate(v: string | number | Date | null): string | null {
  if (v === null || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // Excel's day count from 1899-12-30.
    if (v < 30000 || v > 80000) return null;
    return new Date(Date.UTC(1899, 11, 30) + v * 86_400_000).toISOString().slice(0, 10);
  }
  const s = v.trim().toLowerCase();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return iso(+m[1]!, +m[2]!, +m[3]!);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s);
  if (m) return iso(+m[3]! < 100 ? 2000 + +m[3]! : +m[3]!, +m[2]!, +m[1]!);
  m = /^(\d{1,2})\s*([a-z]{3})[a-z]*\.?,?\s*(\d{4})$/.exec(s);
  if (m && MONTHS.includes(m[2]!)) return iso(+m[3]!, MONTHS.indexOf(m[2]!) + 1, +m[1]!);
  m = /^([a-z]{3})[a-z]*\.?\s*(\d{1,2}),?\s*(\d{4})$/.exec(s);
  if (m && MONTHS.includes(m[1]!)) return iso(+m[3]!, MONTHS.indexOf(m[1]!) + 1, +m[2]!);
  return null;
}

const text = (v: string | number | Date | null) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").trim());

/** A date written above the table ("Vacancies as of 30 Oct 2026", "Updated: 30/10/2026"). */
export function sheetDateIn(grid: Grid): string | null {
  for (const row of grid.slice(0, 8))
    for (const cell of row) {
      const s = text(cell);
      const m = /(as of|as at|updated|date|dated)[:\s]+(.+)$/i.exec(s);
      if (m) {
        const d = readDate(m[2]!.trim());
        if (d) return d;
      }
    }
  return null;
}

/** The table read directly, when its headings are recognisable; otherwise null (send it to the AI reader). */
export function readPlainTable(grid: Grid): { rows: SheetRow[]; sheetDate: string | null; skipped: number } | null {
  for (let h = 0; h < Math.min(grid.length, 15); h++) {
    const heads = grid[h]!.map((c) =>
      text(c)
        .toLowerCase()
        .replace(/[^a-z ]/g, "")
        .trim(),
    );
    const col = (re: RegExp) => heads.findIndex((x) => re.test(x));
    const at = { ship: col(HEAD.ship), date: col(HEAD.date), cabin: col(HEAD.cabin), available: col(HEAD.available) };
    if (Object.values(at).some((i) => i < 0)) continue;
    const rows: SheetRow[] = [];
    let skipped = 0;
    let lastShip = "";
    let lastDate: string | null = null;
    for (const r of grid.slice(h + 1)) {
      if (r.every((c) => text(c) === "")) continue;
      // Merged cells: a ship or date written once for the rows under it.
      const ship = text(r[at.ship] ?? null) || lastShip;
      const date: string | null = readDate(r[at.date] ?? null) ?? (text(r[at.date] ?? null) ? null : lastDate);
      const cabin = text(r[at.cabin] ?? null);
      const raw = r[at.available];
      const n =
        typeof raw === "number"
          ? raw
          : /^\s*(\d{1,3})\s*$/.test(text(raw ?? null))
            ? Number(text(raw ?? null))
            : /^(full|none|-|x|sold out)$/i.test(text(raw ?? null))
              ? 0
              : NaN;
      lastShip = ship;
      lastDate = date;
      if (!ship || !date || !cabin || !Number.isInteger(n) || n < 0 || n > 400) {
        skipped++;
        continue;
      }
      rows.push({ ship, date, cabin, available: n });
    }
    return { rows, sheetDate: sheetDateIn(grid.slice(0, h)), skipped };
  }
  return null;
}

/** The cells as tab-separated text, for the AI reader. */
export const gridText = (grid: Grid) => grid.map((r) => r.map(text).join("\t")).join("\n");
