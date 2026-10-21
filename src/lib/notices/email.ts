/**
 * PROPOSED-005, DASH-BND-007 (ADR-101): every dashboard notice also goes by email, in English for now. The notice's own
 * title is the subject; the body says what to do and links to the dashboard page. Nothing personal beyond what the
 * notice already shows is added.
 */
export type Notice = { kind: string; title: string; link: string | null };

/** People can turn these off (account settings). Bookings, payments, cancellations and reminders always go. */
export const OPTIONAL_KINDS = new Set(["offer.updated", "booking_request.held", "booking_request.new"]);

/**
 * Notices that already reach the inbox another way: operators get booking requests (and reminders) from the one-tap
 * dispatcher, and admins get escalations from it, so these aren't sent twice.
 */
export function emailedElsewhere(kind: string, orgKind: string | null): boolean {
  return (kind === "booking_request.new" && orgKind === "operator") || kind === "booking_request.escalation";
}

const NEXT: [RegExp, string][] = [
  [/^offer\./, "Open it to compare the offer and accept it before it expires."],
  [/^booking_request\.(declined|expired)/, "Open it to see other dates and ships."],
  [/^booking_request\.alternative/, "Open it to see what the operator offers instead."],
  [/^booking_request\./, "Open it to see where your request stands."],
  [/^reservation\.new/, "Open it to see the booking and how to pay."],
  [/^reservation\.released/, "Open it to see what happened and book again if you still want to sail."],
  [/^reservation\./, "Open it to see the booking."],
  [/^payment\./, "Open it to pay or see the payment."],
  [/^cancellation\./, "Open it to see the cancellation and any refund."],
  [/^tour\./, "Open it to see the tour order."],
  [/^request\.new/, "Open it to see the request and send an offer."],
  [/^contact\.new/, "Open the Messages inbox to read and answer it."],
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function noticeEmail(
  n: Notice,
  site: string,
  audience: "person" | "company" | "admin",
): { subject: string; text: string; html: string } {
  const next = NEXT.find(([re]) => re.test(n.kind))?.[1] ?? "Open it in your Nilecruz dashboard.";
  const url = n.link ? `${site}${n.link}` : `${site}/dashboard/`;
  const foot =
    audience === "person"
      ? `You get this email because of your Nilecruz account. Change which emails you get: ${site}/account/security/#sec-emails`
      : audience === "company"
        ? "You get this email as a member of your company's Nilecruz team."
        : "Sent to the Nilecruz team.";
  const text = [n.title, "", next, url, "", "Nilecruz, booking agent for the Nile cruises on our site.", foot].join("\n");
  const html = [
    `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#0b1b3a">`,
    `<p style="margin:0 0 12px;font-size:17px"><strong>${esc(n.title)}</strong></p>`,
    `<p style="margin:0 0 16px">${esc(next)}</p>`,
    `<p style="margin:0 0 20px"><a href="${esc(url)}" style="display:inline-block;padding:12px 18px;background:#0b1b3a;color:#fff;border-radius:4px;text-decoration:none;font-weight:600">Open in Nilecruz</a></p>`,
    `<p style="margin:0;color:#555;font-size:13px">Nilecruz, booking agent for the Nile cruises on our site.<br>${esc(foot)}</p>`,
    `</div>`,
  ].join("\n");
  return { subject: n.title, text, html };
}

/** Who in a company gets its notices: reservations staff for bookings and requests, finance for money, owners always. */
export function rolesFor(kind: string): string[] {
  if (/^(payment|cancellation)\./.test(kind)) return ["owner", "reservations", "finance"];
  return ["owner", "reservations"];
}
