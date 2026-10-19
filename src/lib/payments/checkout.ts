/**
 * Stripe Checkout for a reservation's outstanding balance (DATA-026, 030, ADR-089). Pure, so it is unit-tested;
 * the server sends it to Stripe. Card details are entered on Stripe's page and never reach Nilecruz.
 */
export const CARD_CURRENCIES = ["USD", "EUR"] as const;
export const cardPayable = (currency: string) => (CARD_CURRENCIES as readonly string[]).includes(currency);

export function checkoutParams(r: {
  reservationId: string;
  reference: string;
  vesselName: string;
  outstandingMinor: number;
  currency: string;
  customerEmail: string;
  siteUrl: string;
  nowSeconds: number;
}) {
  const base = `${r.siteUrl.replace(/\/$/, "")}/dashboard/journey/reservations/${r.reservationId}/`;
  return {
    mode: "payment" as const,
    customer_email: r.customerEmail,
    client_reference_id: r.reservationId,
    metadata: { reservation_id: r.reservationId, reference: r.reference },
    payment_intent_data: { metadata: { reservation_id: r.reservationId, reference: r.reference } },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: r.currency.toLowerCase(),
          unit_amount: r.outstandingMinor,
          product_data: { name: `Reservation ${r.reference}`, description: `${r.vesselName}: balance due` },
        },
      },
    ],
    // Stripe's minimum; an abandoned page stops being payable well before the next attempt.
    expires_at: r.nowSeconds + 30 * 60,
    success_url: `${base}?paid=1`,
    cancel_url: base,
  };
}

/** DATA-027: Stripe Checkout for a tour order, payable until its 60-minute hold ends (at least Stripe's 30 minutes). */
export function tourCheckoutParams(o: {
  orderId: string;
  reference: string;
  tourName: string;
  startsLabel: string;
  totalMinor: number;
  currency: string;
  customerEmail: string;
  siteUrl: string;
  nowSeconds: number;
  holdUntilSeconds: number;
}) {
  const base = `${o.siteUrl.replace(/\/$/, "")}/dashboard/journey/tours/${o.orderId}/`;
  return {
    mode: "payment" as const,
    customer_email: o.customerEmail,
    client_reference_id: o.orderId,
    metadata: { tour_order_id: o.orderId, reference: o.reference },
    payment_intent_data: { metadata: { tour_order_id: o.orderId, reference: o.reference } },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: o.currency.toLowerCase(),
          unit_amount: o.totalMinor,
          product_data: { name: `Tour order ${o.reference}`, description: `${o.tourName}, ${o.startsLabel}` },
        },
      },
    ],
    expires_at: Math.max(o.holdUntilSeconds, o.nowSeconds + 30 * 60),
    success_url: `${base}?paid=1`,
    cancel_url: base,
  };
}
