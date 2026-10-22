import type { FetchProblemCode } from "./safe-fetch";

/** ADR-103: what a queued webhook delivery carries, and how it's written on the wire. */
export type WebhookEvent = "inventory.changed" | "hold.expired" | "booking.confirmed";
export type Delivery = {
  id: string;
  org_id: string;
  event: string;
  payload: Record<string, unknown>;
  created_at: string;
  attempts: number;
  url: string;
};

/** The body: the event id (also in Nilecruz-Event-Id), its type, when it was queued, and its data. */
export function webhookBody(d: Pick<Delivery, "id" | "event" | "payload" | "created_at">): string {
  return JSON.stringify({ id: d.id, type: d.event, created_at: d.created_at, data: d.payload });
}

/** Why a delivery didn't land, in words the operator's connection health shows. */
export function webhookProblem(why: number | FetchProblemCode): string {
  if (typeof why === "number") {
    if (why >= 300 && why < 400) return `Your server answered ${why} (a redirect); webhooks don't follow redirects.`;
    return `Your server answered ${why}; anything but 2xx is tried again.`;
  }
  switch (why) {
    case "address":
    case "unsafe":
      return "The webhook address isn't allowed: it must be https, on the public internet.";
    case "dns":
      return "The webhook address could not be found.";
    case "timeout":
      return "Your server took longer than 10 seconds to answer.";
    case "tls":
      return "Your server's security certificate could not be verified.";
    default:
      return "Your server could not be reached.";
  }
}
