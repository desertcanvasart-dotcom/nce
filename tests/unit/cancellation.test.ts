import { describe, expect, it } from "vitest";
import { cancellationOutcome, daysBetween, quoteCancellation } from "@/lib/payments/cancellation";

// The standard Nilecruz bands, supplied 19 Oct 2026 (CONTENT-NEEDED #4).
const LUXURY = [
  { from_days: 181, percent: 0 },
  { from_days: 121, percent: 15 },
  { from_days: 91, percent: 50 },
  { from_days: 0, percent: 100 },
];
const STANDARD = [
  { from_days: 121, percent: 0 },
  { from_days: 91, percent: 25 },
  { from_days: 60, percent: 35 },
  { from_days: 30, percent: 50 },
  { from_days: 0, percent: 100 },
];
const DEPARTS = "2027-06-30";
const dayBefore = (days: number) => new Date(Date.parse(`${DEPARTS}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);

describe("Cairo days before departure", () => {
  it("counts calendar days, across months and a leap year", () => {
    expect(daysBetween("2027-06-29", "2027-06-30")).toBe(1);
    expect(daysBetween("2027-06-30", "2027-06-30")).toBe(0);
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
  });
});

describe("cancellation charge at every band edge (DASH-PAY-011, 012)", () => {
  it.each([
    [200, 0],
    [181, 0],
    [180, 15],
    [121, 15],
    [120, 50],
    [91, 50],
    [90, 100],
    [1, 100],
    [0, 100],
  ])("luxury and branded: %i days before → %i %%", (days, percent) => {
    expect(quoteCancellation(LUXURY, 400_000, 400_000, dayBefore(days), DEPARTS)).toMatchObject({ daysBefore: days, percent });
  });
  it.each([
    [121, 0],
    [120, 25],
    [91, 25],
    [90, 35],
    [60, 35],
    [59, 50],
    [30, 50],
    [29, 100],
    [0, 100],
  ])("other vessels: %i days before → %i %%", (days, percent) => {
    expect(quoteCancellation(STANDARD, 400_000, 400_000, dayBefore(days), DEPARTS)).toMatchObject({ daysBefore: days, percent });
  });
  it("refuses after departure", () => {
    expect(() => quoteCancellation(STANDARD, 400_000, 0, "2027-07-01", DEPARTS)).toThrow(/already left/);
  });
});

describe("charge, refund, and nothing owed beyond what was paid (ADR-094)", () => {
  it("refunds what was paid beyond the charge", () => {
    expect(quoteCancellation(STANDARD, 400_000, 400_000, dayBefore(75), DEPARTS)).toMatchObject({
      chargeMinor: 140_000,
      refundMinor: 260_000,
      keptMinor: 140_000,
    });
  });
  it("keeps only what was paid when less than the charge was paid; nothing more is owed", () => {
    expect(quoteCancellation(STANDARD, 400_000, 100_000, dayBefore(40), DEPARTS)).toMatchObject({
      chargeMinor: 200_000,
      refundMinor: 0,
      keptMinor: 100_000,
    });
    expect(quoteCancellation(STANDARD, 400_000, 0, dayBefore(40), DEPARTS)).toMatchObject({ refundMinor: 0, keptMinor: 0 });
  });
  it("refunds everything with no charge, and nothing is owed when unpaid", () => {
    expect(quoteCancellation(LUXURY, 400_000, 400_000, dayBefore(181), DEPARTS)).toMatchObject({
      chargeMinor: 0,
      refundMinor: 400_000,
    });
    expect(quoteCancellation(LUXURY, 400_000, 0, dayBefore(181), DEPARTS)).toMatchObject({
      refundMinor: 0,
      keptMinor: 0,
    });
  });
  it("rounds the charge half up to the minor unit", () => {
    expect(quoteCancellation(STANDARD, 100_001, 0, dayBefore(75), DEPARTS).chargeMinor).toBe(35_000);
    expect(quoteCancellation(LUXURY, 333, 0, dayBefore(150), DEPARTS).chargeMinor).toBe(50);
  });
});

describe("the booking page's sentence (ADR-094)", () => {
  const m = (n: number) => `$${n / 100}`;
  it("says an unpaid booking costs nothing to cancel", () => {
    expect(cancellationOutcome({ charge_minor: 70_000, paid_minor: 0, refund_minor: 0 }, m)).toBe(
      "You have paid nothing yet, so cancelling costs nothing: the charge only comes out of payments made.",
    );
  });
  it("keeps a part payment and asks for nothing more", () => {
    expect(cancellationOutcome({ charge_minor: 70_000, paid_minor: 50_000, refund_minor: 0 }, m)).toBe(
      "You have paid $500; it is kept towards the charge, and nothing more is owed.",
    );
  });
  it("refunds what was paid beyond the charge, or everything when nothing is charged", () => {
    expect(cancellationOutcome({ charge_minor: 70_000, paid_minor: 200_000, refund_minor: 130_000 }, m, "Your company has")).toBe(
      "Your company has paid $2000, so $1300 would be refunded.",
    );
    expect(cancellationOutcome({ charge_minor: 0, paid_minor: 200_000, refund_minor: 200_000 }, m)).toBe(
      "All $2000 paid would be refunded.",
    );
  });
});
