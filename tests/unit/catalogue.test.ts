import { describe, expect, it } from "vitest";
import { CSV_TEMPLATE, parseVesselCsv } from "@/lib/catalogue/csv";
import { facetsFor } from "@/lib/catalogue/categories";
import { readiness, type ReadinessInput } from "@/lib/catalogue/readiness";
import { adminCan, operatorCan } from "@/lib/catalogue/submission-states";
import { DIMENSIONS, evaluate, type Scores } from "@/lib/evaluation/method";

const all = (v: number) => Object.fromEntries(DIMENSIONS.map((d) => [d.key, [v, v, v, v]])) as Scores;

describe("evaluation method v1 (ADR-070, DASH-ADM-028–030)", () => {
  it("weights sum to 100 and every dimension has four criteria", () => {
    expect(DIMENSIONS.reduce((a, d) => a + d.weight, 0)).toBe(100);
    expect(DIMENSIONS.every((d) => d.criteria.length === 4)).toBe(true);
  });
  it("all fives is 100, all zeros is 0, all fours is 80", () => {
    expect(evaluate(all(5)).overall).toBe(100);
    expect(evaluate(all(0)).overall).toBe(0);
    expect(evaluate(all(4)).overall).toBe(80);
  });
  it("matches the database's results for the shared test vector", () => {
    const s: Scores = {
      hygiene: [5, 4, 4, 3],
      service: [4, 4, 3, 3],
      food: [5, 5, 4, 4],
      amenities: [3, 3, 2, 2],
      management: [4, 3, 3, 4],
      cabin_vessel: [4, 4, 4, 3],
      cruise_experience: [3, 4, 4, 5],
    };
    const r = evaluate(s);
    expect(r.dimensions).toEqual({
      hygiene: 12,
      service: 14,
      food: 13.5,
      amenities: 5,
      management: 7,
      cabin_vessel: 15,
      cruise_experience: 8,
    });
    expect(r.overall).toBe(74.5);
  });
  it("half points round to two decimals", () => {
    const s = all(5);
    s.hygiene = [4.5, 4.5, 4.5, 4.5];
    expect(evaluate(s).dimensions.hygiene).toBe(13.5);
  });
  it("refuses missing dimensions and out-of-range scores", () => {
    const bad = all(3) as Record<string, number[]>;
    bad.food = [6, 3, 3, 3];
    expect(() => evaluate(bad as Scores)).toThrow();
    const short: Partial<Scores> = { ...all(3) };
    delete short.hygiene;
    expect(() => evaluate(short as Scores)).toThrow();
  });
});

describe("categories and facets (ADR-071)", () => {
  it("luxury lists Luxury and Deluxe; value lists Basic and Standard; Superior is in neither", () => {
    expect(facetsFor("luxury")).toEqual(["luxury"]);
    expect(facetsFor("deluxe")).toEqual(["luxury"]);
    expect(facetsFor("basic")).toEqual(["value"]);
    expect(facetsFor("standard")).toEqual(["value"]);
    expect(facetsFor("superior")).toEqual([]);
    expect(facetsFor(null)).toEqual([]);
  });
});

describe("readiness check (DASH-ADM-018, DATA-021)", () => {
  const complete: ReadinessInput = {
    name: "Sample",
    type: "sail",
    route_text: "Esna–Aswan",
    category: "luxury",
    cabin_count: 6,
    max_guests: 12,
    description_en: "A sample description.",
    photos: [{ alt_en: "The sundeck at dusk", credit: "Sample" }],
    operator: { status: "approved" },
    cabin_types: 2,
    bookable_departures: 3,
  };
  it("is complete only when everything, including rates and availability, is there", () => {
    expect(readiness(complete).complete).toBe(true);
    const r = readiness({ ...complete, cabin_types: undefined, bookable_departures: undefined });
    expect(r.complete).toBe(false);
    expect(r.items.filter((i) => !i.done).map((i) => i.key)).toEqual(["cabin_types", "rates"]);
  });
  it("needs a photo with both a description and a credit, and an approved operator", () => {
    expect(readiness({ ...complete, photos: [{ alt_en: "x", credit: null }] }).items.find((i) => i.key === "photos")?.done).toBe(
      false,
    );
    expect(readiness({ ...complete, operator: { status: "applied" } }).items.find((i) => i.key === "operator")?.done).toBe(false);
  });
});

describe("submission states (DASH-ADM-036, 041)", () => {
  it("operators edit only drafts and requested changes; admins decide only submitted", () => {
    expect(operatorCan("draft")).toEqual({ edit: true, submit: true, delete: true });
    expect(operatorCan("changes_requested")).toEqual({ edit: true, submit: true, delete: false });
    expect(operatorCan("submitted").edit).toBe(false);
    expect(adminCan("submitted").approve).toBe(true);
    expect(adminCan("draft").approve).toBe(false);
  });
});

describe("vessel CSV import (DASH-ADM-020–025)", () => {
  const none = { sourceRefs: new Set<string>(), names: new Set<string>(), slugs: new Set<string>() };
  const head = "source_ref,name,type,route,category,cabin_count,max_guests,deck_count,year_built,description_en\n";

  it("the template parses, and its example row is refused", () => {
    const { rows, fileErrors } = parseVesselCsv(CSV_TEMPLATE, none);
    expect(fileErrors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("error");
  });
  it("valid rows become drafts with safe slugs; quoted commas and line breaks survive", () => {
    const csv =
      head + 'R1,"Sample, the Ship",motor,"Luxor–Aswan",standard,40,80,4,2010,"Line one\nline two"\nR2,Compare,sail,,,,,,,\n';
    const { rows } = parseVesselCsv(csv, { ...none, slugs: new Set(["sample-the-ship"]) });
    expect(rows.map((r) => r.status)).toEqual(["ok", "ok"]);
    expect(rows[0]!.vessel).toMatchObject({
      name: "Sample, the Ship",
      slug: "sample-the-ship-2",
      cabin_count: 40,
      description_en: "Line one\nline two",
    });
    expect(rows[1]!.vessel?.slug).toBe("compare-dahabiya");
  });
  it("explains every problem in a row", () => {
    const { rows } = parseVesselCsv(head + "R1,X,felucca,,premium,0,9999,40,1700,\n", none);
    expect(rows[0]!.status).toBe("error");
    expect(rows[0]!.messages.join(" ")).toMatch(
      /Type must be.*Category must be.*Cabin count.*Guest capacity.*Deck count.*Year built/s,
    );
  });
  it("skips duplicates of the catalogue and within the file, without touching existing records", () => {
    const existing = { sourceRefs: new Set(["r1"]), names: new Set(["kept vessel"]), slugs: new Set<string>() };
    const { rows } = parseVesselCsv(
      head + "R1,New,motor,,,,,,,\nR2,Kept Vessel,motor,,,,,,,\nR3,A,motor,,,,,,,\nR3,B,motor,,,,,,,\n",
      existing,
    );
    expect(rows.map((r) => r.status)).toEqual(["duplicate", "duplicate", "ok", "duplicate"]);
  });
  it("refuses files with wrong columns or a wrong encoding", () => {
    expect(parseVesselCsv("name,price\nX,100\n", none).fileErrors.join(" ")).toMatch(/Missing columns.*|Unknown columns: price/);
    expect(parseVesselCsv(head + "R1,Caf�,motor,,,,,,,\n", none).fileErrors[0]).toMatch(/not UTF-8/);
  });
});
