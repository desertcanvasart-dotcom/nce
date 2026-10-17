import { describe, expect, it } from "vitest";
import { anySample, withSample } from "@/lib/data/sample";
import { pickTranslation } from "@/lib/data/translations";

const rows = [
  { locale: "en", summary: "English summary", description: "English description" },
  { locale: "es", summary: "Resumen", description: null },
  { locale: "ja", summary: "  ", description: null },
];

describe("pickTranslation (I18N-011)", () => {
  it("uses the visitor's language when present", () => {
    expect(pickTranslation(rows, "es", "summary")).toEqual({ value: "Resumen", locale: "es", fallback: false });
  });
  it("falls back to English for missing or blank fields", () => {
    expect(pickTranslation(rows, "es", "description")).toEqual({ value: "English description", locale: "en", fallback: true });
    expect(pickTranslation(rows, "ja", "summary")).toEqual({ value: "English summary", locale: "en", fallback: true });
  });
  it("English is never a fallback of itself", () => {
    expect(pickTranslation(rows, "en", "summary")?.fallback).toBe(false);
  });
  it("returns null when nothing exists", () => {
    expect(pickTranslation(rows.slice(0, 0), "ja", "summary")).toBeNull();
    expect(pickTranslation(null as typeof rows | null, "en", "summary")).toBeNull();
  });
});

describe("sample flag (DATA-006)", () => {
  it("maps is_sample to the components' sample prop", () => {
    expect(withSample({ id: 1, name: "Sample Dahabiya One", is_sample: true })).toEqual({
      id: 1,
      name: "Sample Dahabiya One",
      sample: true,
    });
    expect(withSample({ id: 2, is_sample: false }).sample).toBe(false);
  });
  it("a mixed view is sample if any record is", () => {
    expect(anySample([{ is_sample: false }, { is_sample: true }])).toBe(true);
    expect(anySample([{ is_sample: false }])).toBe(false);
  });
});
