import { describe, expect, it } from "vitest";
import { lintText } from "@/lib/copy-rules";

describe("copy rules (BRAND-001, BRAND-002)", () => {
  it.each(["The best cruise", "An unbeatable price", "A once in a lifetime trip", "Once-in-a-lifetime"])(
    "rejects banned words: %s",
    (text) => {
      expect(lintText(text).map((p) => p.rule)).toContain("banned-word");
    },
  );
  it("allows the guide's editorial 'Best for' labels", () => {
    expect(lintText("Best for honeymoons")).toEqual([]);
  });
  it.each(["Book now!", "今すぐ予約！"])("rejects exclamation marks: %s", (text) => {
    expect(lintText(text).map((p) => p.rule)).toContain("exclamation");
  });
  it("rejects emoji but not typographic symbols", () => {
    expect(lintText("Sail away ⛵").map((p) => p.rule)).toContain("emoji");
    expect(lintText("© 2026 Nilecruz™")).toEqual([]);
  });
  it("passes plain brand copy", () => {
    expect(lintText("Lunch is served on the top deck while the crew trims the sails.")).toEqual([]);
  });
});
