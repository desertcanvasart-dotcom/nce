import { describe, expect, it } from "vitest";
import { cairoOffsetHours, formatCairo } from "@/lib/time/cairo";

describe("Cairo time (DATA-003)", () => {
  it("shows winter time (UTC+2)", () => {
    expect(formatCairo("2027-01-15T12:00:00Z")).toBe("15 Jan 2027 14:00 Cairo");
    expect(cairoOffsetHours(new Date("2027-01-15T12:00:00Z"))).toBe(2);
  });
  it("shows Egyptian summer time (UTC+3)", () => {
    expect(formatCairo("2027-07-15T12:00:00Z")).toBe("15 Jul 2027 15:00 Cairo");
    expect(cairoOffsetHours(new Date("2027-07-15T12:00:00Z"))).toBe(3);
  });
  it("handles the night summer time ends (29 Oct 2026: 23:30 happens twice)", () => {
    expect(formatCairo("2026-10-29T20:30:00Z")).toBe("29 Oct 2026 23:30 Cairo");
    expect(formatCairo("2026-10-29T21:30:00Z")).toBe("29 Oct 2026 23:30 Cairo");
    expect(cairoOffsetHours(new Date("2026-10-29T20:30:00Z"))).toBe(3);
    expect(cairoOffsetHours(new Date("2026-10-29T21:30:00Z"))).toBe(2);
  });
  it("can show the date alone, and refuses invalid input", () => {
    expect(formatCairo("2027-03-21T23:30:00Z", { time: false })).toBe("22 Mar 2027");
    expect(() => formatCairo("not a date")).toThrow(/Invalid date/);
  });
});
