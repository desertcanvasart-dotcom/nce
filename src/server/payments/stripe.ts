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
  // Tour orders are their own payments (DASH-PAY-014): never mixed with a cruise reservation.
  if (session.metadata?.tour_order_id) return handleTourPayment(session, event.id);
  const reservationId = session.metadata?.reservation_id;
  // ADR-102: a cruise and Nilecruz's programme paid on one page are recorded as two payments.
  if (reservationId && session.metadata?.programme_order_id) return handleCruiseAndProgramme(session, event.id);
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
  // A reservation this database doesn't have (one Stripe sandbox feeds several environments): retrying can't help,
  // and endless 500s would get the endpoint disabled. Logged, so a real mismatch is still seen.
  if (error?.code === "P0002" || error?.code === "22P02") {
    console.error("stripe webhook: unknown reservation", { reservation: reservationId, intent, event: event.id });
    return { status: 200, body: { received: true, ignored: "unknown_reservation" } };
  }
  if (error) return { status: 500, body: { error: "record_failed" } }; // Stripe retries
  if (data === "refund") {
    const stripe = getStripe();
    if (!stripe) return { status: 500, body: { error: "refund_needed_but_stripe_not_configured" } };
    const refund = await stripe.refunds.create({ payment_intent: intent }, { idempotencyKey: `late-${intent}` });
    await db.rpc("service_card_refunded", {
      res: reservationId,
      session_id: session.id,
      intent,
      refund: refund.id,
      amount,
      cur: currency,
    });
    return { status: 200, body: { received: true, refunded: true } };
  }
  return { status: 200, body: { received: true, result: data } };
}

type RefundPart = { payment_id: string; payment_intent: string; amount_minor: number };

/**
 * DATA-029: refunds an approved cancellation to the card, part by part, and records each one (service role, after the
 * caller's finance-admin plan). Returns null when done, or what went wrong in plain words.
 */
export async function issueStripeRefunds(
  reservationId: string,
  cancellationId: string,
  plan: RefundPart[],
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return "Card refunds aren't switched on: there's no Stripe key. Record a manual refund instead.";
  const db = getAdminDb();
  for (const part of plan) {
    let refundId: string;
    try {
      const refund = await stripe.refunds.create(
        {
          payment_intent: part.payment_intent,
          amount: Number(part.amount_minor),
          metadata: { reservation_id: reservationId, cancellation_id: cancellationId },
        },
        // The same part always gets the same key, so a retried click can't refund twice.
        { idempotencyKey: `cancel-${cancellationId}-${part.payment_id}-${part.amount_minor}` },
      );
      refundId = refund.id;
    } catch (e) {
      return `Stripe refused the refund: ${e instanceof Error ? e.message : "unknown error"}. Nothing was recorded.`;
    }
    const { error } = await db.rpc("service_record_stripe_refund", {
      target: cancellationId,
      pay: part.payment_id,
      amount: Number(part.amount_minor),
      refund: refundId,
    });
    if (error) {
      console.error("card refund not recorded", { cancellation: cancellationId, refund: refundId, error: error.message });
      return `Stripe issued refund ${refundId}, but it couldn't be recorded here. Record it as a manual refund with that reference.`;
    }
  }
  return null;
}

/** DATA-027: a tour order paid by card. Late, cancelled or mismatched payments go straight back. */
async function handleTourPayment(session: Stripe.Checkout.Session, eventId: string): Promise<WebhookOutcome> {
  const orderId = session.metadata!.tour_order_id!;
  if (session.payment_status !== "paid" || !session.payment_intent)
    return { status: 200, body: { received: true, pending: true } };
  const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
  const amount = session.amount_total ?? 0;
  const currency = (session.currency ?? "").toUpperCase();
  const db = getAdminDb();
  const { data, error } = await db.rpc("service_tour_payment", {
    target: orderId,
    session_id: session.id,
    intent,
    amount,
    cur: currency,
  });
  if (error?.code === "P0002" || error?.code === "22P02") {
    console.error("stripe webhook: unknown tour order", { order: orderId, intent, event: eventId });
    return { status: 200, body: { received: true, ignored: "unknown_tour_order" } };
  }
  if (error) return { status: 500, body: { error: "record_failed" } }; // Stripe retries
  if (data === "refund") {
    const stripe = getStripe();
    if (!stripe) return { status: 500, body: { error: "refund_needed_but_stripe_not_configured" } };
    const refund = await stripe.refunds.create({ payment_intent: intent }, { idempotencyKey: `late-tour-${intent}` });
    await db.rpc("service_tour_refunded", {
      target: orderId,
      session_id: session.id,
      intent,
      refund: refund.id,
      amount,
      cur: currency,
    });
    return { status: 200, body: { received: true, refunded: true } };
  }
  return { status: 200, body: { received: true, result: data } };
}

/** DASH-PAY-014: refund an approved tour cancellation to the card. Returns null when done, or what went wrong. */
export async function issueTourRefund(
  orderId: string,
  payment: { id: string; intent: string },
  amountMinor: number,
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return "Card refunds aren't switched on: there's no Stripe key. Record a manual refund instead.";
  let refundId: string;
  try {
    const refund = await stripe.refunds.create(
      { payment_intent: payment.intent, amount: amountMinor, metadata: { tour_order_id: orderId } },
      { idempotencyKey: `tour-cancel-${orderId}-${payment.id}-${amountMinor}` },
    );
    refundId = refund.id;
  } catch (e) {
    return `Stripe refused the refund: ${e instanceof Error ? e.message : "unknown error"}. Nothing was recorded.`;
  }
  const { error } = await getAdminDb().rpc("service_record_tour_refund", {
    target: orderId,
    pay: payment.id,
    amount: amountMinor,
    refund: refundId,
  });
  if (error) {
    console.error("tour refund not recorded", { order: orderId, refund: refundId, error: error.message });
    return `Stripe issued refund ${refundId}, but it couldn't be recorded here. Record it as a manual refund with that reference.`;
  }
  return null;
}

/**
 * ADR-102: one checkout for a cruise and Nilecruz's sightseeing programme. Each part is recorded on its own (the cruise
 * as the reservation's payment, the programme as the tour order's), with the amounts the checkout was built with. A
 * part that can't be taken (late, cancelled, changed) goes back to the card on its own; the other part stands.
 */
async function handleCruiseAndProgramme(session: Stripe.Checkout.Session, eventId: string): Promise<WebhookOutcome> {
  const m = session.metadata!;
  if (session.payment_status !== "paid" || !session.payment_intent)
    return { status: 200, body: { received: true, pending: true } };
  const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
  const currency = (session.currency ?? "").toUpperCase();
  const cruise = Number(m.cruise_amount);
  const programme = Number(m.programme_amount);
  const db = getAdminDb();
  if (!(cruise > 0 && programme > 0) || cruise + programme !== (session.amount_total ?? 0)) {
    console.error("stripe webhook: cruise and programme amounts don't add up", { event: eventId, intent });
    return { status: 500, body: { error: "amounts_mismatch" } };
  }
  const parts = [
    {
      rpc: "service_card_payment" as const,
      args: { res: m.reservation_id!, session_id: session.id, intent, amount: cruise, cur: currency },
      refunded: async (refund: string) =>
        db.rpc("service_card_refunded", {
          res: m.reservation_id!,
          session_id: session.id,
          intent,
          refund,
          amount: cruise,
          cur: currency,
        }),
      amount: cruise,
      key: `late-cruise-${intent}`,
    },
    {
      rpc: "service_tour_payment" as const,
      args: { target: m.programme_order_id!, session_id: session.id, intent, amount: programme, cur: currency },
      refunded: async (refund: string) =>
        db.rpc("service_tour_refunded", {
          target: m.programme_order_id!,
          session_id: session.id,
          intent,
          refund,
          amount: programme,
          cur: currency,
        }),
      amount: programme,
      key: `late-programme-${intent}`,
    },
  ];
  const results: string[] = [];
  for (const part of parts) {
    const { data, error } =
      part.rpc === "service_card_payment"
        ? await db.rpc("service_card_payment", part.args as never)
        : await db.rpc("service_tour_payment", part.args as never);
    if (error?.code === "P0002" || error?.code === "22P02") {
      console.error("stripe webhook: unknown booking", { event: eventId, intent, part: part.rpc });
      results.push("unknown");
      continue;
    }
    if (error) return { status: 500, body: { error: "record_failed" } }; // Stripe retries; recorded parts say "duplicate"
    if (data === "refund") {
      const stripe = getStripe();
      if (!stripe) return { status: 500, body: { error: "refund_needed_but_stripe_not_configured" } };
      const refund = await stripe.refunds.create({ payment_intent: intent, amount: part.amount }, { idempotencyKey: part.key });
      await part.refunded(refund.id);
    }
    results.push(String(data));
  }
  return { status: 200, body: { received: true, result: results } };
}
