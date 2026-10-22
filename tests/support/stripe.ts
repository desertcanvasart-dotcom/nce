import Stripe from "stripe";

/** A test-only webhook secret for the local e2e server. Real Stripe secrets live only in Railway and .env.local. */
export const STRIPE_WEBHOOK_TEST_SECRET = "whsec_e2e_local_only_not_a_stripe_secret";

/** A checkout.session.completed event as Stripe would send it, signed with the test secret. */
export function paidCheckoutEvent(reservationId: string, amountMinor: number, currency: string, id = `${Date.now()}`) {
  const payload = JSON.stringify({
    id: `evt_test_${id}`,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_test_${id}`,
        object: "checkout.session",
        payment_status: "paid",
        payment_intent: `pi_test_${id}`,
        amount_total: amountMinor,
        currency: currency.toLowerCase(),
        metadata: { reservation_id: reservationId },
      },
    },
  });
  return { payload, signature: Stripe.webhooks.generateTestHeaderString({ payload, secret: STRIPE_WEBHOOK_TEST_SECRET }) };
}

/** A paid Checkout event for a tour order (DATA-027), signed with the test secret. */
export function paidTourEvent(orderId: string, amountMinor: number, currency: string, id = `${Date.now()}`) {
  const payload = JSON.stringify({
    id: `evt_test_tour_${id}`,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_test_tour_${id}`,
        object: "checkout.session",
        payment_status: "paid",
        payment_intent: `pi_test_tour_${id}`,
        amount_total: amountMinor,
        currency: currency.toLowerCase(),
        metadata: { tour_order_id: orderId },
      },
    },
  });
  return { payload, signature: Stripe.webhooks.generateTestHeaderString({ payload, secret: STRIPE_WEBHOOK_TEST_SECRET }) };
}

/** ADR-102: one Checkout for a cruise and Nilecruz's programme, signed with the test secret (two parts in the metadata). */
export function paidCruiseAndProgrammeEvent(
  reservationId: string,
  orderId: string,
  cruiseMinor: number,
  programmeMinor: number,
  currency: string,
  id = `${Date.now()}`,
) {
  const payload = JSON.stringify({
    id: `evt_test_${id}`,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_test_${id}`,
        object: "checkout.session",
        payment_status: "paid",
        payment_intent: `pi_test_${id}`,
        amount_total: cruiseMinor + programmeMinor,
        currency: currency.toLowerCase(),
        metadata: {
          reservation_id: reservationId,
          programme_order_id: orderId,
          cruise_amount: String(cruiseMinor),
          programme_amount: String(programmeMinor),
        },
      },
    },
  });
  return { payload, signature: Stripe.webhooks.generateTestHeaderString({ payload, secret: STRIPE_WEBHOOK_TEST_SECRET }) };
}
