import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Notice, Section, ui } from "@/components/dashboard/ui";
import { canAccept } from "@/lib/bookings/bookings";
import { nowMs } from "@/lib/product/departures";
import { requireOrgRole } from "@/server/auth";
import { offersForRequest, request } from "@/server/bookings/queries";
import { guestsText, nightsText, OfferSummary } from "../../../../_bookings/OfferSummary";
import { isUuid } from "../../../../sections";
import { partnerCloseRequest } from "../../actions";

/** DASH-B2B-004: one company request and its offers side by side. Only the latest version of each offer is shown. */
export default async function CompanyRequest({ params }: { params: Promise<{ orgId: string; requestId: string }> }) {
  const { orgId, requestId } = await params;
  if (!isUuid(orgId) || !isUuid(requestId)) notFound();
  await requireOrgRole(orgId, ["owner", "reservations"], {
    kind: "partner",
    returnTo: `/dashboard/partner/${orgId}/requests/${requestId}/`,
  });
  const r = await request(requestId);
  if (!r || r.buyer_org_id !== orgId) notFound();
  const offers = await offersForRequest(requestId);
  const latest = [...new Map(offers.map((o) => [o.thread_id, o])).values()].reverse();
  const replaced = offers.filter((o) => o.status === "superseded").length;
  const now = nowMs();
  const base = `/dashboard/partner/${orgId}/requests/`;

  return (
    <>
      <p>
        <Link href={base}>← Company requests</Link>
      </p>
      <h1 className={ui.pageTitle}>{r.origin && r.destination ? `${r.origin} → ${r.destination}` : "Flexible route"}</h1>
      <p>
        Departing {r.earliest_departure} to {r.latest_departure}
        {r.latest_finish ? `, back by ${r.latest_finish}` : ""} · {nightsText(r.nights_min, r.nights_max)} ·{" "}
        {guestsText(r.adults, r.child_ages)} · {r.cabins} cabin{r.cabins === 1 ? "" : "s"}
      </p>
      {r.status === "open" ? (
        <ActionForm action={partnerCloseRequest.bind(null, orgId, r.id)} submit="Close this request" variant="ghost" />
      ) : (
        <Notice>
          {r.status === "accepted"
            ? "An offer was accepted. The booking is in Company bookings."
            : "This request is closed. Operators can no longer send offers for it."}
        </Notice>
      )}

      <Section title={latest.length ? `Offers (${latest.length})` : "Offers"} id="offers">
        {replaced ? (
          <p className={ui.muted}>
            {replaced} earlier version{replaced === 1 ? " was" : "s were"} replaced by an operator’s update. Only the latest
            version of an offer can be accepted.
          </p>
        ) : null}
        {latest.length ? (
          <div className={ui.cards}>
            {latest.map((o) => (
              <div key={o.id}>
                <OfferSummary o={o} now={now} />
                {r.status === "open" && canAccept(o, now) ? (
                  <p>
                    <Link href={`${base}${r.id}/accept/${o.id}/`}>Read the terms and accept for your client</Link>
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className={ui.muted}>
            No offers yet. Operators whose cruises fit the dates and route can reply; your company gets a notice.
          </p>
        )}
      </Section>
    </>
  );
}
