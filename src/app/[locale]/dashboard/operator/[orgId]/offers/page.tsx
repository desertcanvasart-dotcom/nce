import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ds/Badge/Badge";
import { formatMoney } from "@/components/ds/lib/format";
import { Section, ui } from "@/components/dashboard/ui";
import { offerView } from "@/lib/bookings/bookings";
import { nowMs } from "@/lib/product/departures";
import { requireOrgRole } from "@/server/auth";
import { orgOffers, visibleRequests } from "@/server/bookings/queries";
import { guestsText, OFFER_BADGE } from "../../../_bookings/OfferSummary";
import { isUuid } from "../../../sections";

/** DASH-OPR-002, 003, 011: requests that fit this company's sailings, and its offers. No customer names (ADR-088). */
export default async function RequestsAndOffers({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  if (!isUuid(orgId)) notFound();
  await requireOrgRole(orgId, ["owner", "reservations", "viewer"], {
    kind: "operator",
    returnTo: `/dashboard/operator/${orgId}/offers/`,
  });
  const [requests, offers] = await Promise.all([visibleRequests(), orgOffers(orgId)]);
  const now = nowMs();
  const open = requests.filter((r) => r.status === "open");

  return (
    <>
      <h1 className={ui.pageTitle}>Requests and offers</h1>
      <Section title={`Open requests (${open.length})`} id="requests">
        <p className={ui.muted}>
          Requests whose route, dates and nights fit one of your published sailings. You see the trip and the guests’ ages; the
          customer’s name is shared only if they accept your offer.
        </p>
        {open.length ? (
          <div className={ui.tableWrap}>
            <table className={`${ui.table} ${ui.stack}`}>
              <caption className="visually-hidden">Open requests</caption>
              <thead>
                <tr>
                  <th scope="col">Route</th>
                  <th scope="col">Departing</th>
                  <th scope="col">Nights</th>
                  <th scope="col">Guests</th>
                  <th scope="col">Your offers</th>
                </tr>
              </thead>
              <tbody>
                {open.map((r) => {
                  const mine = r.offers.filter((o) => o.org_id === orgId && o.status === "sent").length;
                  return (
                    <tr key={r.id}>
                      <th scope="row" data-label="Route">
                        <Link href={`/dashboard/operator/${orgId}/offers/${r.id}/`}>
                          {r.origin && r.destination ? `${r.origin} → ${r.destination}` : "Flexible route"}
                        </Link>
                      </th>
                      <td data-label="Departing">
                        {r.earliest_departure} to {r.latest_departure}
                      </td>
                      <td data-label="Nights">
                        {r.nights_min}–{r.nights_max}
                      </td>
                      <td data-label="Guests">
                        {guestsText(r.adults, r.child_ages)}, {r.cabins} cabin{r.cabins === 1 ? "" : "s"}
                      </td>
                      <td data-label="Your offers">{mine ? `${mine} open` : <Badge tone="accent">New</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={ui.muted}>No open requests fit your sailings right now.</p>
        )}
      </Section>

      <Section title="Your offers" id="offers">
        {offers.length ? (
          <ul className={ui.list}>
            {offers.map((o) => {
              const v = offerView(o, now);
              return (
                <li key={o.id}>
                  <Link href={`/dashboard/operator/${orgId}/offers/${o.request_id}/`}>
                    {o.departure?.vessel?.name} · departs {o.departure?.departs_on} · version {o.version}
                  </Link>{" "}
                  <Badge tone={OFFER_BADGE[v].tone}>{OFFER_BADGE[v].text}</Badge>{" "}
                  {formatMoney({ amount: Number(o.total_minor), currency: o.currency }, "en")}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={ui.muted}>No offers sent yet.</p>
        )}
      </Section>
    </>
  );
}
