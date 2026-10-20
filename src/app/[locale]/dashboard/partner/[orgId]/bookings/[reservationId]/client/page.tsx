import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMoney } from "@/components/ds/lib/format";
import { ui } from "@/components/dashboard/ui";
import { bandLines, type CancellationBand } from "@/lib/tours/tours";
import { requireOrgRole } from "@/server/auth";
import { partnerDetails, reservation } from "@/server/bookings/queries";
import { SailingTime } from "../../../../../_bookings/SailingTime";
import { guestsText } from "../../../../../_bookings/OfferSummary";
import { isUuid } from "../../../../../sections";

/**
 * DASH-B2B-008 (ADR-092): the record an agency gives its client. The agency's name and its selling price, never the trade
 * price or Nilecruz's payment details; "Booked through Nilecruz" only in small print.
 */
export default async function ClientRecord({ params }: { params: Promise<{ orgId: string; reservationId: string }> }) {
  const { orgId, reservationId } = await params;
  if (!isUuid(orgId) || !isUuid(reservationId)) notFound();
  const { company } = await requireOrgRole(orgId, ["owner", "reservations", "finance"], {
    kind: "partner",
    allowPaused: true,
    returnTo: `/dashboard/partner/${orgId}/bookings/${reservationId}/client/`,
  });
  const r = await reservation(reservationId);
  if (!r || r.buyer_org_id !== orgId) notFound();
  const details = await partnerDetails(r.id);
  const s = r.departure?.schedule;
  const policy = r.policy as { bands?: CancellationBand[]; terms?: Record<string, string> };
  return (
    <>
      <p>
        <Link href={`/dashboard/partner/${orgId}/bookings/${r.id}/`}>← Booking</Link>
        <span className={ui.muted}> · Print this page from your browser to give it to your client.</span>
      </p>
      <article className={ui.card} aria-label="Client booking record">
        <p className={ui.label}>{company.orgName}</p>
        <h1 className={ui.pageTitle}>Your Nile cruise</h1>
        <dl className={ui.grid}>
          <div>
            <dt className={ui.label}>Booking</dt>
            <dd>
              {details?.client_reference ? `${details.client_reference} · ` : ""}
              {r.reference}
            </dd>
          </div>
          <div>
            <dt className={ui.label}>Ship</dt>
            <dd>{r.vessel?.name}</dd>
          </div>
          <div>
            <dt className={ui.label}>Route</dt>
            <dd>{s ? `${s.origin} → ${s.destination}, ${s.nights} nights` : "—"}</dd>
          </div>
          <div>
            <dt className={ui.label}>Dates</dt>
            <dd>
              {r.departure?.departs_on} to {r.departure?.returns_on}
            </dd>
          </div>
          {details?.selling_total_minor ? (
            <div>
              <dt className={ui.label}>Price</dt>
              <dd>
                <strong>{formatMoney({ amount: Number(details.selling_total_minor), currency: r.currency }, "en")}</strong>
              </dd>
            </div>
          ) : null}
        </dl>
        <SailingTime schedule={s} />
        <h2 className={ui.subTitle}>Cabins</h2>
        <ul className={ui.list}>
          {[...r.reservation_cabins]
            .sort((a, b) => a.line - b.line)
            .map((c) => (
              <li key={c.line}>
                {c.cabin_name}, {c.deck} deck · {guestsText(c.adults, c.child_ages)}
              </li>
            ))}
        </ul>
        <h2 className={ui.subTitle}>Guests</h2>
        <ul className={ui.list}>
          {r.passengers.map((p) => (
            <li key={p.position}>{p.full_name}</li>
          ))}
        </ul>
        {r.gratuity_usd_minor ? (
          <p className={ui.muted}>
            Crew gratuity: {formatMoney({ amount: r.gratuity_usd_minor, currency: "USD" }, "en")} per person (aged 3 and over) per
            night, paid on board.
          </p>
        ) : null}
        <h2 className={ui.subTitle}>Cancellation</h2>
        {policy.terms?.en ? <p className={ui.prewrap}>{policy.terms.en}</p> : null}
        <ul className={ui.list}>
          {bandLines(policy.bands ?? [], "departure").map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className={ui.muted}>Booked through Nilecruz · reservation {r.reference}</p>
      </article>
    </>
  );
}
