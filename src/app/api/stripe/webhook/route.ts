import { handleStripeWebhook } from "@/server/payments/stripe";

/** Stripe webhooks (DATA-028). The body is read raw: the signature covers the exact bytes. */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const out = await handleStripeWebhook(body, request.headers.get("stripe-signature") ?? "");
  return Response.json(out.body, { status: out.status });
}
