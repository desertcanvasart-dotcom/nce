/**
 * The words sent to every page's client components. Left out, so no page downloads them (or carries them in its HTML):
 * the vessel page's and the guide hub's, which pass on their own, and namespaces only server components read.
 */
const NOT_SENT = new Set([
  "vesselPage",
  "guideHub",
  "operatorReply",
  "editorial",
  "silo",
  "cruisesHub",
  "compare",
  "blog",
  "contact",
  "priceExample",
  "tours",
]);

export function clientMessages<T extends Record<string, unknown>>(all: T, also: "vesselPage" | "guideHub" | null = null) {
  const sent: Record<string, unknown> = Object.fromEntries(
    Object.entries(all).filter(([ns]) => !NOT_SENT.has(ns) || ns === also),
  );
  // Of "common", client components use only the honeypot's label; the rest ("Draft for review"…) stays on the server.
  const common = all.common as { leaveEmpty: string } | undefined;
  if (common) sent.common = { leaveEmpty: common.leaveEmpty };
  return sent;
}
