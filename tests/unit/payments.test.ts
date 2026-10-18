import { describe, expect, it } from "vitest";
import { commissionOf, deadlineRule, paymentDeadline, releaseDecision, reversalOf } from "@/lib/payments/deadlines";

const EASTER = [{ name: "Western Easter 2027", starts_on: "2027-03-21", ends_on: "2027-03-29" }];

describe("payment deadline season, by departure date (DASH-PAY-002–004, DATA-039)", () => {
  it.each([
    ["2026-12-23", "winter", 7],
    ["2026-12-24", "festive", 3],
    ["2026-12-31", "festive", 3],
    ["2027-01-01", "festive", 3],
    ["2027-01-07", "festive", 3],
    ["2027-01-08", "winter", 7],
    ["2027-04-30", "winter", 7],
    ["2027-05-01", "summer", 14],
    ["2027-09-30", "summer", 14],
    ["2027-10-01", "winter", 7],
    ["2027-03-20", "winter", 7],
    ["2027-03-21", "premium", 3],
    ["2027-03-29", "premium", 3],
    ["2027-03-30", "winter", 7],
  ])("departing %s → %s (%i days)", (departs, rule, days) => {
    expect(deadlineRule(departs, EASTER)).toMatchObject({ rule, days });
  });
  it("names the premium period (DASH-PAY-007)", () => {
    expect(deadlineRule("2027-03-25", EASTER).period).toBe("Western Easter 2027");
  });
});

describe("the deadline itself (DASH-PAY-005, DATA-039)", () => {
  it("counts days from the booking date and ends at Cairo midnight", () => {
    const d = paymentDeadline("2027-02-01", "2027-03-10", EASTER);
    expect(d).toMatchObject({ rule: "winter", days: 7, dueOn: "2027-02-08" });
    // Cairo is UTC+2 in February: the end of 8 Feb in Cairo is 22:00 UTC that day.
    expect(d.dueAt.toISOString()).toBe("2027-02-08T22:00:00.000Z");
  });
  it("uses summer time in summer", () => {
    expect(paymentDeadline("2027-06-01", "2027-08-10").dueAt.toISOString()).toBe("2027-06-15T21:00:00.000Z");
  });
  it("is never later than the day before departure", () => {
    expect(paymentDeadline("2027-06-01", "2027-06-05")).toMatchObject({ days: 14, dueOn: "2027-06-04" });
    expect(paymentDeadline("2026-12-22", "2026-12-24")).toMatchObject({ rule: "festive", dueOn: "2026-12-23" });
  });
  it("is the booking day itself for a booking the day before departure", () => {
    expect(paymentDeadline("2027-06-04", "2027-06-05").dueOn).toBe("2027-06-04");
  });
  it("keeps festive departures at 3 days even when booked months ahead", () => {
    expect(paymentDeadline("2026-10-18", "2026-12-28")).toMatchObject({ rule: "festive", dueOn: "2026-10-21" });
  });
});

describe("commission and payables (DATA-036, 037)", () => {
  it("takes 10 % of each verified payment, rounded half up, the rest is the operator's", () => {
    expect(commissionOf(250000)).toEqual({ commissionMinor: 25000, payableMinor: 225000 });
    expect(commissionOf(12345)).toEqual({ commissionMinor: 1235, payableMinor: 11110 });
    expect(commissionOf(5)).toEqual({ commissionMinor: 1, payableMinor: 4 });
  });
  it("reverses both in proportion to a refund", () => {
    expect(reversalOf({ amountMinor: 250000, commissionMinor: 25000 }, 125000)).toEqual({ commissionMinor: -12500, payableMinor: -112500 });
    expect(reversalOf({ amountMinor: 250000, commissionMinor: 25000 }, 250000)).toEqual({ commissionMinor: -25000, payableMinor: -225000 });
    expect(reversalOf({ amountMinor: 250000, commissionMinor: 25000 }, 0)).toEqual({ commissionMinor: 0, payableMinor: 0 });
  });
});

describe("release at the deadline (DATA-040, DASH-PAY-008, 009)", () => {
  const dueAt = new Date("2027-02-08T22:00:00Z");
  const base = { status: "awaiting_payment", dueAt, outstandingMinor: 100, reportedAwaiting: 0 };
  it("releases unpaid reservations after the deadline", () => {
    expect(releaseDecision({ ...base, now: new Date("2027-02-08T22:00:01Z") })).toBe("release");
    expect(releaseDecision({ ...base, now: new Date("2027-02-08T21:59:59Z") })).toBe("keep");
  });
  it("sends them to review when a reported payment awaits verification", () => {
    expect(releaseDecision({ ...base, reportedAwaiting: 1, now: new Date("2027-02-09T00:00:00Z") })).toBe("review");
  });
  it("keeps paid or already-closed reservations", () => {
    expect(releaseDecision({ ...base, outstandingMinor: 0, now: new Date("2027-03-01T00:00:00Z") })).toBe("keep");
    expect(releaseDecision({ ...base, status: "confirmed", now: new Date("2027-03-01T00:00:00Z") })).toBe("keep");
  });
});

describe("Stripe Checkout and webhooks (DATA-026, 028, 030, ADR-089)", async () => {
  const { default: Stripe } = await import("stripe");
  const { cardPayable, checkoutParams } = await import("@/lib/payments/checkout");

  it("charges the outstanding balance in the reservation's currency, cards in US$ or € only", () => {
    const p = checkoutParams({
      reservationId: "r1",
      reference: "NC-ABC234",
      vesselName: "Sample Ship",
      outstandingMinor: 125050,
      currency: "EUR",
      customerEmail: "a@example.test",
      siteUrl: "https://example.test/",
      nowSeconds: 1_800_000_000,
    });
    expect(p.line_items[0]!.price_data).toMatchObject({ currency: "eur", unit_amount: 125050 });
    expect(p.metadata).toEqual({ reservation_id: "r1", reference: "NC-ABC234" });
    expect(p.success_url).toBe("https://example.test/dashboard/journey/reservations/r1/?paid=1");
    expect(p.expires_at).toBe(1_800_000_000 + 1800);
    expect(cardPayable("USD") && cardPayable("EUR")).toBe(true);
    expect(cardPayable("EGP")).toBe(false);
  });

  it("accepts only events signed with our webhook secret, unchanged and recent", () => {
    const secret = "whsec_test_local_only";
    const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", data: { object: {} } });
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(Stripe.webhooks.constructEvent(payload, header, secret).id).toBe("evt_1");
    expect(() => Stripe.webhooks.constructEvent(payload, header, "whsec_other")).toThrow();
    expect(() => Stripe.webhooks.constructEvent(payload.replace("evt_1", "evt_2"), header, secret)).toThrow();
    const old = Stripe.webhooks.generateTestHeaderString({ payload, secret, timestamp: Math.floor(Date.now() / 1000) - 600 });
    expect(() => Stripe.webhooks.constructEvent(payload, old, secret)).toThrow();
  });
});
