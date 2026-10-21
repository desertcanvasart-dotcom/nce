import { describe, expect, it } from "vitest";
import * as page from "@/content/operator-connect";

const all = JSON.stringify(page);

describe("How operators connect (PAGE-107)", () => {
  it("covers the six ways, each with steps, what Nilecruz does, how often, and a screenshot", () => {
    expect(page.WAYS.map((w) => w.id)).toEqual(["sheet", "one-tap", "dashboard", "feed", "api", "allotments"]);
    for (const w of page.WAYS) {
      expect(w.steps.length).toBeGreaterThan(1);
      expect(w.weDo.length).toBeGreaterThan(0);
      expect(w.update).toBeTruthy();
      expect(w.shots.length).toBeGreaterThan(0);
      for (const s of w.shots) {
        expect(s.file).toMatch(/^\/images\/operators\/[a-z-]+\.webp$/);
        expect(s.alt.length).toBeGreaterThan(40);
      }
    }
  });
  it("explains every one-tap button, the hold, the reply time and the reminders", () => {
    const tap = JSON.stringify(page.WAYS.find((w) => w.id === "one-tap"));
    for (const word of [
      "Confirm",
      "Decline",
      "Hold 72h",
      "Offer other",
      "6 hours",
      "reminder",
      "09:00",
      "7 days",
      "names or contact details",
    ])
      expect(tap).toContain(word);
  });
  it("states the booking rule as the system applies it (ADR-099)", () => {
    const rule = page.BOOKING_RULE.paragraphs.join(" ");
    expect(rule).toContain("2 hours");
    expect(rule).toContain("7 days");
    expect(rule).toContain("pays after you confirm");
  });
  it("never publishes commission or prices for operators", () => {
    expect(all).not.toMatch(/commission|\d+\s?%/i);
  });
  it("keeps the house style: no exclamation marks, no 'simply' or 'just'", () => {
    expect(all).not.toMatch(/!|\bsimply\b|\bjust\b/i);
  });
  it("answers the questions operators ask", () => {
    expect(page.FAQS.length).toBeGreaterThanOrEqual(5);
    expect(page.FAQS.every((f) => f.q.endsWith("?") && f.a.length > 40)).toBe(true);
  });
});
