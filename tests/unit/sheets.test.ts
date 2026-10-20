import { readFileSync } from "node:fs";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { autoConfirmProblems, mapRows, tidy, type OperatorShip } from "@/lib/sheets/map";
import { readDate, readPlainTable, sheetDateIn } from "@/lib/sheets/read";

const csv = (name: string) =>
  Papa.parse<string[]>(readFileSync(`tests/fixtures/sheets/${name}`, "utf8"), { skipEmptyLines: false }).data;
const ships: OperatorShip[] = [
  {
    slug: "sample-request-ship",
    name: "Sample Request Ship",
    cabinCount: 6,
    cabins: [
      { code: "STD", name: "Standard" },
      { code: "STE", name: "Suite" },
      { code: "DXU", name: "Deluxe Upper Deck" },
    ],
  },
];

describe("reading dates as operators write them", () => {
  it("reads ISO, day-first, month names and Excel dates", () => {
    expect(readDate("2026-11-02")).toBe("2026-11-02");
    expect(readDate("02/11/2026")).toBe("2026-11-02");
    expect(readDate("2.11.26")).toBe("2026-11-02");
    expect(readDate("9 Nov 2026")).toBe("2026-11-09");
    expect(readDate("Nov 9, 2026")).toBe("2026-11-09");
    expect(readDate(46328)).toBe("2026-11-02");
    expect(readDate(new Date("2026-11-02T00:00:00Z"))).toBe("2026-11-02");
    expect(readDate("Mon 2")).toBeNull();
  });
  it("finds the date above the table", () => {
    expect(sheetDateIn([["Vacancies"], ["As of: 30/10/2026"]])).toBe("2026-10-30");
    expect(sheetDateIn([["Updated 30 Oct 2026"]])).toBe("2026-10-30");
  });
});

describe("a plain table is read directly, without AI", () => {
  it("reads ship, date, cabin and free, with merged cells and 'full'", () => {
    const t = readPlainTable(csv("plain-table.csv"))!;
    expect(t.sheetDate).toBe("2026-10-30");
    expect(t.rows).toEqual([
      { ship: "MS Sample Request Ship", date: "2026-11-02", cabin: "Standard", available: 3 },
      { ship: "MS Sample Request Ship", date: "2026-11-02", cabin: "Suite", available: 0 },
      { ship: "Sample Request Ship", date: "2026-11-09", cabin: "Standard", available: 5 },
      { ship: "Sample Request Ship", date: "2026-11-16", cabin: "Deluxe Upper", available: 2 },
    ]);
  });
  it("leaves a calendar grid to the AI reader", () => {
    expect(readPlainTable(csv("calendar-grid.csv"))).toBeNull();
  });
});

describe("mapping names to the operator's ships and cabin types", () => {
  const rows = readPlainTable(csv("plain-table.csv"))!.rows;
  it("matches names, ignoring 'MS' and punctuation, and flags the rest", () => {
    expect(tidy("M/S Sample-Request  Ship")).toBe("sample request ship");
    const m = mapRows(rows, ships, []);
    expect(m.rows.slice(0, 3)).toEqual([
      {
        vessel: "sample-request-ship",
        date: "2026-11-02",
        cabin: "STD",
        available: 3,
        label: "MS Sample Request Ship · Standard",
      },
      { vessel: "sample-request-ship", date: "2026-11-02", cabin: "STE", available: 0, label: "MS Sample Request Ship · Suite" },
      { vessel: "sample-request-ship", date: "2026-11-09", cabin: "STD", available: 5, label: "Sample Request Ship · Standard" },
    ]);
    expect(m.rows[3]).toMatchObject({ unmapped: true, sheet_cabin: "Deluxe Upper", vessel: "sample-request-ship" });
    expect(m.unmatched).toEqual([{ kind: "cabin", name: "Deluxe Upper", vessel_slug: "sample-request-ship" }]);
  });
  it("uses a saved alias the next time", () => {
    const m = mapRows(rows, ships, [
      { kind: "cabin", sheet_name: "deluxe upper", target: "DXU", vessel_slug: "sample-request-ship" },
    ]);
    expect(m.unmatched).toEqual([]);
    expect(m.rows[3]).toMatchObject({ vessel: "sample-request-ship", cabin: "DXU", available: 2 });
  });
  it("flags an unknown ship", () => {
    expect(mapRows([{ ship: "Another Ship", date: "2026-11-02", cabin: "Standard", available: 1 }], ships, []).unmatched).toEqual(
      [{ kind: "vessel", name: "Another Ship" }],
    );
  });
});

describe("auto-confirm only when every check passes", () => {
  const mapped = mapRows(readPlainTable(csv("plain-table.csv"))!.rows.slice(0, 3), ships, []).rows;
  const base = {
    operatorKnown: true,
    unmatched: 0,
    rows: mapped,
    ships,
    changedShare: 0.1,
    sheetDate: "2026-10-30",
    latestDataAt: "2026-10-23T10:00:00Z",
  };
  it("passes a clean, newer sheet", () => {
    expect(autoConfirmProblems(base)).toEqual([]);
  });
  it("stops on each problem", () => {
    expect(autoConfirmProblems({ ...base, operatorKnown: false })).toHaveLength(1);
    expect(autoConfirmProblems({ ...base, unmatched: 2 })[0]).toBe("2 names not mapped by an existing alias.");
    expect(autoConfirmProblems({ ...base, changedShare: 0.3 })[0]).toBe("The sheet changes 30 % of sailings (30 % or more).");
    expect(autoConfirmProblems({ ...base, sheetDate: null })[0]).toBe("The sheet has no date.");
    expect(autoConfirmProblems({ ...base, latestDataAt: "2026-10-30T12:00:00Z" })[0]).toMatch(/isn't newer/);
    const tooMany = mapRows(
      [{ ship: "Sample Request Ship", date: "2026-11-02", cabin: "Standard", available: 9 }],
      ships,
      [],
    ).rows;
    expect(autoConfirmProblems({ ...base, rows: tooMany }).join(" ")).toMatch(/more than the ship's 6 cabins/);
  });
});
