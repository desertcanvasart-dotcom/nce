import { describe, expect, it } from "vitest";
import { dayText } from "@/components/calendar/SeasonCalendar";
import { radarPoints, ring } from "@/lib/evaluation/radar";
import { parseCompared, toggled } from "@/lib/marketplace/compare-store";
import { paymentDeadline } from "@/lib/payments/deadlines";

describe("EXP-009 the evaluation radar", () => {
  it("puts a full mark on the rim and a half mark halfway, whatever the weight", () => {
    const [full, half] = radarPoints(
      [
        { key: "a", label: "A", weight: 20, points: 20 },
        { key: "b", label: "B", weight: 10, points: 5 },
      ],
      100,
      150,
    );
    expect(full).toEqual({ x: 150, y: 50, share: 1 }); // straight up
    expect(half!.share).toBe(0.5);
    expect(Math.round(Math.hypot(half!.x - 150, half!.y - 150))).toBe(50);
  });
  it("keeps scores inside the rim", () => {
    expect(radarPoints([{ key: "a", label: "A", weight: 10, points: 12 }], 100, 150)[0]!.share).toBe(1);
    expect(ring(4, 100, 150)).toBe("150,50 250,150 150,250 50,150");
  });
});

describe("EXP-004 the compare tray", () => {
  const a = { slug: "a", name: "A" };
  const b = { slug: "b", name: "B" };
  const c = { slug: "c", name: "C" };
  it("holds three at most and says when it's full", () => {
    expect(toggled([a, b, c], { slug: "d", name: "D" }, true)).toEqual({ list: [a, b, c], full: true });
    expect(toggled([a, b], c, true)).toEqual({ list: [a, b, c], full: false });
    expect(toggled([a, b, c], b, false)).toEqual({ list: [a, c], full: false });
  });
  it("reads back only what it wrote, safely", () => {
    expect(parseCompared(JSON.stringify([a, { slug: "Bad Slug!", name: "x" }, b]))).toEqual([a, b]);
    expect(parseCompared("not json")).toEqual([]);
    expect(parseCompared(null)).toEqual([]);
  });
});

describe("EXP-006 the season and deadline calendar", () => {
  it("says the deadline the booking rules give (ADR-027)", () => {
    const periods = [{ name: "Easter", starts_on: "2027-03-21", ends_on: "2027-03-29" }];
    expect(dayText("2026-10-21", "2026-11-30", periods)).toBe(
      `Sail on Mon, 30 Nov 2026: the main season. Book today and pay in full by Wed, 28 Oct 2026.`,
    );
    expect(paymentDeadline("2026-10-21", "2026-11-30", periods).dueOn).toBe("2026-10-28");
    expect(dayText("2026-10-21", "2027-03-25", periods)).toContain("Easter. Book today and pay in full by Sat, 24 Oct 2026.");
    expect(dayText("2026-10-21", "2027-06-10", periods)).toContain("summer. Book today and pay in full by Wed, 4 Nov 2026.");
    expect(dayText("2026-10-21", "2026-10-20", periods)).toBe("Tue, 20 Oct 2026 has passed.");
  });
});
