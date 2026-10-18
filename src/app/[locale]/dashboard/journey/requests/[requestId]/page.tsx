import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/dashboard/ActionForm";
import { Section, ui } from "@/components/dashboard/ui";
import { canAccept } from "@/lib/bookings/bookings";
import { nowMs } from "@/lib/product/departures";
import { requireUser } from "@/server/auth";
import { offersForRequest, request } from "@/server/bookings/queries";
import { guestsText, OfferSummary } from "../../../_bookings/OfferSummary";
import { isUuid } from "../../../sections";
import { closeRequest } from "../../actions";

/** DASH-CUS-004–007: one request and its offers side by side. Only the latest version of each offer is shown. */
export default async function MyRequest({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  if (!isUuid(requestId)) notFound();
  const session = await requireUser(`/dashboard/journey/requests/${requestId}/`);
  const r = await request(requestId);
  if (!r || r.customer_id !== session.userId) notFound();
  const offers = await offersForRequest(requestId);
  const latest = [...new Map(offers.map((o) => [o.thread_id, o])).values()].reverse();
  const replaced = offers.filter((o) => o.status === "superseded").length;
  const now = nowMs();

  return (
    <>
      <p>
        <Link href="/dashboard/journey/requests/">← Cruise requests</Link>
      </p>
      <h1 className={ui.pageTitle}>{r.origin && r.destination ? `${r.origin} → ${r.destination}` : "Flexible route"}</h1>
      <p>
        Departing {r.earliest_departure} to {r.latest_departure}
        {r.latest_finish ? `, back by ${r.latest_finish}` : ""} · {r.nights_min}–{r.nights_max} nights ·{" "}
        {guestsText(r.adults, r.child_ages)} · {r.cabins} cabin{r.cabins === 1 ? "" : "s"}
      </p>
      {r.status === "open" ? (
        <ActionForm action={closeRequest.bind(null, r.id)} submit="Close this request" variant="ghost" />
      ) : null}

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
                    <Link href={`/dashboard/journey/requests/${r.id}/accept/${o.id}/`}>Read the terms and accept this offer</Link>
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className={ui.muted}>
            No offers yet. Operators whose cruises fit your dates and route can reply; you’ll see a notice here.
          </p>
        )}
      </Section>
    </>
  );
}
