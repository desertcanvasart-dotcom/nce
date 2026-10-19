import { describe, expect, it } from "vitest";
import { tourCheckoutParams } from "@/lib/payments/checkout";

const base = {
  orderId: "11111111-1111-4111-8111-111111111111",
  reference: "NT-ABCDEF",
  tourName: "Abu Simbel Day Trip",
  startsLabel: "20 Nov 2026 04:00 Cairo",
  totalMinor: 24000,
  currency: "USD",
  customerEmail: "guest@example.test",
  siteUrl: "https://nilecruz.example/",
  nowSeconds: 1_800_000_000,
  holdUntilSeconds: 1_800_000_000 + 60 * 60,
};

describe("Stripe Checkout for a tour order (DATA-027, DASH-PAY-014)", () => {
  it("is a separate payment: tour metadata only, never a reservation", () => {
    const p = tourCheckoutParams(base);
    expect(p.metadata).toEqual({ tour_order_id: base.orderId, reference: "NT-ABCDEF" });
    expect(JSON.stringify(p)).not.toMatch(/reservation_id/);
    expect(p.line_items[0]!.price_data).toMatchObject({ currency: "usd", unit_amount: 24000 });
    expect(p.success_url).toBe(`https://nilecruz.example/dashboard/journey/tours/${base.orderId}/?paid=1`);
  });
  it("stays payable until the 60-minute hold ends, and never less than Stripe's 30 minutes", () => {
    expect(tourCheckoutParams(base).expires_at).toBe(base.holdUntilSeconds);
    expect(tourCheckoutParams({ ...base, holdUntilSeconds: base.nowSeconds + 600 }).expires_at).toBe(base.nowSeconds + 1800);
  });
});
