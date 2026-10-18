import Link from "next/link";
import { Section, ui } from "@/components/dashboard/ui";
import { canAccept } from "@/lib/bookings/bookings";
import { nowMs } from "@/lib/product/departures";
import { requireUser } from "@/server/auth";
import { myRequests, offersForRequest } from "@/server/bookings/queries";
import { OfferSummary } from "../../_bookings/OfferSummary";

/** DASH-CUS-005: every open offer across your requests, side by side. */
export default async function MyOffers() {
  await requireUser("/dashboard/journey/offers/");
  const requests = (await myRequests()).filter((r) => r.status === "open");
  const now = nowMs();
  const groups = await Promise.all(
    requests.map(async (r) => ({ r, offers: (await offersForRequest(r.id)).filter((o) => canAccept(o, now)) })),
  );
  const any = groups.some((g) => g.offers.length);
  return (
    <>
      <h1 className={ui.pageTitle}>Offers</h1>
      {any ? (
        groups
          .filter((g) => g.offers.length)
          .map(({ r, offers }) => (
            <Section
              key={r.id}
              title={`${r.origin && r.destination ? `${r.origin} → ${r.destination}` : "Flexible route"}, ${r.earliest_departure} to ${r.latest_departure}`}
              id={`request-${r.id}`}
            >
              <div className={ui.cards}>
                {offers.map((o) => (
                  <div key={o.id}>
                    <OfferSummary o={o} now={now} />
                    <p>
                      <Link href={`/dashboard/journey/requests/${r.id}/accept/${o.id}/`}>
                        Read the terms and accept this offer
                      </Link>
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          ))
      ) : (
        <p className={ui.muted}>
          No open offers. <Link href="/dashboard/journey/requests/">Ask for offers</Link> and operators whose cruises fit can
          reply.
        </p>
      )}
    </>
  );
}
