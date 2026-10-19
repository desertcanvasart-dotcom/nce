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
