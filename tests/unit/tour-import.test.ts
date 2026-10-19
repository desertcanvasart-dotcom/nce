import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { suggestedPolicy, STANDARD_POLICIES } from "@/lib/payments/policies";
import { bandsProblem } from "@/lib/tours/tours";
import { planTourImport, type SourceTour } from "../../scripts/lib/tour-import";

const tours = JSON.parse(readFileSync("docs/imports/nilecruz-tours.json", "utf8")) as SourceTour[];

describe("the nilecruz.com tours import (CONTENT-NEEDED #39)", () => {
  it("is valid as it stands", () => {
    expect(planTourImport(tours).problems).toEqual([]);
    expect(tours).toHaveLength(9);
  });
  it("keeps meet and assist and airport transfers out of the sightseeing programs (Faris, 19 Oct 2026)", () => {
    const programs = tours.filter((t) => /sightseeing/i.test(t.name));
    expect(programs).toHaveLength(2);
    for (const p of programs) {
      expect(p.inclusions.join(" ")).not.toMatch(/meet and assist|airport/i);
      expect(p.exclusions.join(" ")).toMatch(/Airport transfers and meet and assist, sold separately/);
    }
    const broken = { ...programs[0]!, inclusions: [...programs[0]!.inclusions, "Meet and assist at the arrival airport"] };
    expect(planTourImport([broken]).problems.join()).toMatch(/can't include meet and assist/);
  });
  it("sells airport transfers private only, and meet and assist on its own", () => {
    expect(tours.filter((t) => t.kind === "transfer").every((t) => /private/i.test(t.name))).toBe(true);
    expect(tours.filter((t) => /^Meet and Assist/.test(t.name)).map((t) => t.location)).toEqual(["Aswan", "Luxor"]);
    const shared = { ...tours.find((t) => t.kind === "transfer")!, name: "Aswan Airport Transfer" };
    expect(planTourImport([shared]).problems.join()).toMatch(/private only/);
  });
  it("refuses bad slugs, durations and duplicates", () => {
    const t = tours[2]!;
    const problems = planTourImport([{ ...t, slug: "Bad Slug", duration_minutes: 5 }, t, t]).problems.join("\n");
    expect(problems).toMatch(/slug isn't/);
    expect(problems).toMatch(/duration/);
    expect(problems).toMatch(/duplicate slug/);
  });
});

describe("standard cancellation policies (CONTENT-NEEDED #4)", () => {
  it("are valid band sets", () => {
    expect(bandsProblem(STANDARD_POLICIES.luxury.bands)).toBeNull();
    expect(bandsProblem(STANDARD_POLICIES.standard.bands)).toBeNull();
  });
  it.each([
    ["Sonesta Star Goddess", "luxury"],
    ["Movenpick Royal Lily", "luxury"],
    ["Mövenpick Darakum", "luxury"],
    ["Oberoi Philae", "luxury"],
    ["Historia", "luxury"],
    ["MS Solai", "luxury"],
    ["Mayfair", "luxury"],
    ["Nile Dolphin", "standard"],
    ["Solaire Nile", "standard"],
  ])("%s → %s", (name, preset) => {
    expect(suggestedPolicy(name)).toBe(preset);
  });
});
