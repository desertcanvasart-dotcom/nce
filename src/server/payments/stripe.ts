import "server-only";
import Stripe from "stripe";
import { getAdminDb } from "@/server/db/admin";
import { serverEnv } from "@/server/env";

/** Null when no key is set: card payments then say they aren't switched on (ADR-089). */
export function getStripe(): Stripe | null {
  return serverEnv.STRIPE_SECRET_KEY ? new Stripe(serverEnv.STRIPE_SECRET_KEY) : null;
}

export type WebhookOutcome = { status: number; body: Record<string, unknown> };

/**
 * DATA-028: payment status changes only here, from a webhook whose signature Stripe made with our secret.
 * A repeated event changes nothing (one payment intent is one payment). A payment that arrives for a reservation
 * that is no longer waiting is refunded straight back and recorded.
 */
export async function handleStripeWebhook(rawBody: string, signature: string): Promise<WebhookOutcome> {
  const secret = serverEnv.STRIPE_WEBHOOK_SECRET;
  if (!secret) return { status: 503, body: { error: "stripe_not_configured" } };
  let event: Stripe.Event;
  try {
    // Verifying a signature needs no API key; a real key is used only to issue refunds.
    event = Stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return { status: 400, body: { error: "signature_verification_failed" } };
  }
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return { status: 200, body: { received: true, ignored: event.type } };
  }
  const session = event.data.object as Stripe.Checkout.Session;
  const reservationId = session.metadata?.reservation_id;
  // "complete" isn't "paid": some methods settle later and send async_payment_succeeded.
  if (!reservationId || session.payment_status !== "paid" || !session.payment_intent) {
    return { status: 200, body: { received: true, pending: true } };
  }
  const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
  const amount = session.amount_total ?? 0;
  const currency = (session.currency ?? "").toUpperCase();
  const db = getAdminDb();
  const { data, error } = await db.rpc("service_card_payment", {
    res: reservationId,
    session_id: session.id,
    intent,
    amount,
    cur: currency,
  });
  if (error) return { status: 500, body: { error: "record_failed" } }; // Stripe retries
  if (data === "refund") {
    const stripe = getStripe();
    if (!stripe) return { status: 500, body: { error: "refund_needed_but_stripe_not_configured" } };
    const refund = await stripe.refunds.create({ payment_intent: intent }, { idempotencyKey: `late-${intent}` });
    await db.rpc("service_card_refunded", { res: reservationId, session_id: session.id, intent, refund: refund.id, amount, cur: currency });
    return { status: 200, body: { received: true, refunded: true } };
  }
  return { status: 200, body: { received: true, result: data } };
}
