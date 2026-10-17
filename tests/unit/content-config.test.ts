import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import { DOCUMENT_LOCALISED_TYPES, LOCALES } from "../../studio/locales";

describe("Sanity Studio configuration (I18N-011)", () => {
  it("offers exactly the site's languages, English first", () => {
    expect(LOCALES.map((l) => l.id)).toEqual([...routing.locales]);
    expect(LOCALES[0]?.id).toBe(routing.defaultLocale);
  });
  it("translates the editorial pieces as whole documents", () => {
    expect([...DOCUMENT_LOCALISED_TYPES].sort()).toEqual(["article", "destinationStory", "faq", "vesselTypeProfile"]);
  });
});
